import { Keypair, Server, xdr } from 'soroban-client';
import {
  createDeployOperation,
  createInstallOperation,
  invokeStellarOperation,
} from '../utils/contract';
import { Config } from '../utils/config';
import { BlendToken } from 'blend-sdk';

export async function installBlendToken(
  stellarRpc: Server,
  source: Keypair,
  config: Config,
  token_type: string
) {
  const operation = createInstallOperation(token_type, config);
  await invokeStellarOperation(stellarRpc, config, operation, source);
}

export async function deployBlendToken(
  stellarRpc: Server,
  source: Keypair,
  config: Config,
  token_type: string
) {
  const operation = createDeployOperation(token_type, token_type, config, source);
  await invokeStellarOperation(stellarRpc, config, operation, source);
}

export class BlendTokenContract {
  blendTokenOpsBuilder: BlendToken.BlendTokenOpBuilder;
  stellarRpc: Server;
  config: Config;

  constructor(address: string, stellarRpc: Server, config: Config) {
    this.blendTokenOpsBuilder = new BlendToken.BlendTokenOpBuilder(address);
    this.stellarRpc = stellarRpc;
    this.config = config;
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
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async clawback(from: string, amount: bigint, source: Keypair) {
    const xdr_op = this.blendTokenOpsBuilder.clawback({ from, amount });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async mint(to: string, amount: bigint, source: Keypair) {
    const xdr_op = this.blendTokenOpsBuilder.mint({ to, amount });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async new_admin(new_admin: string, source: Keypair) {
    const xdr_op = this.blendTokenOpsBuilder.set_admin({ new_admin });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async set_authorized(id: string, authorize: boolean, source: Keypair) {
    const xdr_op = this.blendTokenOpsBuilder.setauthorized({ id, authorize });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async increase_allowance(from: string, spender: string, amount: bigint, source: Keypair) {
    const xdr_op = this.blendTokenOpsBuilder.increase_allowance({ from, spender, amount });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async decrease_allowance(from: string, spender: string, amount: bigint, source: Keypair) {
    const xdr_op = this.blendTokenOpsBuilder.decrease_allowance({ from, spender, amount });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async transfer(from: string, to: string, amount: bigint, source: Keypair) {
    const xdr_op = this.blendTokenOpsBuilder.transfer({ from, to, amount });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
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
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async burn(from: string, amount: bigint, source: Keypair) {
    const xdr_op = this.blendTokenOpsBuilder.burn({ from, amount });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async burn_from(from: string, _spender: string, amount: bigint, source: Keypair) {
    const xdr_op = this.blendTokenOpsBuilder.burnfrom({ from, _spender, amount });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async balance(id: string, source: Keypair) {
    const xdr_op = this.blendTokenOpsBuilder.balance({ id });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async authorized(id: string, source: Keypair) {
    const xdr_op = this.blendTokenOpsBuilder.authorized({ id });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async allowance(from: string, spender: string, source: Keypair) {
    const xdr_op = this.blendTokenOpsBuilder.allowance({ from, spender });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async decimals(source: Keypair) {
    const xdr_op = this.blendTokenOpsBuilder.decimals();
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async name(source: Keypair) {
    const xdr_op = this.blendTokenOpsBuilder.name();
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async symbol(source: Keypair) {
    const xdr_op = this.blendTokenOpsBuilder.symbol();
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async pool(source: Keypair) {
    const xdr_op = this.blendTokenOpsBuilder.pool();
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async asset(source: Keypair) {
    const xdr_op = this.blendTokenOpsBuilder.asset();
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async initialize_asset(admin: string, asset: string, index: number, source: Keypair) {
    const xdr_op = this.blendTokenOpsBuilder.initialize_asset({ admin, asset, index });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }
}
