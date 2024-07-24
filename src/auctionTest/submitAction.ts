import { Address, Keypair } from '@stellar/stellar-sdk';
import { addressBook } from '../utils/address-book.js';
import { submit } from './user.js';

if (process.argv.length < 8) {
  throw new Error(
    'Arguments required (in decimal): `network` `private key` `pool name` `asset name` `action` `amount`'
  );
}
const privateKey = process.argv[3];
const pool = addressBook.getContractId(process.argv[4]);
const asset = addressBook.getContractId(process.argv[5]);
const action = Number(process.argv[6]);
let amount = Number(process.argv[7]);

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
try {
  Address.fromString(asset);
} catch (e) {
  throw new Error('Invalid asset id');
}
if (isNaN(action) || action < 0 || action > 9) {
  throw new Error('Invalid action');
}
if (isNaN(amount) || amount <= 0) {
  throw new Error('Invalid amount');
}

let bigintAmount = BigInt(amount);
await submit(privateKey, pool, asset, action, bigintAmount);
