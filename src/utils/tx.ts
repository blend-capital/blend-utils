import { Transaction, TransactionBuilder, Keypair, Account, SorobanRpc } from 'soroban-client';
import { config } from './env_config';

type txResponse = SorobanRpc.SendTransactionResponse | SorobanRpc.GetTransactionResponse;
type txStatus = SorobanRpc.SendTransactionStatus | SorobanRpc.GetTransactionStatus;

export async function signAndSubmitTransaction(tx: Transaction, source: Keypair) {
  try {
    const prepped_tx = await config.rpc.prepareTransaction(tx, config.passphrase);
    prepped_tx.sign(source);
    console.log('fee: ', prepped_tx.fee);
    console.log('submitting tx...');
    let response: txResponse = await config.rpc.sendTransaction(prepped_tx);
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
  } catch (e: any) {
    console.error(e);
    throw Error('failed to submit TX');
  }
}

export async function createTxBuilder(source: Keypair): Promise<TransactionBuilder> {
  try {
    const account: Account = await config.rpc.getAccount(source.publicKey());

    return new TransactionBuilder(account, {
      fee: '1000',
      timebounds: { minTime: 0, maxTime: 0 },
      networkPassphrase: config.passphrase,
    });
  } catch (e: any) {
    console.error(e);
    throw Error('unable to create txBuilder');
  }
}
