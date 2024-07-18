import { Address } from '@stellar/stellar-sdk';
import { OracleContract } from '../external/oracle.js';
import { addressBook } from '../utils/address-book.js';
import { bumpContractCode, bumpContractInstance, installContract } from '../utils/contract.js';
import { config } from '../utils/env_config.js';
import { TxParams, invokeSorobanOperation, signWithKeypair } from '../utils/tx.js';

const adminTxParams: TxParams = {
  account: await config.rpc.getAccount(config.admin.publicKey()),
  txBuilderOptions: {
    fee: '10000',
    timebounds: {
      minTime: 0,
      maxTime: 0,
    },
    networkPassphrase: config.passphrase,
  },
  signerFunction: async (txXDR: string) => {
    return signWithKeypair(txXDR, config.passphrase, config.admin);
  },
};
await setupMockOracle(adminTxParams);

export async function setupMockOracle(txParams: TxParams): Promise<OracleContract> {
  await installContract('oraclemock', txParams);
  await bumpContractCode('oraclemock', txParams);
  await bumpContractInstance('oraclemock', txParams);

  const oracleAddress = addressBook.getContractId('oraclemock');
  const oracle = new OracleContract(oracleAddress);
  await invokeSorobanOperation(
    oracle.setData(
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
      300
    ),
    () => undefined,
    txParams
  );
  await invokeSorobanOperation(
    oracle.setPriceStable([BigInt(1e7), BigInt(0.1e7), BigInt(3000e7), BigInt(60000e7)]),
    () => undefined,
    txParams
  );
  console.log('Successfully deployed and setup the mock Oracle contract.\n');
  return new OracleContract(oracleAddress);
}
