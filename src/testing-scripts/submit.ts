import { Network, PoolClient, Request, RequestType, TxOptions } from '@blend-capital/blend-sdk';
import { AddressBook } from '../utils/address_book.js';
import { config } from '../utils/env_config.js';
import { logInvocation, signWithKeypair } from '../utils/tx.js';
import { airdropAccount } from '../utils/contract.js';
import { TokenClient } from '../external/token.js';
import { Asset } from 'stellar-sdk';

async function submit(addressBook: AddressBook) {
  const whale = config.getUser('OLDWHALE');
  console.log('OLDWHALE: ', whale.publicKey());
  await airdropAccount(whale);
  const usdc_token = new TokenClient(addressBook.getContractId('USDC'));
  const usdc_asset = new Asset('USDC', config.admin.publicKey());
  await usdc_token.classic_trustline(whale, usdc_asset, whale);
  await usdc_token.classic_mint(whale, usdc_asset, '100000', config.admin);

  const signWithWhale = (txXdr: string) => signWithKeypair(txXdr, rpc_network.passphrase, whale);

  const stellarPool = new PoolClient(addressBook.getContractId('Stellar'));

  const stellarRequests: Request[] = [
    {
      amount: BigInt(1e7),
      request_type: RequestType.SupplyCollateral,
      address: addressBook.getContractId('USDC'),
    },
    {
      amount: BigInt(10e7),
      request_type: RequestType.Borrow,
      address: addressBook.getContractId('XLM'),
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
