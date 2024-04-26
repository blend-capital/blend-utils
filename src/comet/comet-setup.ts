// import { DeployArgs, PoolContract, PoolFactoryContract } from '@blend-capital/blend-sdk';
// import { addressBook } from '../utils/address-book.js';
// import { bumpContractInstance } from '../utils/contract.js';
// import { TxParams, invokeSorobanOperation } from '../utils/tx.js';
// import { CometContract, CometFactoryContract } from '../external/comet.js';
// import { randomBytes } from 'crypto';

// export async function setup_comet(txParams: TxParams): Promise<PoolContract> {
//   const cometFactory = new CometFactoryContract(addressBook.getContractId('cometFactory'));
//   const cometAddress = await invokeSorobanOperation(
//     cometFactory.newCometPool(randomBytes(32), txParams.account.accountId()),
//     () => undefined,
//     txParams
//   );
//   if (!cometAddress) {
//     throw new Error('Failed to deploy pool');
//   }
//   addressBook.setContractId('comet', cometAddress);
//   addressBook.writeToFile();
//   await bumpContractInstance(deployPoolArgs.name, txParams);

//   const comet = new CometContract(cometAddress);

//   console.log(`Successfully deployed ${deployPoolArgs.name} pool.\n`);
//   return new PoolContract(poolAddress);
// }
