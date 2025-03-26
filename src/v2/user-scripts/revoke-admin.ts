import { parseError } from '@blend-capital/blend-sdk';
import {
  Address,
  authorizeInvocation,
  Operation,
  rpc,
  Transaction,
  TransactionBuilder,
  xdr,
} from '@stellar/stellar-sdk';
import { addressBook } from '../../utils/address-book.js';
import { airdropAccount } from '../../utils/contract.js';
import { config } from '../../utils/env_config.js';
import { TxParams, invokeClassicOp, sendTransaction, signWithKeypair } from '../../utils/tx.js';

/**
 * Revoke a pool's admin by transferring ownership to a new account and revoking its signing power
 * example: node ./lib/user-scripts/revoke-admin.js testnet PairTrade
 */

if (process.argv.length < 4) {
  throw new Error('Arguments required: `network` `pool_name`, `new_admin`');
}

async function revokeAdmin() {
  const pool_name = process.argv[3];
  const network = process.argv[2];
  const poolAddress = addressBook.getContractId(pool_name);
  const newAdmin = config.getUser(process.argv[4]);

  const txParams: TxParams = {
    account: await config.rpc.getAccount(config.admin.publicKey()),
    txBuilderOptions: {
      fee: '10000',
      timebounds: { minTime: 0, maxTime: 0 },
      networkPassphrase: config.passphrase,
    },
    signerFunction: async (txXDR: string) => {
      return signWithKeypair(txXDR, config.passphrase, config.admin);
    },
  };

  if (network !== 'mainnet') {
    await airdropAccount(newAdmin);
  }

  //switch ownership to new admin
  const args = [
    xdr.ScVal.scvAddress(
      xdr.ScAddress.scAddressTypeAccount(
        xdr.PublicKey.publicKeyTypeEd25519(newAdmin.rawPublicKey())
      )
    ),
  ];
  const auth_1 = await authorizeInvocation(
    newAdmin,
    2000000,
    new xdr.SorobanAuthorizedInvocation({
      function: xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeContractFn(
        new xdr.InvokeContractArgs({
          contractAddress: Address.fromString(poolAddress).toScAddress(),
          functionName: 'set_admin',
          args,
        })
      ),
      subInvocations: [],
    }),
    newAdmin.publicKey(),
    config.passphrase
  );
  const auth_2 = await authorizeInvocation(
    config.admin,
    2000000,
    new xdr.SorobanAuthorizedInvocation({
      function: xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeContractFn(
        new xdr.InvokeContractArgs({
          contractAddress: Address.fromString(poolAddress).toScAddress(),
          functionName: 'set_admin',
          args,
        })
      ),
      subInvocations: [],
    }),
    config.admin.publicKey(),
    config.passphrase
  );

  const txBuilder = new TransactionBuilder(txParams.account, txParams.txBuilderOptions)
    .setTimeout(0)
    .addOperation(
      Operation.invokeContractFunction({
        contract: poolAddress,
        function: 'set_admin',
        args,
        auth: [auth_1, auth_2],
      })
    );
  const transaction = txBuilder.build();
  const builtTx = new Transaction(
    await signWithKeypair(transaction.toXDR(), config.passphrase, config.admin),
    config.passphrase
  );

  const simResponse = await config.rpc.simulateTransaction(builtTx);
  if (rpc.Api.isSimulationError(simResponse)) {
    const error = parseError(simResponse);
    throw error;
  }
  const assembledTx = rpc.assembleTransaction(builtTx, simResponse).build();
  const signedTx = new Transaction(
    await txParams.signerFunction(assembledTx.toXDR()),
    config.passphrase
  );

  await sendTransaction(signedTx, () => undefined);
  // revoke new admin signing power
  const revokeOp = Operation.setOptions({
    masterWeight: 0,
  });
  txParams.account = await config.rpc.getAccount(newAdmin.publicKey());
  txParams.signerFunction = async (txXDR: string) => {
    return signWithKeypair(txXDR, config.passphrase, newAdmin);
  };
  await invokeClassicOp(revokeOp.toXDR('base64'), txParams);
}

await revokeAdmin();
