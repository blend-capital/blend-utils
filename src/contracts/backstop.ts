import { Keypair, Server, xdr } from 'soroban-client';
import { Contracts } from '../utils/config';

import {
  createDeployOperation,
  createInstallOperation,
  invokeStellarOperation,
} from '../utils/contract';
import { Backstop } from 'blend-sdk';

export async function installBackstop(stellarRpc: Server, contracts: Contracts, source: Keypair) {
  const operation = createInstallOperation('backstop', contracts);
  await invokeStellarOperation(stellarRpc, operation, source);
}

export async function deployBackstop(stellarRpc: Server, contracts: Contracts, source: Keypair) {
  const operation = createDeployOperation('backstop', 'backstop', contracts, source);
  await invokeStellarOperation(stellarRpc, operation, source);
  return new BackstopContract(contracts.getContractId('backstop'), stellarRpc, contracts);
}

export class BackstopContract {
  backstopOpBuilder: Backstop.BackstopOpBuilder;
  stellarRpc: Server;
  contracts: Contracts;
  constructor(address: string, stellarRpc: Server, contracts: Contracts) {
    this.backstopOpBuilder = new Backstop.BackstopOpBuilder(address);
    this.stellarRpc = stellarRpc;
    this.contracts = contracts;
  }

  public async initialize(source: Keypair) {
    const backstop_token = this.contracts.getContractId('backstop_token');
    const blnd_token = this.contracts.getContractId('blnd_token');
    const pool_factory = this.contracts.getContractId('pool_factory');
    const xdr_op = this.backstopOpBuilder.initialize({
      backstop_token,
      blnd_token,
      pool_factory,
    });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, operation, source);
  }

  public async deposit(from: string, pool_address: string, amount: bigint, source: Keypair) {
    const xdr_op = this.backstopOpBuilder.deposit({ from, pool_address, amount });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, operation, source);
  }

  public async queue_withdrawal(
    from: string,
    pool_address: string,
    amount: bigint,
    source: Keypair
  ) {
    const xdr_op = this.backstopOpBuilder.queue_withdrawal({ from, pool_address, amount });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, operation, source);
  }

  public async dequeue_withdrawal(
    from: string,
    pool_address: string,
    amount: bigint,
    source: Keypair
  ) {
    const xdr_op = this.backstopOpBuilder.dequeue_withdrawal({ from, pool_address, amount });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, operation, source);
  }

  public async withdraw(from: string, pool_address: string, amount: bigint, source: Keypair) {
    const xdr_op = this.backstopOpBuilder.withdraw({ from, pool_address, amount });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, operation, source);
  }

  public async balance(user: string, pool_address: string, source: Keypair) {
    const xdr_op = this.backstopOpBuilder.balance({ pool: pool_address, user });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, operation, source);
  }

  public async withdrawal_queue(user: string, pool_address: string, source: Keypair) {
    const xdr_op = this.backstopOpBuilder.withdrawal_queue({ pool: pool_address, user });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, operation, source);
  }

  public async distribute(source: Keypair) {
    const xdr_op = this.backstopOpBuilder.distribute();
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, operation, source);
  }

  public async add_reward(to_add: string, to_remove: string, source: Keypair) {
    const xdr_op = this.backstopOpBuilder.add_reward({ to_add, to_remove });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, operation, source);
  }

  public async pool_claim(pool_address: string, to: string, amount: bigint, source: Keypair) {
    const xdr_op = this.backstopOpBuilder.pool_claim({ pool_address, to, amount });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, operation, source);
  }

  public async claim(from: string, pool_addresses: string[], to: string, source: Keypair) {
    const xdr_op = this.backstopOpBuilder.claim({ from, pool_addresses, to });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, operation, source);
  }

  public async draw(pool_address: string, to: string, amount: bigint, source: Keypair) {
    const xdr_op = this.backstopOpBuilder.draw({ pool_address, to, amount });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, operation, source);
  }

  public async donate(pool_address: string, from: string, amount: bigint, source: Keypair) {
    const xdr_op = this.backstopOpBuilder.donate({ pool_address, from, amount });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, operation, source);
  }
}