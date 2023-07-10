import { Asset, Keypair, Operation, SorobanRpc, xdr } from 'soroban-client';
import {
  createDeployOperation,
  createDeployStellarAssetOperation,
  createInstallOperation,
  invokeStellarOperation,
} from '../utils/contract';
import { AddressBook } from '../utils/address_book';
import { Token } from 'blend-sdk';
import { createTxBuilder } from '../utils/tx';
import { config } from '../utils/env_config';
type txResponse = SorobanRpc.SendTransactionResponse | SorobanRpc.GetTransactionResponse;
type txStatus = SorobanRpc.SendTransactionStatus | SorobanRpc.GetTransactionStatus;

export async function installToken(contracts: AddressBook, source: Keypair, token_type: string) {
  const operation = createInstallOperation(token_type, contracts);
  await invokeStellarOperation(operation, source);
}

export async function deployToken(
  contracts: AddressBook,
  source: Keypair,
  token_type: string,
  token_name: string
) {
  const operation = createDeployOperation(token_name, token_type, contracts, source);
  await invokeStellarOperation(operation, source);
  return new BlendTokenContract(contracts.getContractId(token_name), contracts);
}

export async function deployStellarAsset(contracts: AddressBook, source: Keypair, asset: Asset) {
  try {
    const operation = createDeployStellarAssetOperation(asset, contracts);
    await invokeStellarOperation(operation, source);
  } catch (e) {
    console.error('unable to deploy stellar asset', asset.code, e);
  }
}

export class BlendTokenContract {
  tokenOpBuilder: Token.TokenOpBuilder;
  contracts: AddressBook;

  constructor(address: string, contracts: AddressBook) {
    this.tokenOpBuilder = new Token.TokenOpBuilder(address);
    this.contracts = contracts;
  }

  public async initialize(
    admin: string,
    decimal: number,
    name: Buffer,
    symbol: Buffer,
    source: Keypair
  ) {
    const xdr_op = this.tokenOpBuilder.initialize({ admin, decimal, name, symbol });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(operation, source);
  }

  public async clawback(from: string, amount: bigint, source: Keypair) {
    const xdr_op = this.tokenOpBuilder.clawback({ from, amount });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(operation, source);
  }

  public async mint(to: string, amount: bigint, source: Keypair) {
    const xdr_op = this.tokenOpBuilder.mint({ to, amount });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(operation, source);
  }

  public async mint_stellar_asset(user: Keypair, source: Keypair, asset: Asset, amount: string) {
    // create trustline for USDC and mint to frodo
    const txBuilder = await createTxBuilder(source);
    txBuilder.addOperation(
      Operation.changeTrust({
        source: user.publicKey(),
        asset: asset,
      })
    );
    txBuilder.addOperation(
      Operation.payment({
        destination: user.publicKey(),
        asset: asset,
        amount: amount,
        source: source.publicKey(),
      })
    );
    const tx = txBuilder.build();
    tx.sign(source);
    tx.sign(user);
    try {
      let response: txResponse = await config.rpc.sendTransaction(tx);
      let status: txStatus = response.status;
      const tx_hash = response.hash;
      console.log(JSON.stringify(response));

      // Poll this until the status is not "NOT_FOUND"
      while (status === 'PENDING' || status === 'NOT_FOUND') {
        // See if the transaction is complete
        await new Promise((resolve) => setTimeout(resolve, 2000));
        console.log('checking tx...');
        response = await config.rpc.getTransaction(tx_hash);
        status = response.status;
      }
      console.log('Transaction status:', response.status);
      console.log(`Hash: ${tx_hash}\n`);
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  public async new_admin(new_admin: string, source: Keypair) {
    const xdr_op = this.tokenOpBuilder.set_admin({ new_admin });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(operation, source);
  }

  public async set_authorized(id: string, authorize: boolean, source: Keypair) {
    const xdr_op = this.tokenOpBuilder.setauthorized({ id, authorize });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(operation, source);
  }

  public async increase_allowance(from: string, spender: string, amount: bigint, source: Keypair) {
    const xdr_op = this.tokenOpBuilder.increase_allowance({ from, spender, amount });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(operation, source);
  }

  public async decrease_allowance(from: string, spender: string, amount: bigint, source: Keypair) {
    const xdr_op = this.tokenOpBuilder.decrease_allowance({ from, spender, amount });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(operation, source);
  }

  public async transfer(from: string, to: string, amount: bigint, source: Keypair) {
    const xdr_op = this.tokenOpBuilder.transfer({ from, to, amount });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(operation, source);
  }

  public async transfer_from(
    from: string,
    to: string,
    spender: string,
    amount: bigint,
    source: Keypair
  ) {
    const xdr_op = this.tokenOpBuilder.transferfrom({ from, to, spender, amount });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(operation, source);
  }

  public async burn(from: string, amount: bigint, source: Keypair) {
    const xdr_op = this.tokenOpBuilder.burn({ from, amount });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(operation, source);
  }

  public async burn_from(from: string, _spender: string, amount: bigint, source: Keypair) {
    const xdr_op = this.tokenOpBuilder.burnfrom({ from, _spender, amount });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(operation, source);
  }

  public async authorized(id: string, source: Keypair) {
    const xdr_op = this.tokenOpBuilder.authorized({ id });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(operation, source);
  }

  public async initialize_asset(admin: string, asset: string, index: number, source: Keypair) {
    const xdr_op = this.tokenOpBuilder.initialize_asset({ admin, asset, index });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(operation, source);
  }
}
