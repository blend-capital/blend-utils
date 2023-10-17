import {
  Transaction,
  TransactionBuilder,
  Keypair,
  Account,
  SorobanRpc,
  xdr,
  Operation,
  assembleTransaction,
} from 'soroban-client';
import { config } from './env_config.js';
import { ContractResult, Resources } from 'blend-sdk';

type txResponse = SorobanRpc.SendTransactionResponse | SorobanRpc.GetTransactionResponse;
type txStatus = SorobanRpc.SendTransactionStatus | SorobanRpc.GetTransactionStatus;

export async function signWithKeypair(
  txXdr: string,
  passphrase: string,
  source: Keypair
): Promise<string> {
  const tx = new Transaction(txXdr, passphrase);
  tx.sign(source);
  return tx.toXDR();
}

export async function logInvocation(invocation: Promise<ContractResult<any>>) {
  console.log('invoking contract...');
  const result = await invocation;
  console.log('Hash: ', result.hash);
  console.log(JSON.stringify(result.resources));
  console.log(result.toString());
  result.unwrap();
  console.log();
}

export async function invokeAndUnwrap<T>(
  operation: string | xdr.Operation,
  source: Keypair,
  parse: (value: string | xdr.ScVal | undefined) => T | undefined
): Promise<void> {
  const result = await invoke(operation, source, false, parse);
  console.log(result.toString(), '\n');
  result.unwrap();
}

export async function invoke<T>(
  operation: string | xdr.Operation,
  source: Keypair,
  sim: boolean,
  parse: (value: string | xdr.ScVal | undefined) => T | undefined
): Promise<ContractResult<T>> {
  const txBuilder = await createTxBuilder(source);
  if (typeof operation === 'string') {
    operation = xdr.Operation.fromXDR(operation, 'base64');
  }
  txBuilder.addOperation(operation);
  const tx = txBuilder.build();
  return invokeTransaction(tx, source, sim, parse);
}

export async function invokeTransaction<T>(
  tx: Transaction,
  source: Keypair,
  sim: boolean,
  parse: (value: string | xdr.ScVal | undefined) => T | undefined
) {
  // simulate the TX
  const simulation_resp = await config.rpc.simulateTransaction(tx);
  if (SorobanRpc.isSimulationError(simulation_resp)) {
    // No resource estimation available from a simulation error. Allow the response formatter
    // to fetch the error.
    const empty_resources = new Resources(0, 0, 0, 0, 0, 0, 0);
    return ContractResult.fromResponse(
      tx.hash().toString('hex'),
      empty_resources,
      simulation_resp,
      parse
    );
  } else if (sim) {
    // Only simulate the TX. Assemble the TX to borrow the resource estimation algorithm in
    // `assembleTransaction` and return the simulation results.
    const prepped_tx = assembleTransaction(tx, config.passphrase, simulation_resp).build();
    const resources = Resources.fromTransaction(prepped_tx.toXDR());
    return ContractResult.fromResponse(
      prepped_tx.hash().toString('hex'),
      resources,
      simulation_resp,
      parse
    );
  }

  console.log('submitting tx...');
  const prepped_tx = assembleTransaction(tx, config.passphrase, simulation_resp).build();
  prepped_tx.sign(source);
  let response: txResponse = await config.rpc.sendTransaction(prepped_tx);
  let status: txStatus = response.status;
  const tx_hash = response.hash;
  console.log(`Hash: ${tx_hash}`);
  // Poll this until the status is not "NOT_FOUND"
  while (status === 'PENDING' || status === 'NOT_FOUND') {
    // See if the transaction is complete
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log('checking tx...');
    response = await config.rpc.getTransaction(tx_hash);
    status = response.status;
  }
  const resources = Resources.fromTransaction(prepped_tx.toXDR());
  return ContractResult.fromResponse(tx_hash, resources, response, parse);
}

export async function createTxBuilder(source: Keypair): Promise<TransactionBuilder> {
  try {
    const account: Account = await config.rpc.getAccount(source.publicKey());

    return new TransactionBuilder(account, {
      fee: '10000',
      timebounds: { minTime: 0, maxTime: 0 },
      networkPassphrase: config.passphrase,
    });
  } catch (e: any) {
    console.error(e);
    throw Error('unable to create txBuilder');
  }
}

export async function invokeClassicOp(operation: xdr.Operation<Operation>, source: Keypair) {
  console.log('invoking classic op...');
  const txBuilder = await createTxBuilder(source);
  txBuilder.addOperation(operation);
  const tx = txBuilder.build();
  tx.sign(source);
  try {
    let response: txResponse = await config.rpc.sendTransaction(tx);
    let status: txStatus = response.status;
    const tx_hash = response.hash;
    console.log(`Hash: ${tx_hash}\n`);
    // Poll this until the status is not "NOT_FOUND"
    while (status === 'PENDING' || status === 'NOT_FOUND') {
      // See if the transaction is complete
      await new Promise((resolve) => setTimeout(resolve, 2000));
      console.log('checking tx...');
      response = await config.rpc.getTransaction(tx_hash);
      status = response.status;
    }
    console.log('Transaction status:', response.status);
    if (status === 'ERROR') {
      console.log(response);
    }
  } catch (e) {
    console.error(e);
    throw Error('failed to submit classic op TX');
  }
}
