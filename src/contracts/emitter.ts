import { Keypair, Server, xdr } from 'soroban-client';
import { Config } from '../utils/config';

import {
  createDeployOperation,
  createInstallOperation,
  invokeStellarOperation,
} from '../utils/contract';
import { Emitter } from 'blend-sdk';

export async function installEmitter(stellarRpc: Server, config: Config, source: Keypair) {
  const operation = createInstallOperation('emitter', config);
  await invokeStellarOperation(stellarRpc, config, operation, source);
}

export async function deployEmitter(stellarRpc: Server, config: Config, source: Keypair) {
  const operation = createDeployOperation('emitter', 'emitter', config, source);
  await invokeStellarOperation(stellarRpc, config, operation, source);
}

export class EmitterContract {
  emitterOpBuilder: Emitter.EmitterOpBuilder;
  stellarRpc: Server;
  config: Config;
  constructor(address: string, stellarRpc: Server, config: Config) {
    this.emitterOpBuilder = new Emitter.EmitterOpBuilder(address);
    this.stellarRpc = stellarRpc;
    this.config = config;
  }

  public async initialize(source: Keypair) {
    const backstop = this.config.getContractId('backstop');
    const blnd_token_id = this.config.getContractId('blnd_token');
    const xdr_op = this.emitterOpBuilder.initialize({
      backstop,
      blnd_token_id,
    });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async distribute(source: Keypair) {
    const xdr_op = this.emitterOpBuilder.distribute();
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async get_backstop(source: Keypair) {
    const xdr_op = this.emitterOpBuilder.get_backstop();
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async swap_backstop(new_backstop_id: string, source: Keypair) {
    const xdr_op = this.emitterOpBuilder.swap_backstop({ new_backstop_id });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }
}
