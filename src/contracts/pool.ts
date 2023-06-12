import { Keypair, Server, xdr } from 'soroban-client';
import { Config } from '../utils/config';
import {
  createDeployOperation,
  createInstallOperation,
  invokeStellarOperation,
} from '../utils/contract';
import { Pool as PoolContract } from 'blend-sdk';

export async function deployLendingPool(
  stellarRpc: Server,
  source: Keypair,
  config: Config,
  poolName: string
) {
  const operation = createDeployOperation(poolName, 'lendingPool', config, source);
  await invokeStellarOperation(stellarRpc, config, operation, source);
}
export async function installLendingPool(stellarRpc: Server, source: Keypair, config: Config) {
  const operation = createInstallOperation('lendingPool', config);
  await invokeStellarOperation(stellarRpc, config, operation, source);
}

export class Pool {
  poolOpBuilder: PoolContract.PoolOpBuilder;
  stellarRpc: Server;
  config: Config;
  constructor(address: string, stellarRpc: Server, config: Config) {
    this.poolOpBuilder = new PoolContract.PoolOpBuilder(address);
    this.stellarRpc = stellarRpc;
    this.config = config;
  }

  public async initialize(admin: string, name: string, bstop_rate: bigint, source: Keypair) {
    const oracle = this.config.getContractId('oracle');
    const backstop_id = this.config.getContractId('backstop');
    const b_token_hash = Buffer.from(this.config.getWasmHash('bToken'));
    const d_token_hash = Buffer.from(this.config.getWasmHash('dToken'));
    const blnd_id = this.config.getContractId('BLND');
    const usdc_id = this.config.getContractId('USDC');
    const xdr_op = this.poolOpBuilder.initialize({
      admin,
      name,
      oracle,
      bstop_rate,
      backstop_id,
      b_token_hash,
      d_token_hash,
      blnd_id,
      usdc_id,
    });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async init_reserve(
    admin: string,
    asset: string,
    metadata: PoolContract.ReserveMetadata,
    source: Keypair
  ) {
    const xdr_op = this.poolOpBuilder.init_reserve({ admin, asset, metadata });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async update_reserve(
    admin: string,
    asset: string,
    metadata: PoolContract.ReserveMetadata,
    source: Keypair
  ) {
    const xdr_op = this.poolOpBuilder.update_reserve({ admin, asset, metadata });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async reserve_config(asset: string, source: Keypair) {
    const xdr_op = this.poolOpBuilder.reserve_config({ asset });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async get_config(user: string, source: Keypair) {
    const xdr_op = this.poolOpBuilder.config({ user });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async supply(from: string, asset: string, amount: bigint, source: Keypair) {
    const xdr_op = this.poolOpBuilder.supply({ from, asset, amount });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async withdraw(from: string, asset: string, amount: bigint, to: string, source: Keypair) {
    const xdr_op = this.poolOpBuilder.withdraw({ from, asset, amount, to });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async borrow(from: string, asset: string, amount: bigint, to: string, source: Keypair) {
    const xdr_op = this.poolOpBuilder.borrow({ from, asset, amount, to });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async repay(
    from: string,
    asset: string,
    amount: bigint,
    on_behalf_of: string,
    source: Keypair
  ) {
    const xdr_op = this.poolOpBuilder.repay({ from, asset, amount, on_behalf_of });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async get_d_rate(asset: string, source: Keypair) {
    const xdr_op = this.poolOpBuilder.get_d_rate({ asset });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async get_b_rate(asset: string, source: Keypair) {
    const xdr_op = this.poolOpBuilder.get_b_rate({ asset });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async bad_debt(user: string, source: Keypair) {
    const xdr_op = this.poolOpBuilder.bad_debt({ user });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async update_state(source: Keypair) {
    const xdr_op = this.poolOpBuilder.update_state();
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async set_status(admin: string, pool_status: number, source: Keypair) {
    const xdr_op = this.poolOpBuilder.set_status({ admin, pool_status });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async get_status(source: Keypair) {
    const xdr_op = this.poolOpBuilder.get_status();
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async get_name(source: Keypair) {
    const xdr_op = this.poolOpBuilder.get_name();
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async get_emissions_config(source: Keypair) {
    const xdr_op = this.poolOpBuilder.get_emissions_config();
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async update_emissions(source: Keypair) {
    const xdr_op = this.poolOpBuilder.update_emissions();
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async set_emissions_config(
    admin: string,
    res_emission_metadata: PoolContract.ReserveEmissionMetadata[],
    source: Keypair
  ) {
    const xdr_op = this.poolOpBuilder.set_emissions_config({ admin, res_emission_metadata });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async claim(from: string, reserve_token_ids: number[], to: string, source: Keypair) {
    const xdr_op = this.poolOpBuilder.claim({ from, reserve_token_ids, to });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async get_reserve_emissions(asset: string, token_type: number, source: Keypair) {
    const xdr_op = this.poolOpBuilder.get_reserve_emissions({ asset, token_type });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async new_liquidation_auction(
    user: string,
    data: PoolContract.LiquidationMetadata,
    source: Keypair
  ) {
    const xdr_op = this.poolOpBuilder.new_liquidation_auction({ user, data });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async del_liquidation_auction(user: string, source: Keypair) {
    const xdr_op = this.poolOpBuilder.del_liquidation_auction({ user });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async get_auction(auction_type: number, user: string, source: Keypair) {
    const xdr_op = this.poolOpBuilder.get_auction({ auction_type, user });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async new_auction(auction_type: number, source: Keypair) {
    const xdr_op = this.poolOpBuilder.new_auction({ auction_type });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async fill_auction(from: string, auction_type: number, user: string, source: Keypair) {
    const xdr_op = this.poolOpBuilder.fill_auction({ from, auction_type, user });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }
}
