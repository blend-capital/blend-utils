import { Address } from '@stellar/stellar-sdk';
import { OracleContract } from '../external/oracle.js';
import { addressBook } from '../utils/address-book.js';
import {
  bumpContractCode,
  bumpContractInstance,
  deployContract,
  installContract,
} from '../utils/contract.js';
import { config } from '../utils/env_config.js';
import { TxParams, invokeSorobanOperation } from '../utils/tx.js';

export async function setupMockOracle(txParams: TxParams): Promise<OracleContract> {
  await installContract('oraclemock', txParams);
  await bumpContractCode('oraclemock', txParams);
  const oracleAddress = await deployContract('oraclemock', 'oraclemock', txParams);
  await bumpContractInstance('oraclemock', txParams);

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
        {
          tag: 'Stellar',
          values: [Address.fromString(addressBook.getContractId('BLND'))],
        },
      ],
      7,
      300
    ),
    () => undefined,
    txParams
  );
  await invokeSorobanOperation(
    oracle.setPriceStable([
      BigInt(1e7),
      BigInt(0.15e7),
      BigInt(2000e7),
      BigInt(36000e7),
      BigInt(100_0000),
    ]),
    () => undefined,
    txParams
  );
  console.log('Successfully deployed and setup the mock Oracle contract.\n');
  return new OracleContract(oracleAddress);
}
