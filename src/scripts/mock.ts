import { Address, Asset, StrKey, hash, xdr } from 'soroban-client';
import { TokenClient } from '../external/token.js';
import { OracleClient } from '../external/oracle.js';
import { airdropAccount } from '../utils/contract.js';
import { randomBytes } from 'node:crypto';
import {
  BackstopClient,
  EmitterClient,
  Network,
  PoolClient,
  PoolFactoryClient,
  Request,
  ReserveConfig,
  ReserveEmissionMetadata,
  TxOptions,
} from '@blend-capital/blend-sdk';
import { config } from '../utils/env_config.js';
import { AddressBook } from '../utils/address_book.js';
import { CometClient } from '../external/comet.js';
import { logInvocation, signWithKeypair } from '../utils/tx.js';

async function mock(addressBook: AddressBook) {
  const whale = config.getUser('WHALE');
  console.log('WHALE: ', whale.publicKey());
  const signWithWhale = (txXdr: string) => signWithKeypair(txXdr, rpc_network.passphrase, whale);
  const signWithAdmin = (txXdr: string) =>
    signWithKeypair(txXdr, rpc_network.passphrase, config.admin);

  await airdropAccount(whale);

  // Initialize Contracts
  const blnd_token = new TokenClient(addressBook.getContractId('BLND'));
  const blnd_asset = new Asset('BLND', config.admin.publicKey());
  const poolFactory = new PoolFactoryClient(addressBook.getContractId('poolFactory'));
  const backstop = new BackstopClient(addressBook.getContractId('backstop'));
  const emitter = new EmitterClient(addressBook.getContractId('emitter'));
  const oracle = new OracleClient(addressBook.getContractId('oracle'));
  const usdc_token = new TokenClient(addressBook.getContractId('USDC'));
  const usdc_asset = new Asset('USDC', config.admin.publicKey());
  const weth_token = new TokenClient(addressBook.getContractId('wETH'));
  const weth_asset = new Asset('wETH', config.admin.publicKey());
  const wbtc_token = new TokenClient(addressBook.getContractId('wBTC'));
  const wbtc_asset = new Asset('wBTC', config.admin.publicKey());
  const comet = new CometClient(addressBook.getContractId('comet'));

  console.log('Create BLND-USDC Pool and mint ');
  await blnd_token.classic_trustline(whale, blnd_asset, whale);
  await blnd_token.classic_mint(whale, blnd_asset, '10000000', config.admin);
  await usdc_token.classic_trustline(whale, usdc_asset, whale);
  await usdc_token.classic_mint(whale, usdc_asset, '100000', config.admin);

  // setup BLND-USDC Pool
  await comet.bind(addressBook.getContractId('BLND'), BigInt(1_000e7), BigInt(8e7), config.admin);
  await comet.bind(addressBook.getContractId('USDC'), BigInt(25e7), BigInt(2e7), config.admin);
  await comet.setSwapFee(BigInt(0.003e7), config.admin);
  await comet.finalize(config.admin);
  await comet.setPublicSwap(true, config.admin);

  // mint 200k tokens to whale
  await comet.joinPool(
    BigInt(200_000e7),
    [BigInt(2_001_000e7), BigInt(50_001e7)],
    whale.publicKey(),
    whale
  );
  await logInvocation(
    backstop.updateTokenValue(config.admin.publicKey(), signWithAdmin, rpc_network, tx_options)
  );

  console.log('Transfer blnd admin to emitter');
  await blnd_token.set_admin(addressBook.getContractId('emitter'), config.admin);

  //********** Stellar Pool (XLM, USDC) **********//

  console.log('Deploy Stellar Pool');
  const stellarPoolSalt = randomBytes(32);

  await logInvocation(
    poolFactory.deploy(config.admin.publicKey(), signWithAdmin, rpc_network, tx_options, {
      admin: config.admin.publicKey(),
      name: 'Stellar',
      salt: stellarPoolSalt,
      oracle: addressBook.getContractId('oracle'),
      backstop_take_rate: BigInt(10000000),
    })
  );

  const networkId = hash(Buffer.from(config.passphrase));
  const preimage = xdr.HashIdPreimage.envelopeTypeContractId(
    new xdr.HashIdPreimageContractId({
      networkId: networkId,
      contractIdPreimage: xdr.ContractIdPreimage.contractIdPreimageFromAddress(
        new xdr.ContractIdPreimageFromAddress({
          address: xdr.ScAddress.scAddressTypeContract(StrKey.decodeContract(poolFactory.address)),
          salt: stellarPoolSalt,
        })
      ),
    })
  );
  const contractId = StrKey.encodeContract(hash(preimage.toXDR()));
  addressBook.setContractId('Stellar', contractId);
  addressBook.writeToFile();

  console.log('Setup Stellar pool reserves and emissions');
  const stellarPool = new PoolClient(addressBook.getContractId('Stellar'));
  const stellarPoolXlmReserveMetaData: ReserveConfig = {
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
  };
  await logInvocation(
    stellarPool.initReserve(config.admin.publicKey(), signWithAdmin, rpc_network, tx_options, {
      asset: addressBook.getContractId('XLM'),
      config: stellarPoolXlmReserveMetaData,
    })
  );
  const stellarPoolUsdcReserveMetaData: ReserveConfig = {
    index: 1,
    decimals: 7,
    c_factor: 950_0000,
    l_factor: 900_0000,
    util: 800_0000,
    max_util: 950_0000,
    r_one: 50_0000,
    r_three: 1_500_0000,
    r_two: 500_0000,
    reactivity: 1000,
  };
  await logInvocation(
    stellarPool.initReserve(config.admin.publicKey(), signWithAdmin, rpc_network, tx_options, {
      asset: addressBook.getContractId('USDC'),
      config: stellarPoolUsdcReserveMetaData,
    })
  );

  const stellarPoolEmissionMetadata: ReserveEmissionMetadata[] = [
    {
      res_index: 0, // XLM
      res_type: 0, // d_token
      share: BigInt(0.7e7), // 50%
    },
    {
      res_index: 1, // USDC
      res_type: 1, // b_token
      share: BigInt(0.3e7), // 50%
    },
  ];
  await logInvocation(
    stellarPool.setEmissionsConfig(
      config.admin.publicKey(),
      signWithAdmin,
      rpc_network,
      tx_options,
      stellarPoolEmissionMetadata
    )
  );

  //********** Bridge Pool (XLM, USDC) **********//

  console.log('Deploy Bridge Pool');
  const bridgePoolSalt = randomBytes(32);

  await logInvocation(
    poolFactory.deploy(config.admin.publicKey(), signWithAdmin, rpc_network, tx_options, {
      admin: config.admin.publicKey(),
      name: 'Bridge',
      salt: bridgePoolSalt,
      oracle: addressBook.getContractId('oracle'),
      backstop_take_rate: BigInt(10000000),
    })
  );

  const bridgePreimage = xdr.HashIdPreimage.envelopeTypeContractId(
    new xdr.HashIdPreimageContractId({
      networkId: networkId,
      contractIdPreimage: xdr.ContractIdPreimage.contractIdPreimageFromAddress(
        new xdr.ContractIdPreimageFromAddress({
          address: xdr.ScAddress.scAddressTypeContract(StrKey.decodeContract(poolFactory.address)),
          salt: bridgePoolSalt,
        })
      ),
    })
  );
  addressBook.setContractId('Bridge', StrKey.encodeContract(hash(bridgePreimage.toXDR())));
  addressBook.writeToFile();

  console.log('Setup Bridge pool reserves and emissions');
  const bridgePool = new PoolClient(addressBook.getContractId('Bridge'));
  const bridgePoolXlmReserveMetaData: ReserveConfig = {
    index: 0,
    decimals: 7,
    c_factor: 900_0000,
    l_factor: 900_0000,
    util: 500_0000,
    max_util: 950_0000,
    r_one: 30_0000,
    r_two: 200_0000,
    r_three: 1_000_0000,
    reactivity: 500,
  };
  await logInvocation(
    bridgePool.initReserve(config.admin.publicKey(), signWithAdmin, rpc_network, tx_options, {
      asset: addressBook.getContractId('XLM'),
      config: bridgePoolXlmReserveMetaData,
    })
  );
  const wethReserveMetaData: ReserveConfig = {
    index: 1,
    decimals: 7,
    c_factor: 850_0000,
    l_factor: 800_0000,
    util: 650_0000,
    max_util: 950_0000,
    r_one: 50_0000,
    r_three: 1_500_0000,
    r_two: 500_0000,
    reactivity: 1000,
  };
  await logInvocation(
    bridgePool.initReserve(config.admin.publicKey(), signWithAdmin, rpc_network, tx_options, {
      asset: addressBook.getContractId('wETH'),
      config: wethReserveMetaData,
    })
  );

  const wbtcReserveMetaData: ReserveConfig = {
    index: 2,
    decimals: 7,
    c_factor: 900_0000,
    l_factor: 900_0000,
    util: 750_0000,
    max_util: 950_0000,
    r_one: 50_0000,
    r_three: 1_500_0000,
    r_two: 500_0000,
    reactivity: 1000,
  };
  await logInvocation(
    bridgePool.initReserve(config.admin.publicKey(), signWithAdmin, rpc_network, tx_options, {
      asset: addressBook.getContractId('wBTC'),
      config: wbtcReserveMetaData,
    })
  );

  const bridgeEmissionMetadata: ReserveEmissionMetadata[] = [
    {
      res_index: 1, // WETH
      res_type: 0, // d_token
      share: BigInt(0.5e7), // 50%
    },
    {
      res_index: 2, // WBTC
      res_type: 1, // b_token
      share: BigInt(0.5e7), // 50%
    },
  ];
  await logInvocation(
    bridgePool.setEmissionsConfig(
      config.admin.publicKey(),
      signWithAdmin,
      rpc_network,
      tx_options,
      bridgeEmissionMetadata
    )
  );

  console.log('Setup backstop for Stellar pool');
  await logInvocation(
    backstop.deposit(whale.publicKey(), signWithWhale, rpc_network, tx_options, {
      from: whale.publicKey(),
      pool_address: stellarPool.address,
      amount: BigInt(75_000e7),
    })
  );
  await logInvocation(
    stellarPool.setStatus(config.admin.publicKey(), signWithAdmin, rpc_network, tx_options, 0)
  );
  await logInvocation(
    backstop.addReward(config.admin.publicKey(), signWithAdmin, rpc_network, tx_options, {
      to_add: stellarPool.address,
      to_remove: stellarPool.address,
    })
  );

  console.log('Setup backstop for Bridge pool');
  await logInvocation(
    backstop.deposit(whale.publicKey(), signWithWhale, rpc_network, tx_options, {
      from: whale.publicKey(),
      pool_address: bridgePool.address,
      amount: BigInt(50_000e7),
    })
  );
  await logInvocation(
    bridgePool.setStatus(config.admin.publicKey(), signWithAdmin, rpc_network, tx_options, 0)
  );
  await logInvocation(
    backstop.addReward(config.admin.publicKey(), signWithAdmin, rpc_network, tx_options, {
      to_add: bridgePool.address,
      to_remove: bridgePool.address,
    })
  );

  console.log('Distribute to pools');
  await logInvocation(
    emitter.distribute(config.admin.publicKey(), signWithAdmin, rpc_network, tx_options)
  );
  await logInvocation(
    backstop.updateEmissionCycle(config.admin.publicKey(), signWithAdmin, rpc_network, tx_options)
  );
  await logInvocation(
    stellarPool.updateEmissions(config.admin.publicKey(), signWithAdmin, rpc_network, tx_options)
  );
  await logInvocation(
    bridgePool.updateEmissions(config.admin.publicKey(), signWithAdmin, rpc_network, tx_options)
  );

  console.log('Setting Asset Prices');
  await oracle.setData(
    Address.fromString(config.admin.publicKey()),
    {
      tag: 'Other',
      values: ['USD'],
    },
    [
      {
        tag: 'Stellar',
        values: [Address.fromString(addressBook.getContractId('USDC'))],
      },
      {
        tag: 'Stellar',
        values: [Address.fromString(addressBook.getContractId('XLM'))],
      },
      {
        tag: 'Stellar',
        values: [Address.fromString(addressBook.getContractId('wETH'))],
      },
      {
        tag: 'Stellar',
        values: [Address.fromString(addressBook.getContractId('wBTC'))],
      },
    ],
    7,
    300,
    config.admin
  );
  await oracle.setPriceStable(
    [BigInt(1e7), BigInt(0.05e7), BigInt(2000e7), BigInt(36000e7)],
    config.admin
  );

  console.log('Minting tokens to whale');
  await usdc_token.classic_mint(whale, usdc_asset, '200000', config.admin);
  await weth_token.classic_trustline(whale, weth_asset, whale);
  await weth_token.classic_mint(whale, weth_asset, '100', config.admin);
  await wbtc_token.classic_trustline(whale, wbtc_asset, whale);
  await wbtc_token.classic_mint(whale, wbtc_asset, '10', config.admin);

  console.log('Whale Supply tokens and borrowing from Stellar pool');
  const stellarRequests: Request[] = [
    {
      amount: BigInt(20000e7),
      request_type: 2,
      address: addressBook.getContractId('USDC'),
    },
    {
      amount: BigInt(5000e7),
      request_type: 2,
      address: addressBook.getContractId('XLM'),
    },
    {
      amount: BigInt(15000e7),
      request_type: 4,
      address: addressBook.getContractId('USDC'),
    },
    {
      amount: BigInt(2000e7),
      request_type: 4,
      address: addressBook.getContractId('XLM'),
    },
  ];
  await logInvocation(
    stellarPool.submit(whale.publicKey(), signWithWhale, rpc_network, tx_options, {
      from: whale.publicKey(),
      spender: whale.publicKey(),
      to: whale.publicKey(),
      requests: stellarRequests,
    })
  );

  console.log('Whale Supply tokens to Bridge pool');
  const bridgeSupplyRequests: Request[] = [
    {
      amount: BigInt(5000e7),
      request_type: 2,
      address: addressBook.getContractId('XLM'),
    },
    {
      amount: BigInt(5e7),
      request_type: 2,
      address: addressBook.getContractId('wETH'),
    },
    {
      amount: BigInt(0.5e7),
      request_type: 2,
      address: addressBook.getContractId('wBTC'),
    },
  ];
  await logInvocation(
    bridgePool.submit(whale.publicKey(), signWithWhale, rpc_network, tx_options, {
      from: whale.publicKey(),
      spender: whale.publicKey(),
      to: whale.publicKey(),
      requests: bridgeSupplyRequests,
    })
  );

  console.log('Whale Borrow tokens from Bridge pool');
  const bridgeBorrowRequests: Request[] = [
    {
      amount: BigInt(2500e7),
      request_type: 4,
      address: addressBook.getContractId('XLM'),
    },
    {
      amount: BigInt(3e7),
      request_type: 4,
      address: addressBook.getContractId('wETH'),
    },
    {
      amount: BigInt(0.2e7),
      request_type: 4,
      address: addressBook.getContractId('wBTC'),
    },
  ];
  await logInvocation(
    bridgePool.submit(whale.publicKey(), signWithWhale, rpc_network, tx_options, {
      from: whale.publicKey(),
      spender: whale.publicKey(),
      to: whale.publicKey(),
      requests: bridgeBorrowRequests,
    })
  );

  await logInvocation(
    backstop.queueWithdrawal(whale.publicKey(), signWithWhale, rpc_network, tx_options, {
      from: whale.publicKey(),
      pool_address: stellarPool.address,
      amount: BigInt(1000e7),
    })
  );
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
await mock(addressBook);
