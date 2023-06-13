import { Contract, Keypair, Server, xdr } from 'soroban-client';
import { createDeployOperation, createInstallOperation, invokeStellarOperation } from './contract';
import { Config } from './config';

export interface AssetPrices {
  price: bigint;
  assetKey: string;
}

export async function installMockOracle(stellarRpc: Server, config: Config, source: Keypair) {
  const operation = createInstallOperation('oracle', config);
  invokeStellarOperation(stellarRpc, config, operation, source);
}

export async function deployMockOracle(stellarRpc: Server, config: Config, source: Keypair) {
  console.log('START: deploy mock oracle');
  const operation = createDeployOperation('oracle', 'oracle', config, source);
  await invokeStellarOperation(stellarRpc, config, operation, source);
  config.writeToFile();
  console.log('DONE: deploy mock oracle\n');
}

export async function setAssetPrices(
  stellarRpc: Server,
  config: Config,
  assetPrices: AssetPrices[],
  source: Keypair
) {
  const contract = new Contract(config.getContractId('oracle'));
  console.log('START: setting asset prices for oracle');
  for (const asset of assetPrices) {
    const operation = contract.call(
      'set_price',
      xdr.ScVal.scvAddress(
        xdr.ScAddress.scAddressTypeContract(
          Buffer.from(config.getContractId(asset.assetKey), 'hex')
        )
      ),
      xdr.ScVal.scvU64(xdr.Uint64.fromString(asset.price.toString()))
    );
    invokeStellarOperation(stellarRpc, config, operation, source);
    console.log('set price for ' + asset.assetKey + ' to ' + asset.price.toString());
  }
  console.log('DONE: asset prices set\n');
}
