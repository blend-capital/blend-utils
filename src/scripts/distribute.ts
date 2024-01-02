import {
  BackstopClient,
  EmitterClient,
  Network,
  PoolClient,
  TxOptions,
} from '@blend-capital/blend-sdk';
import { config } from '../utils/env_config.js';
import { AddressBook } from '../utils/address_book.js';
import { logInvocation, signWithKeypair } from '../utils/tx.js';

async function distribute(addressBook: AddressBook) {
  const signWithAdmin = (txXdr: string) =>
    signWithKeypair(txXdr, rpc_network.passphrase, config.admin);

  // Initialize Contracts
  const backstop = new BackstopClient(addressBook.getContractId('backstop'));
  const emitter = new EmitterClient(addressBook.getContractId('emitter'));
  const stellarPool = new PoolClient(addressBook.getContractId('Stellar'));
  const bridgePool = new PoolClient(addressBook.getContractId('Bridge'));

  console.log('Emitter distribute');
  await logInvocation(
    emitter.distribute(config.admin.publicKey(), signWithAdmin, rpc_network, tx_options)
  );
  console.log('Backstop gulp');
  await logInvocation(
    backstop.gulpEmissions(config.admin.publicKey(), signWithAdmin, rpc_network, tx_options)
  );
  console.log('Stellar Pool gulp');
  await logInvocation(
    stellarPool.gulpEmissions(config.admin.publicKey(), signWithAdmin, rpc_network, tx_options)
  );
  console.log('Bridge Pool gulp');
  await logInvocation(
    bridgePool.gulpEmissions(config.admin.publicKey(), signWithAdmin, rpc_network, tx_options)
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
await distribute(addressBook);
