import { Keypair, xdr } from 'soroban-client';
import { AddressBook } from '../utils/address_book';

import {
  createDeployOperation,
  createInstallOperation,
  invokeStellarOperation,
} from '../utils/contract';
import { Emitter } from 'blend-sdk';

export async function installEmitter(contracts: AddressBook, source: Keypair) {
  const operation = createInstallOperation('emitter', contracts);
  await invokeStellarOperation(operation, source);
}

export async function deployEmitter(contracts: AddressBook, source: Keypair) {
  const operation = createDeployOperation('emitter', 'emitter', contracts, source);
  await invokeStellarOperation(operation, source);
  return new EmitterContract(contracts.getContractId('emitter'), contracts);
}

export class EmitterContract {
  emitterOpBuilder: Emitter.EmitterOpBuilder;
  contracts: AddressBook;

  constructor(address: string, contracts: AddressBook) {
    this.emitterOpBuilder = new Emitter.EmitterOpBuilder(address);
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
    await invokeStellarOperation(operation, source);
  }

  public async distribute(source: Keypair) {
    const xdr_op = this.emitterOpBuilder.distribute();
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(operation, source);
  }

  public async swap_backstop(new_backstop_id: string, source: Keypair) {
    const xdr_op = this.emitterOpBuilder.swap_backstop({ new_backstop_id });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(operation, source);
  }
}
