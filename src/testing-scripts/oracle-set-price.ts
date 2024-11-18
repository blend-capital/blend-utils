import { OracleContract } from '../external/oracle.js';
import { addressBook } from '../utils/address-book.js';
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

await setOraclePrice(adminTxParams);

export async function setOraclePrice(txParams: TxParams): Promise<OracleContract> {
  const oracleAddress = addressBook.getContractId('oraclemock');
  const oracle = new OracleContract(oracleAddress);
  await invokeSorobanOperation(
    oracle.setPriceStable([BigInt(1e7), BigInt(0.1e7), BigInt(3000e7), BigInt(60000e7)]),
    () => undefined,
    txParams
  );
  console.log('Successfully set prices for the oracle contract.\n');
  return new OracleContract(oracleAddress);
}
