import { DeployArgs, PoolContract, PoolFactoryContract } from '@blend-capital/blend-sdk';
import { addressBook } from '../utils/address-book.js';
import { bumpContractInstance } from '../utils/contract.js';
import { TxParams, invokeSorobanOperation } from '../utils/tx.js';

export async function setupPool(
  deployPoolArgs: DeployArgs,
  txParams: TxParams
): Promise<PoolContract> {
  const poolFactory = new PoolFactoryContract(addressBook.getContractId('poolFactory'));
  const poolAddress = await invokeSorobanOperation(
    poolFactory.deploy(deployPoolArgs),
    PoolFactoryContract.parsers.deploy,
    txParams
  );
  if (!poolAddress) {
    throw new Error('Failed to deploy pool');
  }
  addressBook.setContractId(deployPoolArgs.name, poolAddress);
  addressBook.writeToFile();
  await bumpContractInstance(deployPoolArgs.name, txParams);
  console.log(`Successfully deployed ${deployPoolArgs.name} pool.\n`);
  return new PoolContract(poolAddress);
}
