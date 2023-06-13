import {
  Transaction,
  Server,
  TransactionBuilder,
  Keypair,
  Account,
  SorobanRpc,
} from 'soroban-client';

type txResponse = SorobanRpc.SendTransactionResponse | SorobanRpc.GetTransactionResponse;
type txStatus = SorobanRpc.SendTransactionStatus | SorobanRpc.GetTransactionStatus;

/**
 * @param {Server} stellarRpc
 * @param {string} network
 * @param {Transaction} tx
 * @param {Keypair} source
 */
export async function signAndSubmitTransaction(
  stellarRpc: Server,
  network: string,
  tx: Transaction,
  source: Keypair
) {
  const prepped_tx = await stellarRpc.prepareTransaction(tx, network);
  try {
    prepped_tx.sign(source);
    console.log('fee: ', prepped_tx.fee);
    console.log('submitting tx...');
    let response: txResponse = await stellarRpc.sendTransaction(prepped_tx);
    let status: txStatus = response.status;
    const tx_hash = response.hash;
    console.log(JSON.stringify(response));

    // Poll this until the status is not "NOT_FOUND"
    while (status === 'PENDING' || status === 'NOT_FOUND') {
      // See if the transaction is complete
      await new Promise((resolve) => setTimeout(resolve, 2000));
      console.log('checking tx...');
      response = await stellarRpc.getTransaction(tx_hash);
      status = response.status;
    }
    console.log('Transaction status:', response.status);
    console.log('Hash: ', tx_hash);
  } catch (e) {
    console.error(e);
    throw e;
  }
}

/**
 * @param {Server} stellarRpc
 * @param {string} network
 * @param {Keypair} source
 * @returns {Promise<TransactionBuilder>}
 */
export async function createTxBuilder(stellarRpc: Server, network: string, source: Keypair) {
  try {
    const account: Account = await stellarRpc.getAccount(source.publicKey());

    return new TransactionBuilder(account, {
      fee: '1000',
      timebounds: { minTime: 0, maxTime: 0 },
      networkPassphrase: network,
    });
  } catch (e) {
    console.error(e);
    throw e;
  }
}
