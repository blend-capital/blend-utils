import { Contract, Keypair, Server, xdr } from 'soroban-client';
import {
  createDeployOperation,
  createInstallOperation,
  invokeStellarOperation,
} from '../utils/contract';
import { Contracts } from '../utils/config';

export interface AssetPrices {
  price: bigint;
  assetKey: string;
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

export async function setAssetPrices(
  stellarRpc: Server,
  contracts: Contracts,
  assetPrices: AssetPrices[],
  source: Keypair
) {
  const contract = new Contract(contracts.getContractId('oracle'));
  console.log('START: setting asset prices for oracle');
  for (const asset of assetPrices) {
    const operation = contract.call(
      'set_price',
      xdr.ScVal.scvAddress(
        xdr.ScAddress.scAddressTypeContract(
          Buffer.from(contracts.getContractId(asset.assetKey), 'hex')
        )
      ),
      xdr.ScVal.scvU64(xdr.Uint64.fromString(asset.price.toString()))
    );
    invokeStellarOperation(stellarRpc, operation, source);
    console.log('set price for ' + asset.assetKey + ' to ' + asset.price.toString());
  }
  console.log('DONE: asset prices set\n');
}
