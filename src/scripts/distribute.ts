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
import { OracleClient } from '../external/oracle.js';

async function distribute(addressBook: AddressBook) {
  const signWithAdmin = (txXdr: string) =>
    signWithKeypair(txXdr, rpc_network.passphrase, config.admin);

  // Initialize Contracts
  const backstop = new BackstopClient(addressBook.getContractId('backstop'));
  const emitter = new EmitterClient(addressBook.getContractId('emitter'));
  const oracle = new OracleClient(addressBook.getContractId('oracle'));
  const stellarPool = new PoolClient(addressBook.getContractId('Stellar'));
  const bridgePool = new PoolClient(addressBook.getContractId('Bridge'));

  await oracle.setPriceStable([BigInt(1e7), BigInt(0.1e7), BigInt(0.05e7)], config.admin);

  console.log('Distribute to pools');
  await logInvocation(
    emitter.distribute(config.admin.publicKey(), signWithAdmin, rpc_network, tx_options)
  );
  await logInvocation(
    backstop.updateEmissionCycle(config.admin.publicKey(), signWithAdmin, rpc_network, tx_options)
  );
  await logInvocation(
    stellarPool.updateEmissions(config.admin.publicKey(), signWithAdmin, rpc_network, tx_options)
  );
  await logInvocation(
    bridgePool.updateEmissions(config.admin.publicKey(), signWithAdmin, rpc_network, tx_options)
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
