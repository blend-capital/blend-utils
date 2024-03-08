import {
  PoolContract,
  PoolInitializeArgs,
  DeployArgs,
  PoolFactoryContract,
} from '@blend-capital/blend-sdk';
import { TxParams, invokeSorobanOperation } from '../utils/tx.js';
import { xdr } from 'stellar-sdk';
import { addressBook } from '../utils/address_book.js';
import { bumpContractInstance } from '../utils/contract.js';

export async function setupPool(
  deployPoolArgs: DeployArgs,
  txParams: TxParams
): Promise<PoolContract> {
  let poolFactory = new PoolFactoryContract(addressBook.getContractId('poolFactory'));
  let poolAddress = await invokeSorobanOperation(
    poolFactory.deploy(deployPoolArgs),
    poolFactory.parsers.deploy,
    txParams
  );
  addressBook.setContractId(deployPoolArgs.name, poolAddress);
  await bumpContractInstance(deployPoolArgs.name, txParams);
  addressBook.setContractId(deployPoolArgs.name, poolAddress);
  addressBook.writeToFile();

  console.log(`Successfully deployed ${deployPoolArgs.name} pool.\n`);
  return new PoolContract(poolAddress);
}
