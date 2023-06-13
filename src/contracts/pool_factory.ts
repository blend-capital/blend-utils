import { Keypair, Server, xdr } from 'soroban-client';
import { Config } from '../utils/config';
import {
  createDeployOperation,
  createInstallOperation,
  invokeStellarOperation,
} from '../utils/contract';
import { PoolFactory } from 'blend-sdk';

export async function deployPoolFactory(stellarRpc: Server, config: Config, source: Keypair) {
  const operation = createDeployOperation('poolFactory', 'poolFactory', config, source);
  await invokeStellarOperation(stellarRpc, config, operation, source);
}
export async function installPoolFactory(stellarRpc: Server, config: Config, source: Keypair) {
  const operation = createInstallOperation('poolFactory', config);
  await invokeStellarOperation(stellarRpc, config, operation, source);
}

export class PoolFactoryContract {
  poolFactoryOpsBuilder: PoolFactory.PoolFactoryOpBuilder;
  stellarRpc: Server;
  config: Config;
  constructor(address: string, stellarRpc: Server, config: Config) {
    this.poolFactoryOpsBuilder = new PoolFactory.PoolFactoryOpBuilder(address);
    this.stellarRpc = stellarRpc;
    this.config = config;
  }

  public async initialize(pool_init_meta: PoolFactory.PoolInitMeta, source: Keypair) {
    const xdr_op = this.poolFactoryOpsBuilder.initialize({ pool_init_meta });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
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
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async is_pool(pool_address: string, source: Keypair) {
    const xdr_op = this.poolFactoryOpsBuilder.is_pool({ pool_address });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }
}
