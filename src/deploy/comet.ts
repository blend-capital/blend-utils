import { CometContract } from '../external/comet.js';
import {
  bumpContractCode,
  bumpContractInstance,
  deployContract,
  installContract,
} from '../utils/contract.js';
import { TxParams, invokeSorobanOperation } from '../utils/tx.js';

export async function deployComet(txParams: TxParams): Promise<CometContract> {
  await installContract('comet', txParams);
  await bumpContractCode('comet', txParams);
  const cometAddress = await deployContract('comet', 'comet', txParams);
  await bumpContractInstance('comet', txParams);
  const comet = new CometContract(cometAddress);
  await invokeSorobanOperation(comet.init(txParams.account.accountId()), () => undefined, txParams);

  console.log('Successfully deployed Comet contract.\n');
  return new CometContract(cometAddress);
}
