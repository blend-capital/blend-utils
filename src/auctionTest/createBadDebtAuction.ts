import { Address, Keypair } from '@stellar/stellar-sdk';
import { addressBook } from '../utils/address-book.js';
import { createBadDebtAuction } from './auctions.js';
import { config } from '../utils/env_config.js';
import { signWithKeypair } from '../utils/tx.js';

if (process.argv.length < 4) {
  throw new Error('Arguments required (in decimal): `network` `private key` `pool name`');
}
const privateKey = process.argv[3];
const pool = addressBook.getContractId(process.argv[4]);
try {
  let keypair = Keypair.fromSecret(privateKey);
  Address.fromString(keypair.publicKey());
} catch (e) {
  throw new Error('Invalid private key');
}
try {
  Address.fromString(pool);
} catch (e) {
  throw new Error('Invalid pool id');
}

let keypair = Keypair.fromSecret(privateKey);
let txParams = {
  account: await config.rpc.getAccount(keypair.publicKey()),
  txBuilderOptions: {
    fee: '10000',
    timebounds: {
      minTime: 0,
      maxTime: 0,
    },
    networkPassphrase: config.passphrase,
  },
  signerFunction: async (txXDR: string) => {
    return signWithKeypair(txXDR, config.passphrase, keypair);
  },
};
await createBadDebtAuction(txParams, pool);
