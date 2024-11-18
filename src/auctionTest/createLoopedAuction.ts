import { PoolContract, Request, RequestType } from '@blend-capital/blend-sdk';
import { TransactionBuilder } from '@stellar/stellar-sdk';
import { addressBook } from '../utils/address-book.js';
import { config } from '../utils/env_config.js';
import { invokeSorobanOperation, signWithKeypair, TxParams } from '../utils/tx.js';
import { setPrice } from './oracle.js';

// const network: Network = {
//   rpc: config.rpc.serverURL.toString(),
//   passphrase: config.passphrase,
//   opts: { allowHttp: true },
// };

const txBuilderOptions: TransactionBuilder.TransactionBuilderOptions = {
  fee: '10000',
  timebounds: {
    minTime: 0,
    maxTime: 0,
  },
  networkPassphrase: config.passphrase,
};

const auctioneer = config.getUser('AUCT');
const samwise = config.getUser('SAMWISE');
const poolId = addressBook.getContractId('Auction');

const adminTxParams: TxParams = {
  account: await config.rpc.getAccount(config.admin.publicKey()),
  txBuilderOptions,
  signerFunction: async (txXDR: string) => {
    return signWithKeypair(txXDR, config.passphrase, config.admin);
  },
};

const auctioneerTxParams: TxParams = {
  account: await config.rpc.getAccount(auctioneer.publicKey()),
  txBuilderOptions,
  signerFunction: async (txXDR: string) => {
    return signWithKeypair(txXDR, config.passphrase, auctioneer);
  },
};
const samwiseTxParams: TxParams = {
  account: await config.rpc.getAccount(samwise.publicKey()),
  txBuilderOptions,
  signerFunction: async (txXDR: string) => {
    return signWithKeypair(txXDR, config.passphrase, samwise);
  },
};

const VOL = addressBook.getContractId('VOL');
const IR = addressBook.getContractId('IR');

const auctionPool = new PoolContract(poolId);

// assumes samwise does not have any positions

console.log('Setup positions');
const positionRequest: Request[] = [
  {
    amount: BigInt(100e7),
    request_type: RequestType.SupplyCollateral,
    address: IR,
  },
  {
    amount: BigInt(80.5e7),
    request_type: RequestType.Borrow,
    address: IR,
  },
  {
    amount: BigInt(4e7),
    request_type: RequestType.Borrow,
    address: VOL,
  },
];
await invokeSorobanOperation(
  auctionPool.submit({
    from: samwise.publicKey(),
    spender: samwise.publicKey(),
    to: samwise.publicKey(),
    requests: positionRequest,
  }),
  PoolContract.parsers.submit,
  samwiseTxParams
);

console.log('Position created.');

console.log('Spike VOL price.');
await setPrice(adminTxParams, 150, 1000, 0.01);
console.log('Price set.');

// console.log('Create liquidation');
// await createUserLiquidation(auctioneerTxParams, poolId, samwise.publicKey(), undefined);

console.log('Liquidation created.');
