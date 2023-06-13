import { Keypair, Server, xdr } from 'soroban-client';
import { Contracts } from '../utils/config';
import {
  createDeployOperation,
  createInstallOperation,
  invokeStellarOperation,
} from '../utils/contract';
import { PoolFactory } from 'blend-sdk';

export async function deployPoolFactory(stellarRpc: Server, contracts: Contracts, source: Keypair) {
  const operation = createDeployOperation('poolFactory', 'poolFactory', contracts, source);
  await invokeStellarOperation(stellarRpc, operation, source);
  return new PoolFactoryContract(contracts.getContractId('poolFactory'), stellarRpc, contracts);
}
export async function installPoolFactory(
  stellarRpc: Server,
  contracts: Contracts,
  source: Keypair
) {
  const operation = createInstallOperation('poolFactory', contracts);
  await invokeStellarOperation(stellarRpc, operation, source);
}

export class PoolFactoryContract {
  poolFactoryOpsBuilder: PoolFactory.PoolFactoryOpBuilder;
  stellarRpc: Server;
  contracts: Contracts;
  constructor(address: string, stellarRpc: Server, contracts: Contracts) {
    this.poolFactoryOpsBuilder = new PoolFactory.PoolFactoryOpBuilder(address);
    this.stellarRpc = stellarRpc;
    this.contracts = contracts;
  }

  public async initialize(pool_init_meta: PoolFactory.PoolInitMeta, source: Keypair) {
    const xdr_op = this.poolFactoryOpsBuilder.initialize({ pool_init_meta });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, operation, source);
  }

  public async deploy(
    admin: string,
    name: string,
    salt: Buffer,
    oracle: string,
    backstop_take_rate: bigint,
    source: Keypair
  ) {
    const xdr_op = this.poolFactoryOpsBuilder.deploy({
      admin,
      name,
      salt,
      oracle,
      backstop_take_rate,
    });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, operation, source);
  }
}
