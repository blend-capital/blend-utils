import { Address, Contract, Keypair, nativeToScVal, xdr } from 'stellar-sdk';
import { invokeAndUnwrap } from '../utils/tx.js';

export class CometClient {
  comet: Contract;

  constructor(address: string) {
    this.comet = new Contract(address);
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
    await invokeAndUnwrap(operation, source, () => undefined);
  }

  public async setSwapFee(fee: bigint, source: Keypair) {
    const invokeArgs = {
      method: 'set_swap_fee',
      args: [
        ((i) => nativeToScVal(i, { type: 'i128' }))(fee),
        ((i) => Address.fromString(i).toScVal())(source.publicKey()),
      ],
    };
    const operation = this.comet.call(invokeArgs.method, ...invokeArgs.args);
    await invokeAndUnwrap(operation, source, () => undefined);
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
    await invokeAndUnwrap(operation, source, () => undefined);
  }

  public async finalize(source: Keypair) {
    const invokeArgs = {
      method: 'finalize',
      args: [],
    };
    const operation = this.comet.call(invokeArgs.method, ...invokeArgs.args);
    await invokeAndUnwrap(operation, source, () => undefined);
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
        ((i) => xdr.ScVal.scvVec(i.map((i) => nativeToScVal(i, { type: 'i128' }))))(balance),
        ((i) => xdr.ScVal.scvVec(i.map((i) => nativeToScVal(i, { type: 'i128' }))))(denorm),
      ],
    };
    const operation = this.comet.call(invokeArgs.method, ...invokeArgs.args);
    await invokeAndUnwrap(operation, source, () => undefined);
  }

  public async bind(token: string, balance: bigint, denorm: bigint, source: Keypair) {
    const invokeArgs = {
      method: 'bind',
      args: [
        ((i) => Address.fromString(i).toScVal())(token),
        ((i) => nativeToScVal(i, { type: 'i128' }))(balance),
        ((i) => nativeToScVal(i, { type: 'i128' }))(denorm),
        ((i) => Address.fromString(i.publicKey()).toScVal())(source),
      ],
    };
    const operation = this.comet.call(invokeArgs.method, ...invokeArgs.args);
    await invokeAndUnwrap(operation, source, () => undefined);
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
        ((i) => nativeToScVal(i, { type: 'i128' }))(pool_amount_out),
        ((i) => xdr.ScVal.scvVec(i.map((i) => nativeToScVal(i, { type: 'i128' }))))(max_amounts_in),
        ((i) => Address.fromString(i).toScVal())(user),
      ],
    };
    const operation = this.comet.call(invokeArgs.method, ...invokeArgs.args);
    await invokeAndUnwrap(operation, source, () => undefined);
  }
}
