import {
  BackstopContract,
  BackstopInitializeArgs,
  EmitterContract,
  EmitterInitializeArgs,
  PoolFactoryContract,
  PoolInitMeta,
} from '@blend-capital/blend-sdk';
import { Address } from '@stellar/stellar-sdk';
import {
  bumpContractCode,
  bumpContractInstance,
  deployContract,
  installContract,
} from '../utils/contract.js';
import { TxParams, invokeSorobanOperation } from '../utils/tx.js';

export async function deployBlend(
  blndTokenAddress: string,
  backstopTokenAddress: string,
  usdcTokenAddress: string,
  dropList: Map<string | Address, bigint>,
  txParams: TxParams
): Promise<[BackstopContract, EmitterContract, PoolFactoryContract]> {
  await installContract('emitter', txParams);
  await installContract('poolFactory', txParams);
  await installContract('backstop', txParams);
  await bumpContractCode('emitter', txParams);
  await bumpContractCode('poolFactory', txParams);
  await bumpContractCode('backstop', txParams);
  const poolHash = await installContract('lendingPool', txParams);
  await bumpContractCode('lendingPool', txParams);

  const emitterAddress = await deployContract('emitter', 'emitter', txParams);
  await bumpContractInstance('emitter', txParams);
  const factoryAddress = await deployContract('poolFactory', 'poolFactory', txParams);
  await bumpContractInstance('poolFactory', txParams);
  const backstopAddress = await deployContract('backstop', 'backstop', txParams);
  await bumpContractInstance('backstop', txParams);

  const emitter = new EmitterContract(emitterAddress);
  const poolFactory = new PoolFactoryContract(factoryAddress);
  const backstop = new BackstopContract(backstopAddress);

  const emitterInitArgs: EmitterInitializeArgs = {
    blnd_token: blndTokenAddress,
    backstop: backstopAddress,
    backstop_token: backstopTokenAddress,
  };
  await invokeSorobanOperation(
    emitter.initialize(emitterInitArgs),
    EmitterContract.parsers.initialize,
    txParams
  );

  const factoryInitArgs: PoolInitMeta = {
    backstop: backstopAddress,
    blnd_id: blndTokenAddress,
    pool_hash: poolHash,
  };
  await invokeSorobanOperation(
    poolFactory.initialize(factoryInitArgs),
    PoolFactoryContract.parsers.initialize,
    txParams
  );

  const backstopInitArgs: BackstopInitializeArgs = {
    backstop_token: backstopTokenAddress,
    emitter: emitterAddress,
    usdc_token: usdcTokenAddress,
    blnd_token: blndTokenAddress,
    pool_factory: factoryAddress,
    drop_list: dropList,
  };
  await invokeSorobanOperation(
    backstop.initialize(backstopInitArgs),
    BackstopContract.parsers.initialize,
    txParams
  );

  console.log('Sucessfully deployed Blend contracts\n');
  return [
    new BackstopContract(backstopAddress),
    new EmitterContract(emitterAddress),
    new PoolFactoryContract(factoryAddress),
  ] as const;
}
