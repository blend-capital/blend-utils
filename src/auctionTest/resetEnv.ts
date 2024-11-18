import { Network, PoolContract, Request, RequestType } from '@blend-capital/blend-sdk';
import { TransactionBuilder } from '@stellar/stellar-sdk';
import { addressBook } from '../utils/address-book.js';
import { config } from '../utils/env_config.js';
import { invokeSorobanOperation, signWithKeypair, TxParams } from '../utils/tx.js';

const network: Network = {
  rpc: config.rpc.serverURL.toString(),
  passphrase: config.passphrase,
  opts: { allowHttp: true },
};

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
    amount: BigInt(1000e7),
    request_type: RequestType.SupplyCollateral,
    address: IR,
  },
  {
    amount: BigInt(800e7),
    request_type: RequestType.Borrow,
    address: IR,
  },
  {
    amount: BigInt(100e7),
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

console.log('Liquidation created.');
