import { Keypair, Server, xdr } from 'soroban-client';
import { Contracts } from '../utils/config';

import {
  createDeployOperation,
  createInstallOperation,
  invokeStellarOperation,
} from '../utils/contract';
import { Emitter } from 'blend-sdk';

export async function installEmitter(stellarRpc: Server, contracts: Contracts, source: Keypair) {
  const operation = createInstallOperation('emitter', contracts);
  await invokeStellarOperation(stellarRpc, operation, source);
}

export async function deployEmitter(stellarRpc: Server, contracts: Contracts, source: Keypair) {
  const operation = createDeployOperation('emitter', 'emitter', contracts, source);
  await invokeStellarOperation(stellarRpc, operation, source);
  return new EmitterContract(contracts.getContractId('emitter'), stellarRpc, contracts);
}

export class EmitterContract {
  emitterOpBuilder: Emitter.EmitterOpBuilder;
  stellarRpc: Server;
  contracts: Contracts;
  constructor(address: string, stellarRpc: Server, contracts: Contracts) {
    this.emitterOpBuilder = new Emitter.EmitterOpBuilder(address);
    this.stellarRpc = stellarRpc;
    this.contracts = contracts;
  }

  public async initialize(source: Keypair) {
    const backstop = this.contracts.getContractId('backstop');
    const blndTokenId = this.contracts.getContractId('BLND');
    const xdr_op = this.emitterOpBuilder.initialize({
      backstop,
      blnd_token_id: blndTokenId,
    });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, operation, source);
  }

  public async distribute(source: Keypair) {
    const xdr_op = this.emitterOpBuilder.distribute();
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, operation, source);
  }

  public async swap_backstop(new_backstop_id: string, source: Keypair) {
    const xdr_op = this.emitterOpBuilder.swap_backstop({ new_backstop_id });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, operation, source);
  }
}
