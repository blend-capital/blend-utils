import { Address, Contract, nativeToScVal } from 'stellar-sdk';
import { i128, u32, u64 } from '@blend-capital/blend-sdk';

/**
 * PriceData type
 */
export interface PriceData {
  price: i128;
  timestamp: u64;
}

/**
 * Asset type
 */
export type Asset =
  | { tag: 'Stellar'; values: readonly [Address] }
  | { tag: 'Other'; values: readonly [string] };

export class BootstrapContract extends Contract {
  constructor(address: string) {
    super(address);
  }

  public initialize(backstop: Address, backstop_token: Address, pool_factory: Address) {
    const invokeArgs = {
      method: 'initialize',
      args: [
        nativeToScVal(backstop, { type: 'address' }),
        nativeToScVal(backstop_token, { type: 'address' }),
        nativeToScVal(pool_factory, { type: 'address' }),
      ],
    };
    const operation = this.call('initialize', ...invokeArgs.args);
    return operation.toXDR('base64');
  }

  add_bootstrap(
    bootstrapper: Address,
    bootstrap_token_index: u32,
    bootstrap_amount: i128,
    pair_min: i128,
    duration: u32,
    pool_address: Address
  ) {
    const invokeArgs = {
      method: 'add_bootstrap',
      args: [
        nativeToScVal(bootstrapper, { type: 'address' }),
        nativeToScVal(bootstrap_token_index, { type: 'u32' }),
        nativeToScVal(bootstrap_amount, { type: 'i128' }),
        nativeToScVal(pair_min, { type: 'i128' }),
        nativeToScVal(duration, { type: 'u32' }),
        nativeToScVal(pool_address, { type: 'address' }),
      ],
    };
    const operation = this.call('add_bootstrap', ...invokeArgs.args);
    return operation.toXDR('base64');
  }

  join(from: Address, amount: i128, bootstrapper: Address, bootstrap_id: u32) {
    const invokeArgs = {
      method: 'join',
      args: [
        nativeToScVal(from, { type: 'address' }),
        nativeToScVal(amount, { type: 'i128' }),
        nativeToScVal(bootstrapper, { type: 'address' }),
        nativeToScVal(bootstrap_id, { type: 'u32' }),
      ],
    };
    const operation = this.call('join', ...invokeArgs.args);
    return operation.toXDR('base64');
  }

  exit(from: Address, amount: i128, bootstrapper: Address, bootstrap_id: u32) {
    const invokeArgs = {
      method: 'exit',
      args: [
        nativeToScVal(from, { type: 'address' }),
        nativeToScVal(amount, { type: 'i128' }),
        nativeToScVal(bootstrapper, { type: 'address' }),
        nativeToScVal(bootstrap_id, { type: 'u32' }),
      ],
    };
    const operation = this.call('exit', ...invokeArgs.args);
    return operation.toXDR('base64');
  }

  close_bootstrap(from: Address, bootstrapper: Address, bootstrap_id: u32) {
    const invokeArgs = {
      method: 'close_bootstrap',
      args: [
        nativeToScVal(from, { type: 'address' }),
        nativeToScVal(bootstrapper, { type: 'address' }),
        nativeToScVal(bootstrap_id, { type: 'u32' }),
      ],
    };
    const operation = this.call('close_bootstrap', ...invokeArgs.args);
    return operation.toXDR('base64');
  }

  claim(from: Address, bootstrapper: Address, bootstrap_id: u32) {
    const invokeArgs = {
      method: 'claim',
      args: [
        nativeToScVal(from, { type: 'address' }),
        nativeToScVal(bootstrapper, { type: 'address' }),
        nativeToScVal(bootstrap_id, { type: 'u32' }),
      ],
    };
    const operation = this.call('claim', ...invokeArgs.args);
    return operation.toXDR('base64');
  }
}
