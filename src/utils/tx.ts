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
import { ContractResponse } from '@blend-capital/blend-sdk';
import { get } from 'http';

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

export async function logInvocation(invocation: Promise<ContractResponse<any>>) {
  console.log('invoking contract...');
  const result = await invocation;
  console.log('Hash: ', result.hash);
  console.log(result.result.unwrap());
  // result.unwrap();
  console.log();
}

export async function sendTransaction<T>(
  transaction: Transaction,
  parser: (result: string) => T
): Promise<ContractResponse<T>> {
  let send_tx_response = await config.rpc.sendTransaction(transaction);
  let curr_time = Date.now();
  while (send_tx_response.status !== 'PENDING' && Date.now() - curr_time < 20000) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    send_tx_response = await config.rpc.sendTransaction(transaction);
  }
  if (send_tx_response.status !== 'PENDING') {
    console.error(send_tx_response);
    console.log(JSON.stringify(send_tx_response.errorResult));
    throw new Error('Transaction failed to send: ' + send_tx_response.hash);
  }

  let get_tx_response = await config.rpc.getTransaction(send_tx_response.hash);
  while (get_tx_response.status === 'NOT_FOUND') {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    get_tx_response = await config.rpc.getTransaction(send_tx_response.hash);
  }
  let tx_resp = ContractResponse.fromTransactionResponse(
    get_tx_response,
    transaction,
    config.passphrase,
    parser
  );
  return tx_resp;
}

export async function invokeSorobanOperation<T>(
  operation: string,
  parser: (result: string) => T,
  txParams: TxParams,
  sorobanData?: xdr.SorobanTransactionData
): Promise<T> {
  let txBuilder = new TransactionBuilder(txParams.account, txParams.txBuilderOptions)
    .addOperation(xdr.Operation.fromXDR(operation, 'base64'))
    .setTimeout(TimeoutInfinite);
  if (sorobanData) {
    txBuilder.setSorobanData(sorobanData);
  }
  let transaction = txBuilder.build();

  let simulation = await config.rpc.simulateTransaction(transaction);
  let sim_response = ContractResponse.fromSimulationResponse(
    simulation,
    transaction,
    config.passphrase,
    parser
  );

  if (sim_response.result.isErr()) {
    throw sim_response.result.unwrapErr();
  }

  let assembledTx = SorobanRpc.assembleTransaction(transaction, simulation).build();
  let signedTx = new Transaction(
    await txParams.signerFunction(assembledTx.toXDR()),
    config.passphrase
  );
  let response = await sendTransaction(signedTx, parser);
  if (response.result.isErr()) {
    console.error('Failed transaction hash: ', response.hash);
    throw response.result.unwrapErr();
  }
  return response.result.unwrap();
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
    await sendTransaction(signedTx, () => undefined);
  } catch (e) {
    console.error(e);
    throw Error('failed to submit classic op TX');
  }
}
