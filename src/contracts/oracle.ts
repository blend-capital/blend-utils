import { Keypair, Server, xdr,  } from 'soroban-client';
import {
  createDeployOperation,
  createInstallOperation,
  invokeStellarOperation,
} from '../utils/contract';
import { Contracts } from '../utils/config';
import { Oracle } from "blend-sdk"
export interface AssetPrices {
  price: bigint;
  assetId: string;
}

export async function installMockOracle(stellarRpc: Server, contracts: Contracts, source: Keypair) {
  const operation = createInstallOperation('oracle', contracts);
  await invokeStellarOperation(stellarRpc, operation, source);
}

export async function deployMockOracle(stellarRpc: Server, contracts: Contracts, source: Keypair) {
  console.log('START: deploy mock oracle');
  const operation = createDeployOperation('oracle', 'oracle', contracts, source);
  await invokeStellarOperation(stellarRpc, operation, source);
  contracts.writeToFile();
  console.log('DONE: deploy mock oracle\n');
}

export class OracleContract {
  stellarRpc: Server;
  contracts: Contracts;
  oracleOpBuilder: Oracle.OracleOpBuilder;

  constructor(address: string, stellarRpc: Server, contracts: Contracts) {
    this.stellarRpc = stellarRpc;
    this.contracts = contracts;
    this.oracleOpBuilder = new Oracle.OracleOpBuilder(address);
  }


  public async setAssetPrices(assets: AssetPrices[], source: Keypair) {
    for (const assetPrice of assets)  {
      const xdr_op = this.oracleOpBuilder.set_price({asset: assetPrice.assetId, price: assetPrice.price});
      const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
      await invokeStellarOperation(this.stellarRpc, operation, source);
    }
  }
}
