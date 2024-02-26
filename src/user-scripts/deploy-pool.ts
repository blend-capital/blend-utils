import {
  BackstopClient,
  Network,
  PoolClient,
  PoolFactoryClient,
  ReserveConfig,
  ReserveEmissionMetadata,
  TxOptions,
} from '@blend-capital/blend-sdk';
import { randomBytes } from 'crypto';
import { Operation, StrKey, hash, xdr } from 'stellar-sdk';
import { CometClient } from '../external/comet.js';
import { AddressBook } from '../utils/address_book.js';
import { config } from '../utils/env_config.js';
import { invokeClassicOp, logInvocation, signWithKeypair } from '../utils/tx.js';

/// Deployment Constants
const deposit_asset = 0; // BLND, USDC, Both
const blnd_max = BigInt(200_000e7);
const usdc_max = BigInt(50_000e7);
const mint_amount = BigInt(200_000e7);
const pool_name = 'New-Pool';
const backstop_take_rate = 0.1e7;
const max_positions = 4;
const reserves = ['USDC', 'wETH', 'wBTC'];
const reserve_configs: ReserveConfig[] = [
  {
    index: 0,
    decimals: 7,
    c_factor: 900_0000,
    l_factor: 850_0000,
    util: 500_0000,
    max_util: 950_0000,
    r_one: 30_0000,
    r_two: 200_0000,
    r_three: 1_000_0000,
    reactivity: 500,
  },
  {
    index: 0,
    decimals: 7,
    c_factor: 900_0000,
    l_factor: 850_0000,
    util: 500_0000,
    max_util: 950_0000,
    r_one: 30_0000,
    r_two: 200_0000,
    r_three: 1_000_0000,
    reactivity: 500,
  },
];
const poolEmissionMetadata: ReserveEmissionMetadata[] = [
  {
    res_index: 0, // first reserve
    res_type: 0, // 0 for d_token 1 for b_token
    share: BigInt(0.7e7), // Share of total emissions
  },
  {
    res_index: 1, // second reserve
    res_type: 1, // 0 for d_token 1 for b_token
    share: BigInt(0.3e7), // Share of total emissions
  },
];
const startingStatus = 0; // 0 for active, 2 for admin on ice, 3 for on ice, 4 for admin frozen
const addToRewardZone = true;
const revokeAdmin = false;

async function deploy(addressBook: AddressBook) {
  const signWithAdmin = (txXdr: string) =>
    signWithKeypair(txXdr, rpc_network.passphrase, config.admin);

  // Initialize Contracts
  const poolFactory = new PoolFactoryClient(addressBook.getContractId('poolFactory'));
  const backstop = new BackstopClient(addressBook.getContractId('backstop'));
  const comet = new CometClient(addressBook.getContractId('comet'));

  // mint lp with blnd
  if (mint_amount > 0) {
    if (deposit_asset == 0) {
      comet.deposit_single_max_in(
        addressBook.getContractId('BLND'),
        blnd_max,
        mint_amount,
        config.admin.publicKey(),
        config.admin
      );
      // mint lp with usdc
    } else if (deposit_asset == 1) {
      comet.deposit_single_max_in(
        addressBook.getContractId('USDC'),
        usdc_max,
        mint_amount,
        config.admin.publicKey(),
        config.admin
      );
    } else {
      await comet.joinPool(
        BigInt(200_000e7),
        [blnd_max, usdc_max],
        config.admin.publicKey(),
        config.admin
      );
    }
  }
  // Update token value
  await logInvocation(
    backstop.updateTokenValue(config.admin.publicKey(), signWithAdmin, rpc_network, tx_options)
  );

  //********** Stellar Pool (XLM, USDC) **********//

  console.log('Deploy Pool');
  const poolSalt = randomBytes(32);

  await logInvocation(
    poolFactory.deploy(config.admin.publicKey(), signWithAdmin, rpc_network, tx_options, {
      admin: config.admin.publicKey(),
      name: pool_name,
      salt: poolSalt,
      oracle: addressBook.getContractId('oracle'),
      backstop_take_rate: backstop_take_rate,
      max_positions: max_positions,
    })
  );

  const networkId = hash(Buffer.from(config.passphrase));
  const preimage = xdr.HashIdPreimage.envelopeTypeContractId(
    new xdr.HashIdPreimageContractId({
      networkId: networkId,
      contractIdPreimage: xdr.ContractIdPreimage.contractIdPreimageFromAddress(
        new xdr.ContractIdPreimageFromAddress({
          address: xdr.ScAddress.scAddressTypeContract(StrKey.decodeContract(poolFactory.address)),
          salt: poolSalt,
        })
      ),
    })
  );
  const contractId = StrKey.encodeContract(hash(preimage.toXDR()));
  addressBook.setContractId(pool_name, contractId);
  addressBook.writeToFile();

  console.log('Setup pool reserves and emissions');
  const newPool = new PoolClient(addressBook.getContractId(pool_name));

  for (let i = 0; i < reserves.length; i++) {
    const reserve_name = reserves[i];
    const reserve_config = reserve_configs[i];
    await logInvocation(
      newPool.queueSetReserve(config.admin.publicKey(), signWithAdmin, rpc_network, tx_options, {
        asset: addressBook.getContractId(reserve_name),
        metadata: reserve_config,
      })
    );
    await logInvocation(
      newPool.setReserve(
        config.admin.publicKey(),
        signWithAdmin,
        rpc_network,
        tx_options,
        addressBook.getContractId(reserve_name)
      )
    );
  }

  await logInvocation(
    newPool.setEmissionsConfig(
      config.admin.publicKey(),
      signWithAdmin,
      rpc_network,
      tx_options,
      poolEmissionMetadata
    )
  );
  if (mint_amount > 0) {
    console.log('Setup backstop for Stellar pool');
    await logInvocation(
      backstop.deposit(config.admin.publicKey(), signWithAdmin, rpc_network, tx_options, {
        from: config.admin.publicKey(),
        pool_address: newPool.address,
        amount: mint_amount,
      })
    );
  }

  console.log('Setting Starting Status');
  await logInvocation(
    newPool.setStatus(
      config.admin.publicKey(),
      signWithAdmin,
      rpc_network,
      tx_options,
      startingStatus
    )
  );

  if (addToRewardZone) {
    await logInvocation(
      backstop.addReward(config.admin.publicKey(), signWithAdmin, rpc_network, tx_options, {
        to_add: newPool.address,
        to_remove: newPool.address,
      })
    );
  }

  if (revokeAdmin) {
    //switch ownership to new admin
    await logInvocation(
      newPool.setAdmin(
        config.admin.publicKey(),
        signWithAdmin,
        rpc_network,
        tx_options,
        config.getUser('NEWADMIN').publicKey()
      )
    );
  }
  // revoke new admin signing power
  const revokeOp = Operation.setOptions({
    masterWeight: 0,
    source: config.admin.publicKey(),
  });
  await invokeClassicOp(revokeOp, config.admin);
}

const network = process.argv[2];
const addressBook = AddressBook.loadFromFile(network);
const rpc_network: Network = {
  rpc: config.rpc.serverURL.toString(),
  passphrase: config.passphrase,
  opts: { allowHttp: true },
};
const tx_options: TxOptions = {
  sim: false,
  pollingInterval: 2000,
  timeout: 30000,
  builderOptions: {
    fee: '10000',
    timebounds: {
      minTime: 0,
      maxTime: 0,
    },
    networkPassphrase: config.passphrase,
  },
};
await deploy(addressBook);
