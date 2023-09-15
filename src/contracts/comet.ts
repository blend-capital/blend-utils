import { Address, Contract, Keypair, xdr } from 'soroban-client';
import { AddressBook } from '../utils/address_book';

import {
  createDeployOperation,
  createInstallOperation,
  invokeStellarOperation,
} from '../utils/contract';
import { scval_converter } from 'blend-sdk';

export async function installComet(contracts: AddressBook, source: Keypair) {
  const operation = createInstallOperation('comet', contracts);
  await invokeStellarOperation(operation, source);
}

export async function deployComet(contracts: AddressBook, source: Keypair) {
  const operation = createDeployOperation('comet', 'comet', contracts, source);
  await invokeStellarOperation(operation, source);
  return new CometContract(contracts.getContractId('comet'), contracts);
}

export class CometContract {
  comet: Contract;
  contracts: AddressBook;

  constructor(address: string, contracts: AddressBook) {
    this.comet = new Contract(address);
    this.contracts = contracts;
  }

  public async init(admin: string, source: Keypair) {
    const invokeArgs = {
      method: 'init',
      args: [
        ((i) => Address.fromString(i).toScVal())(
          'CB3OJTILQJQPLJCTRJZLSWID554Y5ICVI2GEJ6ZUWAWOGBD6CF2I6SQZ'
        ), // this is a random address as the factory is not used
        ((i) => Address.fromString(i).toScVal())(admin),
      ],
    };
    const operation = this.comet.call(invokeArgs.method, ...invokeArgs.args);
    await invokeStellarOperation(operation, source);
  }

  public async setSwapFee(fee: bigint, source: Keypair) {
    const invokeArgs = {
      method: 'set_swap_fee',
      args: [
        ((i) => xdr.ScVal.fromXDR(scval_converter.bigintToI128(i).toXDR()))(fee),
        ((i) => Address.fromString(i).toScVal())(source.publicKey()),
      ],
    };
    const operation = this.comet.call(invokeArgs.method, ...invokeArgs.args);
    await invokeStellarOperation(operation, source);
  }

  public async setPublicSwap(value: boolean, source: Keypair) {
    const invokeArgs = {
      method: 'set_public_swap',
      args: [
        ((i) => Address.fromString(i).toScVal())(source.publicKey()),
        ((i) => xdr.ScVal.scvBool(i))(value),
      ],
    };
    const operation = this.comet.call(invokeArgs.method, ...invokeArgs.args);
    await invokeStellarOperation(operation, source);
  }

  public async finalize(source: Keypair) {
    const invokeArgs = {
      method: 'finalize',
      args: [],
    };
    const operation = this.comet.call(invokeArgs.method, ...invokeArgs.args);
    await invokeStellarOperation(operation, source);
  }

  public async bundleBind(
    token: Array<string>,
    balance: Array<bigint>,
    denorm: Array<bigint>,
    source: Keypair
  ) {
    const invokeArgs = {
      method: 'bundle_bind',
      args: [
        ((i) => xdr.ScVal.scvVec(i.map((i) => Address.fromString(i).toScVal())))(token),
        ((i) =>
          xdr.ScVal.scvVec(
            i.map((i) => xdr.ScVal.fromXDR(scval_converter.bigintToI128(i).toXDR()))
          ))(balance),
        ((i) =>
          xdr.ScVal.scvVec(
            i.map((i) => xdr.ScVal.fromXDR(scval_converter.bigintToI128(i).toXDR()))
          ))(denorm),
      ],
    };
    const operation = this.comet.call(invokeArgs.method, ...invokeArgs.args);
    console.log('operation: ', operation.toXDR().toString('base64'));
    await invokeStellarOperation(operation, source);
  }

  public async joinPool(
    pool_amount_out: bigint,
    max_amounts_in: Array<bigint>,
    user: string,
    source: Keypair
  ) {
    const invokeArgs = {
      method: 'join_pool',
      args: [
        ((i) => xdr.ScVal.fromXDR(scval_converter.bigintToI128(i).toXDR()))(pool_amount_out),
        ((i) =>
          xdr.ScVal.scvVec(
            i.map((i) => xdr.ScVal.fromXDR(scval_converter.bigintToI128(i).toXDR()))
          ))(max_amounts_in),
        ((i) => Address.fromString(i).toScVal())(user),
      ],
    };
    const operation = this.comet.call(invokeArgs.method, ...invokeArgs.args);
    await invokeStellarOperation(operation, source);
  }
}
