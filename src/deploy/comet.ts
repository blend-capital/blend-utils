import {
  bumpContractCode,
  bumpContractInstance,
  deployContract,
  installContract,
} from '../utils/contract.js';
import { TxParams, invokeSorobanOperation } from '../utils/tx.js';
import { CometContract } from '../external/comet.js';

export async function deployComet(txParams: TxParams): Promise<CometContract> {
  await installContract('comet', txParams);
  await bumpContractCode('comet', txParams);
  let cometAddress = await deployContract('comet', 'comet', txParams);
  await bumpContractInstance('comet', txParams);
  let comet = new CometContract(cometAddress);
  await invokeSorobanOperation(comet.init(txParams.account.accountId()), () => undefined, txParams);

  console.log('Successfully deployed Comet contract.\n');
  return new CometContract(cometAddress);
}
