import {
  BackstopContractV2,
  BackstopConstructorArgs,
  EmitterContract,
  PoolInitMeta,
  PoolFactoryContractV2,
} from '@blend-capital/blend-sdk';
import {
  bumpContractCode,
  bumpContractInstance,
  generateContractId,
  installContract,
} from '../../utils/contract.js';
import { TxParams, invokeSorobanOperation } from '../../utils/tx.js';
import { randomBytes } from 'crypto';
import { addressBook } from '../../utils/address-book.js';

export async function deployBlend(
  blndTokenAddress: string,
  backstopTokenAddress: string,
  usdcTokenAddress: string,
  dropList: Array<readonly [string, bigint]>,
  txParams: TxParams
): Promise<[BackstopContractV2, EmitterContract, PoolFactoryContractV2]> {
  await installContract('emitter', txParams);
  const factoryWasm = await installContract('poolFactoryV2', txParams);
  const backstopWasm = await installContract('backstopV2', txParams);
  await bumpContractCode('emitter', txParams);
  await bumpContractCode('poolFactoryV2', txParams);
  await bumpContractCode('backstopV2', txParams);
  const poolHash = await installContract('lendingPoolV2', txParams);
  await bumpContractCode('lendingPoolV2', txParams);

  await bumpContractInstance('emitter', txParams);

  const factorySalt = randomBytes(32);
  const backstopSalt = randomBytes(32);

  const factoryAddress = generateContractId(txParams.account.accountId(), factorySalt);
  const backstopAddress = generateContractId(txParams.account.accountId(), backstopSalt);
  const emitterAddress = addressBook.getContractId('emitter');

  const factoryInitArgs: PoolInitMeta = {
    backstop: backstopAddress,
    blnd_id: blndTokenAddress,
    pool_hash: poolHash,
  };
  await invokeSorobanOperation(
    PoolFactoryContractV2.deploy(
      txParams.account.accountId(),
      factoryWasm,
      factoryInitArgs,
      factorySalt
    ),
    PoolFactoryContractV2.parsers.constructor,
    txParams
  );
  addressBook.setContractId('poolFactoryV2', factoryAddress);
  await bumpContractInstance('poolFactoryV2', txParams);

  const backstopConstructorArgs: BackstopConstructorArgs = {
    backstop_token: backstopTokenAddress,
    emitter: emitterAddress,
    usdc_token: usdcTokenAddress,
    blnd_token: blndTokenAddress,
    pool_factory: factoryAddress,
    drop_list: dropList,
  };
  await invokeSorobanOperation(
    BackstopContractV2.deploy(
      txParams.account.accountId(),
      backstopWasm,
      backstopConstructorArgs,
      backstopSalt
    ),
    BackstopContractV2.parsers.deploy,
    txParams
  );
  addressBook.setContractId('backstopV2', backstopAddress);
  await bumpContractInstance('backstopV2', txParams);
  console.log('Sucessfully deployed Blend contracts\n');
  return [
    new BackstopContractV2(backstopAddress),
    new EmitterContract(emitterAddress),
    new PoolFactoryContractV2(factoryAddress),
  ] as const;
}

export async function installBlend(txParams: TxParams): Promise<void> {
  await installContract('poolFactoryV2', txParams);
  await installContract('backstopV2', txParams);
  await installContract('lendingPoolV2', txParams);
  console.log('Successfully installed Blend contracts\n');
}
