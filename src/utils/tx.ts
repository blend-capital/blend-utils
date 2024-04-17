import { parseError, parseResult } from '@blend-capital/blend-sdk';
import {
  Account,
  Keypair,
  SorobanRpc,
  TimeoutInfinite,
  Transaction,
  TransactionBuilder,
  xdr,
} from '@stellar/stellar-sdk';
import { config } from './env_config.js';

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
  const txBuilder = new TransactionBuilder(txParams.account, txParams.txBuilderOptions)
    .addOperation(xdr.Operation.fromXDR(operation, 'base64'))
    .setTimeout(TimeoutInfinite);
  const transaction = txBuilder.build();
  const simulation = await config.rpc.simulateTransaction(transaction);
  return simulation;
}

export async function sendTransaction<T>(
  transaction: Transaction,
  parser: (result: string) => T
): Promise<T | undefined> {
  let send_tx_response = await config.rpc.sendTransaction(transaction);
  const curr_time = Date.now();
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
    const error = parseError(get_tx_response);
    throw error;
  }

  const result = parseResult(get_tx_response, parser);
  return result;
}

export async function invokeSorobanOperation<T>(
  operation: string,
  parser: (result: string) => T,
  txParams: TxParams,
  sorobanData?: xdr.SorobanTransactionData
): Promise<T | undefined> {
  const account = await config.rpc.getAccount(txParams.account.accountId());
  const txBuilder = new TransactionBuilder(account, txParams.txBuilderOptions)
    .addOperation(xdr.Operation.fromXDR(operation, 'base64'))
    .setTimeout(TimeoutInfinite);
  if (sorobanData) {
    txBuilder.setSorobanData(sorobanData);
  }
  const transaction = txBuilder.build();
  console.log('Transaction Hash:', transaction.hash().toString('hex'));
  const simulation = await config.rpc.simulateTransaction(transaction);
  if (SorobanRpc.Api.isSimulationError(simulation)) {
    const error = parseError(simulation);
    console.error(error);
    throw error;
  }

  const assembledTx = SorobanRpc.assembleTransaction(transaction, simulation).build();
  const signedTx = new Transaction(
    await txParams.signerFunction(assembledTx.toXDR()),
    config.passphrase
  );
  const response = await sendTransaction(signedTx, parser);
  return response;
}

export async function invokeClassicOp(operation: string, txParams: TxParams) {
  const account = await config.rpc.getAccount(txParams.account.accountId());
  const txBuilder = new TransactionBuilder(account, txParams.txBuilderOptions)
    .addOperation(xdr.Operation.fromXDR(operation, 'base64'))
    .setTimeout(TimeoutInfinite);
  const transaction = txBuilder.build();
  const signedTx = new Transaction(
    await txParams.signerFunction(transaction.toXDR()),
    config.passphrase
  );
  try {
    await sendTransaction(signedTx, () => undefined);
  } catch (e) {
    console.error(e);
    throw Error('failed to submit classic op TX');
  }
}
