import { Asset, Keypair, Server, xdr } from 'soroban-client';
import {
  createDeployOperation,
  createDeployStellarAssetOperation,
  createInstallOperation,
  invokeStellarOperation,
} from '../utils/contract';
import { Contracts } from '../utils/config';
import { BlendToken } from 'blend-sdk';

export async function installBlendToken(
  stellarRpc: Server,
  contracts: Contracts,
  source: Keypair,
  token_type: string
) {
  const operation = createInstallOperation(token_type, contracts);
  await invokeStellarOperation(stellarRpc, operation, source);
}

export async function deployBlendToken(
  stellarRpc: Server,
  contracts: Contracts,
  source: Keypair,
  token_type: string,
  token_name: string
) {
  const operation = createDeployOperation(token_name, token_type, contracts, source);
  await invokeStellarOperation(stellarRpc, operation, source);
  return new BlendTokenContract(contracts.getContractId(token_name), stellarRpc, contracts);
}

export async function deployStellarAsset(
  stellarRpc: Server,
  contracts: Contracts,
  source: Keypair,
  asset: Asset
) {
  const operation = createDeployStellarAssetOperation(asset, contracts);
  await invokeStellarOperation(stellarRpc, operation, source);
}

export class BlendTokenContract {
  blendTokenOpsBuilder: BlendToken.BlendTokenOpBuilder;
  stellarRpc: Server;
  contracts: Contracts;

  constructor(address: string, stellarRpc: Server, contracts: Contracts) {
    this.blendTokenOpsBuilder = new BlendToken.BlendTokenOpBuilder(address);
    this.stellarRpc = stellarRpc;
    this.contracts = contracts;
  }

  public async initialize(
    admin: string,
    decimal: number,
    name: Buffer,
    symbol: Buffer,
    source: Keypair
  ) {
    const xdr_op = this.blendTokenOpsBuilder.initialize({ admin, decimal, name, symbol });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, operation, source);
  }

  public async clawback(from: string, amount: bigint, source: Keypair) {
    const xdr_op = this.blendTokenOpsBuilder.clawback({ from, amount });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, operation, source);
  }

  public async mint(to: string, amount: bigint, source: Keypair) {
    const xdr_op = this.blendTokenOpsBuilder.mint({ to, amount });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, operation, source);
  }

  public async new_admin(new_admin: string, source: Keypair) {
    const xdr_op = this.blendTokenOpsBuilder.set_admin({ new_admin });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, operation, source);
  }

  public async set_authorized(id: string, authorize: boolean, source: Keypair) {
    const xdr_op = this.blendTokenOpsBuilder.setauthorized({ id, authorize });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, operation, source);
  }

  public async increase_allowance(from: string, spender: string, amount: bigint, source: Keypair) {
    const xdr_op = this.blendTokenOpsBuilder.increase_allowance({ from, spender, amount });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, operation, source);
  }

  public async decrease_allowance(from: string, spender: string, amount: bigint, source: Keypair) {
    const xdr_op = this.blendTokenOpsBuilder.decrease_allowance({ from, spender, amount });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, operation, source);
  }

  public async transfer(from: string, to: string, amount: bigint, source: Keypair) {
    const xdr_op = this.blendTokenOpsBuilder.transfer({ from, to, amount });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, operation, source);
  }

  public async transfer_from(
    from: string,
    to: string,
    spender: string,
    amount: bigint,
    source: Keypair
  ) {
    const xdr_op = this.blendTokenOpsBuilder.transferfrom({ from, to, spender, amount });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, operation, source);
  }

  public async burn(from: string, amount: bigint, source: Keypair) {
    const xdr_op = this.blendTokenOpsBuilder.burn({ from, amount });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, operation, source);
  }

  public async burn_from(from: string, _spender: string, amount: bigint, source: Keypair) {
    const xdr_op = this.blendTokenOpsBuilder.burnfrom({ from, _spender, amount });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, operation, source);
  }

  public async authorized(id: string, source: Keypair) {
    const xdr_op = this.blendTokenOpsBuilder.authorized({ id });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, operation, source);
  }

  public async initialize_asset(admin: string, asset: string, index: number, source: Keypair) {
    const xdr_op = this.blendTokenOpsBuilder.initialize_asset({ admin, asset, index });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, operation, source);
  }
}
