import { Network, PoolClient, Request, TxOptions } from '@blend-capital/blend-sdk';
import { AddressBook } from '../utils/address_book.js';
import { config } from '../utils/env_config.js';
import { logInvocation, signWithKeypair } from '../utils/tx.js';

async function submit(addressBook: AddressBook) {
  const whale = config.getUser('WHALE');
  console.log('WHALE: ', whale.publicKey());
  const signWithWhale = (txXdr: string) => signWithKeypair(txXdr, rpc_network.passphrase, whale);

  const stellarPool = new PoolClient(addressBook.getContractId('Stellar'));

  const stellarRequests: Request[] = [
    {
      amount: BigInt(1e7),
      request_type: 2,
      address: addressBook.getContractId('USDC'),
    },
  ];
  await logInvocation(
    stellarPool.submit(whale.publicKey(), signWithWhale, rpc_network, tx_options, {
      from: whale.publicKey(),
      spender: whale.publicKey(),
      to: whale.publicKey(),
      requests: stellarRequests,
    })
  );
}

const network = process.argv[2];
const addressBook = AddressBook.loadFromFile(network);
const rpc_network: Network = {
  rpc: config.rpc.serverURL.toString(),
  passphrase: config.passphrase,
  opts: { allowHttp: true },
};
const tx_options: TxOptions = {
  sim: false,
  pollingInterval: 2000,
  timeout: 30000,
  builderOptions: {
    fee: '10000',
    timebounds: {
      minTime: 0,
      maxTime: 0,
    },
    networkPassphrase: config.passphrase,
  },
};
await submit(addressBook);
