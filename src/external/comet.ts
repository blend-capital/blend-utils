import { Address, Contract, Keypair, nativeToScVal, xdr } from 'stellar-sdk';

export class CometContract extends Contract {
  constructor(address: string) {
    super(address);
  }

  public init(admin: string) {
    const invokeArgs = {
      method: 'init',
      args: [
        ((i) => Address.fromString(i).toScVal())(
          'CB3OJTILQJQPLJCTRJZLSWID554Y5ICVI2GEJ6ZUWAWOGBD6CF2I6SQZ'
        ), // this is a random address as the factory is not used
        ((i) => Address.fromString(i).toScVal())(admin),
      ],
    };
    return this.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  public setSwapFee(fee: bigint, source: Keypair) {
    const invokeArgs = {
      method: 'set_swap_fee',
      args: [
        ((i) => nativeToScVal(i, { type: 'i128' }))(fee),
        ((i) => Address.fromString(i).toScVal())(source.publicKey()),
      ],
    };
    return this.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  public setPublicSwap(value: boolean, source: Keypair) {
    const invokeArgs = {
      method: 'set_public_swap',
      args: [
        ((i) => Address.fromString(i).toScVal())(source.publicKey()),
        ((i) => xdr.ScVal.scvBool(i))(value),
      ],
    };
    return this.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  public finalize() {
    const invokeArgs = {
      method: 'finalize',
      args: [],
    };
    return this.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  public bundleBind(token: Array<string>, balance: Array<bigint>, denorm: Array<bigint>) {
    const invokeArgs = {
      method: 'bundle_bind',
      args: [
        ((i) => xdr.ScVal.scvVec(i.map((i) => Address.fromString(i).toScVal())))(token),
        ((i) => xdr.ScVal.scvVec(i.map((i) => nativeToScVal(i, { type: 'i128' }))))(balance),
        ((i) => xdr.ScVal.scvVec(i.map((i) => nativeToScVal(i, { type: 'i128' }))))(denorm),
      ],
    };
    return this.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  public bind(token: string, balance: bigint, denorm: bigint, source: Keypair) {
    const invokeArgs = {
      method: 'bind',
      args: [
        ((i) => Address.fromString(i).toScVal())(token),
        ((i) => nativeToScVal(i, { type: 'i128' }))(balance),
        ((i) => nativeToScVal(i, { type: 'i128' }))(denorm),
        ((i) => Address.fromString(i.publicKey()).toScVal())(source),
      ],
    };
    return this.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  public joinPool(pool_amount_out: bigint, max_amounts_in: Array<bigint>, user: string) {
    const invokeArgs = {
      method: 'join_pool',
      args: [
        ((i) => nativeToScVal(i, { type: 'i128' }))(pool_amount_out),
        ((i) => xdr.ScVal.scvVec(i.map((i) => nativeToScVal(i, { type: 'i128' }))))(max_amounts_in),
        ((i) => Address.fromString(i).toScVal())(user),
      ],
    };
    return this.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  public deposit_single_max_in(
    token_in: string,
    pool_amount_out: bigint,
    max_amount_in: bigint,
    user: string
  ) {
    const invokeArgs = {
      method: 'dep_lp_tokn_amt_out_get_tokn_in',
      args: [
        ((i) => Address.fromString(i).toScVal())(token_in),
        ((i) => nativeToScVal(i, { type: 'i128' }))(pool_amount_out),
        ((i) => nativeToScVal(i, { type: 'i128' }))(max_amount_in),
        ((i) => Address.fromString(i).toScVal())(user),
      ],
    };
    return this.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }

  public deposit_single_max_out(
    token_in: string,
    token_amount_in: bigint,
    min_amount_out: bigint,
    user: string
  ) {
    const invokeArgs = {
      method: 'dep_tokn_amt_in_get_lp_tokns_out',
      args: [
        ((i) => Address.fromString(i).toScVal())(token_in),
        ((i) => nativeToScVal(i, { type: 'i128' }))(token_amount_in),
        ((i) => nativeToScVal(i, { type: 'i128' }))(min_amount_out),
        ((i) => Address.fromString(i).toScVal())(user),
      ],
    };
    return this.call(invokeArgs.method, ...invokeArgs.args).toXDR('base64');
  }
}
