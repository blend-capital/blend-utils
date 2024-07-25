import { Address, Keypair } from '@stellar/stellar-sdk';
import { addressBook } from '../utils/address-book.js';
import { createUserLiquidation } from './auctions.js';
import { config } from '../utils/env_config.js';
import { signWithKeypair } from '../utils/tx.js';

if (process.argv.length < 7) {
  throw new Error(
    'Arguments required (in decimal): `network` `private key` `pool name` `user `liquidation percent (optional)`'
  );
}
const privateKey = process.argv[3];
const pool = addressBook.getContractId(process.argv[4]);
const user = process.argv[5];
const liquidationPercent = Number(process.argv[6]);

try {
  const keypair = Keypair.fromSecret(privateKey);
  Address.fromString(keypair.publicKey());
} catch (e) {
  throw new Error('Invalid private key');
}
try {
  Address.fromString(pool);
} catch (e) {
  throw new Error('Invalid pool id');
}
try {
  Address.fromString(user);
} catch (e) {
  throw new Error('Invalid asset id');
}

const keypair = Keypair.fromSecret(privateKey);
const txParams = {
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
await createUserLiquidation(
  txParams,
  pool,
  user,
  !isNaN(liquidationPercent) && liquidationPercent > 0 ? BigInt(liquidationPercent) : undefined
);
