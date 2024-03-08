import {
  PoolContract,
  SetReserveArgs,
  DeployArgs,
  PoolFactoryContract,
} from '@blend-capital/blend-sdk';
import { TxParams, invokeSorobanOperation } from '../utils/tx.js';
import { xdr } from 'stellar-sdk';
import { addressBook } from '../utils/address_book.js';

export async function setupReserve(
  poolAddress: string,
  initReserveArgs: SetReserveArgs,
  txParams: TxParams
) {
  const pool = new PoolContract(poolAddress);

  await invokeSorobanOperation(
    pool.queueSetReserve(initReserveArgs),
    pool.parsers.queueSetReserve,
    txParams
  );

  // @DEV Setting reserve can fail if the queue time not reached
  try {
    await invokeSorobanOperation(
      pool.setReserve(initReserveArgs.asset),
      pool.parsers.setReserve,
      txParams
    );
    console.log(`Successfully set ${initReserveArgs.asset} reserve.\n`);
  } catch (e) {
    console.log('Reserve not set', e);
  }
}
