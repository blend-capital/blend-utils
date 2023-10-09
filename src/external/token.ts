import { Asset, Contract, Keypair, Operation, nativeToScVal } from 'soroban-client';
import { AddressBook } from '../utils/address_book.js';
import { invokeAndUnwrap, invokeClassicOp } from '../utils/tx.js';
import { deployStellarAsset } from '../utils/contract.js';

export async function tryDeployStellarAsset(contracts: AddressBook, source: Keypair, asset: Asset) {
  try {
    await deployStellarAsset(asset, contracts, source);
  } catch (e) {
    console.error('unable to deploy stellar asset', asset.code, e);
  }
}

export class TokenClient {
  address: string;
  private contract: Contract;

  constructor(address: string) {
    this.address = address;
    this.contract = new Contract(address);
  }

  public async classic_trustline(user: Keypair, asset: Asset, source: Keypair) {
    const operation = Operation.changeTrust({
      source: user.publicKey(),
      asset: asset,
    });
    await invokeClassicOp(operation, source);
  }

  public async classic_mint(user: Keypair, asset: Asset, amount: string, source: Keypair) {
    const operation = Operation.payment({
      amount: amount,
      asset: asset,
      destination: user.publicKey(),
      source: source.publicKey(),
    });
    await invokeClassicOp(operation, source);
  }

  public async initialize(
    admin: string,
    decimal: number,
    name: string,
    symbol: string,
    source: Keypair
  ) {
    const invokeArgs = {
      method: 'initialize',
      args: [
        nativeToScVal(admin, { type: 'address' }),
        nativeToScVal(decimal, { type: 'u32' }),
        nativeToScVal(name, { type: 'string' }),
        nativeToScVal(symbol, { type: 'string' }),
      ],
    };
    const operation = this.contract
      .call(invokeArgs.method, ...invokeArgs.args)
      .toXDR()
      .toString('base64');
    await invokeAndUnwrap(operation, source, () => undefined);
  }

  public async mint(to: string, amount: bigint, source: Keypair) {
    const invokeArgs = {
      method: 'mint',
      args: [nativeToScVal(to, { type: 'address' }), nativeToScVal(amount, { type: 'i128' })],
    };
    const operation = this.contract
      .call(invokeArgs.method, ...invokeArgs.args)
      .toXDR()
      .toString('base64');
    await invokeAndUnwrap(operation, source, () => undefined);
  }

  public async set_admin(new_admin: string, source: Keypair) {
    const invokeArgs = {
      method: 'set_admin',
      args: [nativeToScVal(new_admin, { type: 'address' })],
    };
    const operation = this.contract
      .call(invokeArgs.method, ...invokeArgs.args)
      .toXDR()
      .toString('base64');
    await invokeAndUnwrap(operation, source, () => undefined);
  }

  public async approve(
    from: string,
    spender: string,
    amount: bigint,
    expiration_ledger: number,
    source: Keypair
  ) {
    const invokeArgs = {
      method: 'approve',
      args: [
        nativeToScVal(from, { type: 'address' }),
        nativeToScVal(spender, { type: 'address' }),
        nativeToScVal(amount, { type: 'i128' }),
        nativeToScVal(expiration_ledger, { type: 'u32' }),
      ],
    };
    const operation = this.contract
      .call(invokeArgs.method, ...invokeArgs.args)
      .toXDR()
      .toString('base64');
    await invokeAndUnwrap(operation, source, () => undefined);
  }

  public async transfer(from: string, to: string, amount: bigint, source: Keypair) {
    const invokeArgs = {
      method: 'transfer',
      args: [
        nativeToScVal(from, { type: 'address' }),
        nativeToScVal(to, { type: 'address' }),
        nativeToScVal(amount, { type: 'i128' }),
      ],
    };
    const operation = this.contract
      .call(invokeArgs.method, ...invokeArgs.args)
      .toXDR()
      .toString('base64');
    await invokeAndUnwrap(operation, source, () => undefined);
  }

  public async transfer_from(
    spender: string,
    from: string,
    to: string,
    amount: bigint,
    source: Keypair
  ) {
    const invokeArgs = {
      method: 'transfer_from',
      args: [
        nativeToScVal(spender, { type: 'address' }),
        nativeToScVal(from, { type: 'address' }),
        nativeToScVal(to, { type: 'address' }),
        nativeToScVal(amount, { type: 'i128' }),
      ],
    };
    const operation = this.contract
      .call(invokeArgs.method, ...invokeArgs.args)
      .toXDR()
      .toString('base64');
    await invokeAndUnwrap(operation, source, () => undefined);
  }
}
