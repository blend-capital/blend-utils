import { Keypair, Server, xdr } from 'soroban-client';
import { Contracts } from '../utils/config';
import {
  createDeployOperation,
  createInstallOperation,
  invokeStellarOperation,
} from '../utils/contract';
import { Pool } from 'blend-sdk';

export async function deployPool(
  stellarRpc: Server,
  contracts: Contracts,
  source: Keypair,
  poolName: string
) {
  const operation = createDeployOperation(poolName, 'lendingPool', contracts, source);
  await invokeStellarOperation(stellarRpc, operation, source);
  return new PoolContract(contracts.getContractId(poolName), stellarRpc, contracts);
}
export async function installPool(stellarRpc: Server, contracts: Contracts, source: Keypair) {
  const operation = createInstallOperation('lendingPool', contracts);
  await invokeStellarOperation(stellarRpc, operation, source);
}

export class PoolContract {
  poolOpBuilder: Pool.PoolOpBuilder;
  stellarRpc: Server;
  contracts: Contracts;
  constructor(address: string, stellarRpc: Server, contracts: Contracts) {
    this.poolOpBuilder = new Pool.PoolOpBuilder(address);
    this.stellarRpc = stellarRpc;
    this.contracts = contracts;
  }

  public async initialize(admin: string, name: string, bstop_rate: bigint, source: Keypair) {
    const oracle = this.contracts.getContractId('oracle');
    const backstop_id = this.contracts.getContractId('backstop');
    const b_token_hash = Buffer.from(this.contracts.getWasmHash('bToken'));
    const d_token_hash = Buffer.from(this.contracts.getWasmHash('dToken'));
    const blnd_id = this.contracts.getContractId('BLND');
    const usdc_id = this.contracts.getContractId('USDC');
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
    await invokeStellarOperation(this.stellarRpc, operation, source);
  }

  public async init_reserve(
    admin: string,
    asset: string,
    metadata: Pool.ReserveMetadata,
    source: Keypair
  ) {
    const xdr_op = this.poolOpBuilder.init_reserve({ admin, asset, metadata });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, operation, source);
  }

  public async update_reserve(
    admin: string,
    asset: string,
    metadata: Pool.ReserveMetadata,
    source: Keypair
  ) {
    const xdr_op = this.poolOpBuilder.update_reserve({ admin, asset, metadata });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, operation, source);
  }

  public async supply(from: string, asset: string, amount: bigint, source: Keypair) {
    const xdr_op = this.poolOpBuilder.supply({ from, asset, amount });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, operation, source);
  }

  public async withdraw(from: string, asset: string, amount: bigint, to: string, source: Keypair) {
    const xdr_op = this.poolOpBuilder.withdraw({ from, asset, amount, to });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, operation, source);
  }

  public async borrow(from: string, asset: string, amount: bigint, to: string, source: Keypair) {
    const xdr_op = this.poolOpBuilder.borrow({ from, asset, amount, to });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, operation, source);
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
    await invokeStellarOperation(this.stellarRpc, operation, source);
  }

  public async bad_debt(user: string, source: Keypair) {
    const xdr_op = this.poolOpBuilder.bad_debt({ user });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, operation, source);
  }

  public async update_state(source: Keypair) {
    const xdr_op = this.poolOpBuilder.update_state();
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, operation, source);
  }

  public async set_status(admin: string, pool_status: number, source: Keypair) {
    const xdr_op = this.poolOpBuilder.set_status({ admin, pool_status });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, operation, source);
  }

  public async update_emissions(source: Keypair) {
    const xdr_op = this.poolOpBuilder.update_emissions();
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, operation, source);
  }

  public async set_emissions_config(
    admin: string,
    res_emission_metadata: Pool.ReserveEmissionMetadata[],
    source: Keypair
  ) {
    const xdr_op = this.poolOpBuilder.set_emissions_config({ admin, res_emission_metadata });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, operation, source);
  }

  public async claim(from: string, reserve_token_ids: number[], to: string, source: Keypair) {
    const xdr_op = this.poolOpBuilder.claim({ from, reserve_token_ids, to });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, operation, source);
  }

  public async new_liquidation_auction(
    user: string,
    data: Pool.LiquidationMetadata,
    source: Keypair
  ) {
    const xdr_op = this.poolOpBuilder.new_liquidation_auction({ user, data });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, operation, source);
  }

  public async del_liquidation_auction(user: string, source: Keypair) {
    const xdr_op = this.poolOpBuilder.del_liquidation_auction({ user });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, operation, source);
  }

  public async new_auction(auction_type: number, source: Keypair) {
    const xdr_op = this.poolOpBuilder.new_auction({ auction_type });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, operation, source);
  }

  public async fill_auction(from: string, auction_type: number, user: string, source: Keypair) {
    const xdr_op = this.poolOpBuilder.fill_auction({ from, auction_type, user });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, operation, source);
  }
}
