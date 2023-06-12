import { Keypair, Server, xdr } from 'soroban-client';
import { Config } from '../utils/config';

import {
  createDeployOperation,
  createInstallOperation,
  invokeStellarOperation,
} from '../utils/contract';
import { Backstop } from 'blend-sdk';

export async function installBackstop(stellarRpc: Server, source: Keypair, config: Config) {
  const operation = createInstallOperation('backstop', config);
  await invokeStellarOperation(stellarRpc, config, operation, source);
}

export async function deployBackstop(stellarRpc: Server, source: Keypair, config: Config) {
  const operation = createDeployOperation('backstop', 'backstop', config, source);
  await invokeStellarOperation(stellarRpc, config, operation, source);
}

export class BackstopContract {
  backstopOpBuilder: Backstop.BackstopOpBuilder;
  stellarRpc: Server;
  config: Config;
  constructor(address: string, stellarRpc: Server, config: Config) {
    this.backstopOpBuilder = new Backstop.BackstopOpBuilder(address);
    this.stellarRpc = stellarRpc;
    this.config = config;
  }

  public async initialize(source: Keypair) {
    const backstop_token = this.config.getContractId('backstop_token');
    const blnd_token = this.config.getContractId('blnd_token');
    const pool_factory = this.config.getContractId('pool_factory');
    const xdr_op = this.backstopOpBuilder.initialize({
      backstop_token,
      blnd_token,
      pool_factory,
    });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async deposit(from: string, pool_address: string, amount: bigint, source: Keypair) {
    const xdr_op = this.backstopOpBuilder.deposit({ from, pool_address, amount });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }
  public async queue_withdrawal(
    from: string,
    pool_address: string,
    amount: bigint,
    source: Keypair
  ) {
    const xdr_op = this.backstopOpBuilder.queue_withdrawal({ from, pool_address, amount });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }
  public async dequeue_withdrawal(
    from: string,
    pool_address: string,
    amount: bigint,
    source: Keypair
  ) {
    const xdr_op = this.backstopOpBuilder.dequeue_withdrawal({ from, pool_address, amount });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async withdraw(from: string, pool_address: string, amount: bigint, source: Keypair) {
    const xdr_op = this.backstopOpBuilder.withdraw({ from, pool_address, amount });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async balance(user: string, pool_address: string, source: Keypair) {
    const xdr_op = this.backstopOpBuilder.balance({ pool: pool_address, user });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async withdrawal_queue(user: string, pool_address: string, source: Keypair) {
    const xdr_op = this.backstopOpBuilder.withdrawal_queue({ pool: pool_address, user });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async pool_balance(pool_address: string, source: Keypair) {
    const xdr_op = this.backstopOpBuilder.pool_balance({ pool: pool_address });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async backstop_token(source: Keypair) {
    const xdr_op = this.backstopOpBuilder.backstop_token();
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async distribute(source: Keypair) {
    const xdr_op = this.backstopOpBuilder.distribute();
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async next_distribution(source: Keypair) {
    const xdr_op = this.backstopOpBuilder.next_distribution();
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async add_reward(to_add: string, to_remove: string, source: Keypair) {
    const xdr_op = this.backstopOpBuilder.add_reward({ to_add, to_remove });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async get_rz(source: Keypair) {
    const xdr_op = this.backstopOpBuilder.get_rz();
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async pool_eps(pool_address: string, source: Keypair) {
    const xdr_op = this.backstopOpBuilder.pool_eps({ pool_address });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async pool_claim(pool_address: string, to: string, amount: bigint, source: Keypair) {
    const xdr_op = this.backstopOpBuilder.pool_claim({ pool_address, to, amount });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async claim(from: string, pool_addresses: string[], to: string, source: Keypair) {
    const xdr_op = this.backstopOpBuilder.claim({ from, pool_addresses, to });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async draw(pool_address: string, to: string, amount: bigint, source: Keypair) {
    const xdr_op = this.backstopOpBuilder.draw({ pool_address, to, amount });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }

  public async donate(pool_address: string, from: string, amount: bigint, source: Keypair) {
    const xdr_op = this.backstopOpBuilder.donate({ pool_address, from, amount });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(this.stellarRpc, this.config, operation, source);
  }
}
