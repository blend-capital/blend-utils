import { Keypair, xdr } from 'soroban-client';
import {
  createDeployOperation,
  createInstallOperation,
  invokeStellarOperation,
} from '../utils/contract';
import { AddressBook } from '../utils/address_book';
import { Oracle } from 'blend-sdk';
export interface AssetPrices {
  price: bigint;
  assetId: string;
}

export async function installMockOracle(contracts: AddressBook, source: Keypair) {
  const operation = createInstallOperation('oracle', contracts);
  await invokeStellarOperation(operation, source);
}

export async function deployMockOracle(contracts: AddressBook, source: Keypair) {
  const operation = createDeployOperation('oracle', 'oracle', contracts, source);
  await invokeStellarOperation(operation, source);
  contracts.writeToFile();
}

export class OracleContract {
  contracts: AddressBook;
  oracleOpBuilder: Oracle.OracleOpBuilder;

  constructor(address: string, contracts: AddressBook) {
    this.contracts = contracts;
    this.oracleOpBuilder = new Oracle.OracleOpBuilder(address);
  }

  public async setAssetPrices(assets: AssetPrices[], source: Keypair) {
    for (const assetPrice of assets) {
      const xdr_op = this.oracleOpBuilder.set_price({
        asset: assetPrice.assetId,
        price: assetPrice.price,
      });
      const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
      await invokeStellarOperation(operation, source);
    }
  }
}
