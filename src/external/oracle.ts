import { Contract, Keypair, scValToBigInt, nativeToScVal, xdr } from 'soroban-client';
import { i128, u64 } from 'blend-sdk';
import { invokeAndUnwrap } from '../utils/tx.js';

export interface AssetPrices {
  price: bigint;
  assetId: string;
}

export interface AssetPrices {
  price: bigint;
  assetKey: string;
}

export interface PriceData {
  price: i128;
  timestamp: u64;
}

export function PriceDataFromXDR(xdr_string: string): PriceData {
  const data_entry_map = xdr.LedgerEntryData.fromXDR(xdr_string, 'base64')
    .contractData()
    .val()
    .map();

  if (data_entry_map == undefined) {
    throw Error('contract data value is not a map');
  }
  let price: i128 | undefined;
  let timestamp: u64 | undefined;

  for (const map_entry of data_entry_map) {
    switch (map_entry?.key()?.sym()?.toString()) {
      case 'price': {
        price = scValToBigInt(map_entry.val());
        break;
      }
      case 'timestamp': {
        timestamp = scValToBigInt(map_entry.val());
        break;
      }
      default:
        throw Error(`scvMap value malformed ${map_entry?.key()?.sym()?.toString()}`);
    }
  }

  if (price == undefined || timestamp == undefined) {
    throw Error('xdr_string is malformed');
  }
  return {
    price,
    timestamp,
  };
}

export class OracleClient {
  address: string;
  _contract: Contract;

  constructor(address: string) {
    this.address = address;
    this._contract = new Contract(address);
  }

  public async set_price(asset: string, price: bigint, source: Keypair) {
    const invokeArgs = {
      method: 'set_price',
      args: [nativeToScVal(asset, { type: 'address' }), nativeToScVal(price, { type: 'i128' })],
    };
    const operation = this._contract.call(invokeArgs.method, ...invokeArgs.args);
    await invokeAndUnwrap(operation, source, () => undefined);
  }
}
