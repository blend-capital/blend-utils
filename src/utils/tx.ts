import {
  Transaction,
  TransactionBuilder,
  Keypair,
  Account,
  SorobanRpc,
  xdr,
  Operation,
  TimeoutInfinite,
} from 'stellar-sdk';
import { config } from './env_config.js';
import { ContractError, parseError, parseResult } from '@blend-capital/blend-sdk';
import { parse } from 'path';
import { report } from 'process';

export type TxParams = {
  account: Account;
  signerFunction: (txXdr: string) => Promise<string>;
  txBuilderOptions: TransactionBuilder.TransactionBuilderOptions;
};

export async function signWithKeypair(
  txXdr: string,
  passphrase: string,
  source: Keypair
): Promise<string> {
  const tx = new Transaction(txXdr, passphrase);
  tx.sign(source);
  return tx.toXDR();
}

export async function simulationOperation(
  operation: string,
  txParams: TxParams
): Promise<SorobanRpc.Api.SimulateTransactionResponse> {
  let txBuilder = new TransactionBuilder(txParams.account, txParams.txBuilderOptions)
    .addOperation(xdr.Operation.fromXDR(operation, 'base64'))
    .setTimeout(TimeoutInfinite);
  let transaction = txBuilder.build();
  let simulation = await config.rpc.simulateTransaction(transaction);
  return simulation;
}

export async function sendTransaction<T>(
  transaction: Transaction,
  parser: (result: string) => T
): Promise<T | undefined> {
  let send_tx_response = await config.rpc.sendTransaction(transaction);
  let curr_time = Date.now();
  while (send_tx_response.status !== 'PENDING' && Date.now() - curr_time < 20000) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    send_tx_response = await config.rpc.sendTransaction(transaction);
  }
  if (send_tx_response.status !== 'PENDING') {
    const error = parseError(send_tx_response);
    console.error('Transaction failed to send: ' + send_tx_response.hash);
    throw error;
  }

  let get_tx_response = await config.rpc.getTransaction(send_tx_response.hash);
  while (get_tx_response.status === 'NOT_FOUND') {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    get_tx_response = await config.rpc.getTransaction(send_tx_response.hash);
  }
  if (get_tx_response.status !== 'SUCCESS') {
    let error = parseError(get_tx_response);
    throw error;
  }
  let result = parseResult(get_tx_response, parser);
  return result;
}

export async function invokeSorobanOperation<T>(
  operation: string,
  parser: (result: string) => T,
  txParams: TxParams,
  sorobanData?: xdr.SorobanTransactionData
): Promise<T | undefined> {
  let txBuilder = new TransactionBuilder(txParams.account, txParams.txBuilderOptions)
    .addOperation(xdr.Operation.fromXDR(operation, 'base64'))
    .setTimeout(TimeoutInfinite);
  if (sorobanData) {
    txBuilder.setSorobanData(sorobanData);
  }
  let transaction = txBuilder.build();

  let simulation = await config.rpc.simulateTransaction(transaction);

  if (SorobanRpc.Api.isSimulationError(simulation)) {
    const error = parseError(simulation);
    console.error(error);
    throw error;
  }

  let assembledTx = SorobanRpc.assembleTransaction(transaction, simulation).build();
  let signedTx = new Transaction(
    await txParams.signerFunction(assembledTx.toXDR()),
    config.passphrase
  );
  let response = await sendTransaction(signedTx, parser);
  return response;
}

export async function invokeClassicOp(operation: string, txParams: TxParams) {
  let txBuilder = new TransactionBuilder(txParams.account, txParams.txBuilderOptions)
    .addOperation(xdr.Operation.fromXDR(operation, 'base64'))
    .setTimeout(TimeoutInfinite);
  let transaction = txBuilder.build();
  let signedTx = new Transaction(
    await txParams.signerFunction(transaction.toXDR()),
    config.passphrase
  );
  try {
    let result = await sendTransaction(signedTx, () => undefined);
  } catch (e) {
    console.error(e);
    throw Error('failed to submit classic op TX');
  }
}
