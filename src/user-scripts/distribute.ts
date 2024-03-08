import { BackstopContract, EmitterContract, PoolContract } from '@blend-capital/blend-sdk';
import { invokeSorobanOperation, signWithKeypair, TxParams } from '../utils/tx.js';
import { config } from '../utils/env_config.js';
import { addressBook } from '../utils/address_book.js';
// Set this user to desired user

if (process.argv.length < 4) {
  throw new Error('Arguments required: `network` `user` `pool`');
}

const user = config.getUser(process.argv[3]);
const poolAddress = addressBook.getContractId(process.argv[4]);
console.log(user, poolAddress);
const txParams: TxParams = {
  account: await config.rpc.getAccount(user.publicKey()),
  txBuilderOptions: {
    fee: '10000',
    timebounds: {
      minTime: 0,
      maxTime: 0,
    },
    networkPassphrase: config.passphrase,
  },
  signerFunction: async (txXDR: string) => {
    return signWithKeypair(txXDR, config.passphrase, user);
  },
};
// The name of the pool in the address book

await distribute(poolAddress, txParams);

export async function distribute(poolAddress: string, txParams: TxParams) {
  // Initialize Contracts
  const backstop = new BackstopContract(addressBook.getContractId('backstop'));
  const emitter = new EmitterContract(addressBook.getContractId('emitter'));
  const pool = new PoolContract(poolAddress);

  console.log('Emitter distribute');

  await invokeSorobanOperation(emitter.distribute(), emitter.parsers.distribute, txParams);

  console.log('Backstop gulp');

  await invokeSorobanOperation(backstop.gulpEmissions(), backstop.parsers.gulpEmissions, txParams);
  console.log('Pool gulp');
  await invokeSorobanOperation(pool.gulpEmissions(), pool.parsers.gulpEmissions, txParams);
}
