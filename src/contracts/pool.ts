import { Keypair, xdr } from 'soroban-client';
import { AddressBook } from '../utils/address_book';
import {
  createDeployOperation,
  createInstallOperation,
  invokeStellarOperation,
} from '../utils/contract';
import { Pool } from 'blend-sdk';

export async function deployPool(contracts: AddressBook, source: Keypair, poolName: string) {
  const operation = createDeployOperation(poolName, 'lendingPool', contracts, source);
  await invokeStellarOperation(operation, source);
  return new PoolContract(contracts.getContractId(poolName), contracts);
}
export async function installPool(contracts: AddressBook, source: Keypair) {
  const operation = createInstallOperation('lendingPool', contracts);
  await invokeStellarOperation(operation, source);
}

export class PoolContract {
  poolOpBuilder: Pool.PoolOpBuilder;
  contracts: AddressBook;

  constructor(address: string, contracts: AddressBook) {
    this.poolOpBuilder = new Pool.PoolOpBuilder(address);
    this.contracts = contracts;
  }

  public async initialize(admin: string, name: string, bstop_rate: bigint, source: Keypair) {
    const oracle = this.contracts.getContractId('oracle');
    const backstop_id = this.contracts.getContractId('backstop');

    const blnd_id = this.contracts.getContractId('BLND');
    const usdc_id = this.contracts.getContractId('USDC');
    const xdr_op = this.poolOpBuilder.initialize({
      admin,
      name,
      oracle,
      bstop_rate,
      backstop_id,
      blnd_id,
      usdc_id,
    });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(operation, source);
  }

  public async init_reserve(asset: string, config: Pool.ReserveConfig, source: Keypair) {
    const xdr_op = this.poolOpBuilder.init_reserve({ asset, config });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(operation, source);
  }

  public async update_reserve(asset: string, config: Pool.ReserveConfig, source: Keypair) {
    const xdr_op = this.poolOpBuilder.update_reserve({ asset, config });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(operation, source);
  }

  public async submit(
    from: string,
    spender: string,
    to: string,
    requests: Pool.Request[],
    source: Keypair
  ) {
    const xdr_op = this.poolOpBuilder.submit({ from, spender, to, requests });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(operation, source);
  }

  public async bad_debt(user: string, source: Keypair) {
    const xdr_op = this.poolOpBuilder.bad_debt({ user });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(operation, source);
  }

  public async update_status(source: Keypair) {
    const xdr_op = this.poolOpBuilder.update_status();
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(operation, source);
  }

  public async set_status(pool_status: number, source: Keypair) {
    const xdr_op = this.poolOpBuilder.set_status({ pool_status });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(operation, source);
  }

  public async update_emissions(source: Keypair) {
    const xdr_op = this.poolOpBuilder.update_emissions();
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(operation, source);
  }

  public async set_emissions_config(
    res_emission_metadata: Pool.ReserveEmissionMetadata[],
    source: Keypair
  ) {
    const xdr_op = this.poolOpBuilder.set_emissions_config({ res_emission_metadata });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(operation, source);
  }

  public async claim(from: string, reserve_token_ids: number[], to: string, source: Keypair) {
    const xdr_op = this.poolOpBuilder.claim({ from, reserve_token_ids, to });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(operation, source);
  }

  public async new_liquidation_auction(
    user: string,
    data: Pool.LiquidationMetadata,
    source: Keypair
  ) {
    const xdr_op = this.poolOpBuilder.new_liquidation_auction({ user, data });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(operation, source);
  }

  public async del_liquidation_auction(user: string, source: Keypair) {
    const xdr_op = this.poolOpBuilder.del_liquidation_auction({ user });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(operation, source);
  }

  public async new_auction(auction_type: number, source: Keypair) {
    const xdr_op = this.poolOpBuilder.new_auction({ auction_type });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(operation, source);
  }

  public async fill_auction(from: string, auction_type: number, user: string, source: Keypair) {
    const xdr_op = this.poolOpBuilder.fill_auction({ from, auction_type, user });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(operation, source);
  }
}
