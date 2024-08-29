import { OracleAggregatorContract } from '../external/oracle_aggregator.js';
import { addressBook } from '../utils/address-book.js';
import { config } from '../utils/env_config.js';
import {
  bumpContractCode,
  bumpContractInstance,
  deployContract,
  installContract,
} from '../utils/contract.js';
import { TxParams, invokeSorobanOperation, signWithKeypair } from '../utils/tx.js';
import { Address } from '@stellar/stellar-sdk';

export async function deployOracleAggregator(): Promise<OracleAggregatorContract> {
  const txParams: TxParams = {
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
  await installContract('oracleAggregator', txParams);
  await bumpContractCode('oracleAggregator', txParams);

  const oracle_aggregator_wasm = Buffer.from(addressBook.getWasmHash('oracleAggregator'), 'hex');
  const oracleAggregatorAddress = await deployContract('oracleAggregator', 'oracleAggregator', txParams);

  const admin = Address.fromString(config.admin.publicKey());
  const usdc = Address.fromString(addressBook.getContractId('USDC'));
  const usdc_oracle = Address.fromString(addressBook.getContractId('usdcOracle'));
  const default_oracle = Address.fromString(addressBook.getContractId('defaultOracle'));

  const oracleAggregator = new OracleAggregatorContract(oracleAggregatorAddress);
  await invokeSorobanOperation(oracleAggregator.initialize(admin, usdc, usdc_oracle, default_oracle), () => undefined, txParams);

  if (!oracleAggregatorAddress) {
    throw new Error('Failed to deploy Oracle Aggregator contract.');
  }
  addressBook.setContractId('oracleAggregator', oracleAggregatorAddress.toString());
  addressBook.writeToFile();
  console.log('Successfully deployed Oracle Aggregator contract.\n');
  return oracleAggregator;
}

await deployOracleAggregator();