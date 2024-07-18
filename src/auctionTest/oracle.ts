import { Address } from '@stellar/stellar-sdk';
import { OracleContract } from '../external/oracle.js';
import { addressBook } from '../utils/address-book.js';
import { bumpContractCode, bumpContractInstance, installContract } from '../utils/contract.js';
import { config } from '../utils/env_config.js';
import { TxParams, invokeSorobanOperation, signWithKeypair } from '../utils/tx.js';

const AUCTION_ORACLE_KEY = 'auctionOracle';

const adminTxParams: TxParams = {
  account: await config.rpc.getAccount(config.admin.publicKey()),
  txBuilderOptions: {
    fee: '10000',
    timebounds: {
      minTime: 0,
      maxTime: 0,
    },
    networkPassphrase: config.passphrase,
  },
  signerFunction: async (txXDR: string) => {
    return signWithKeypair(txXDR, config.passphrase, config.admin);
  },
};

if (process.argv.length < 5) {
  throw new Error('Arguments required (in decimal): `network` `VOL` `HIGH_INT` `NO_COL`');
}

const vol_price = Number(process.argv[3]);
const high_int_price = Number(process.argv[4]);
const no_col_price = Number(process.argv[5]);
if (isNaN(vol_price) || isNaN(high_int_price) || isNaN(no_col_price)) {
  throw new Error('Invalid price arguments');
}

await setPrice(adminTxParams, vol_price, high_int_price, no_col_price);

export async function setupAuctionOracle(txParams: TxParams): Promise<OracleContract> {
  await installContract(AUCTION_ORACLE_KEY, txParams);
  await bumpContractCode(AUCTION_ORACLE_KEY, txParams);
  await bumpContractInstance(AUCTION_ORACLE_KEY, txParams);

  const oracleAddress = addressBook.getContractId(AUCTION_ORACLE_KEY);
  const oracle = new OracleContract(oracleAddress);
  await invokeSorobanOperation(
    oracle.setData(
      Address.fromString(config.admin.publicKey()),
      {
        tag: 'Other',
        values: ['USD'],
      },
      [
        {
          tag: 'Stellar',
          values: [Address.fromString(addressBook.getContractId('USDC'))],
        },
        {
          tag: 'Stellar',
          values: [Address.fromString(addressBook.getContractId('XLM'))],
        },
        {
          tag: 'Stellar',
          values: [Address.fromString(addressBook.getContractId('VOL'))],
        },
        {
          tag: 'Stellar',
          values: [Address.fromString(addressBook.getContractId('HIGH_INT'))],
        },
        {
          tag: 'Stellar',
          values: [Address.fromString(addressBook.getContractId('NO_COL'))],
        },
      ],
      7,
      300
    ),
    () => undefined,
    txParams
  );
  await invokeSorobanOperation(
    oracle.setPriceStable([
      BigInt(1e7),
      BigInt(0.1e7),
      BigInt(100e7),
      BigInt(10000e7),
      BigInt(0.01e7),
    ]),
    () => undefined,
    txParams
  );
  console.log('Successfully deployed and setup the Auction Oracle contract.\n');
  return new OracleContract(oracleAddress);
}

export async function setPrice(
  txParams: TxParams,
  vol_price: number,
  high_int_price: number,
  no_col_price: number
) {
  const oracleAddress = addressBook.getContractId(AUCTION_ORACLE_KEY);
  const oracle = new OracleContract(oracleAddress);
  await invokeSorobanOperation(
    oracle.setPriceStable([
      BigInt(1e7),
      BigInt(0.1e7),
      BigInt(Math.floor(vol_price * 1e7)),
      BigInt(Math.floor(high_int_price * 1e7)),
      BigInt(Math.floor(no_col_price * 1e7)),
    ]),
    () => undefined,
    txParams
  );
  console.log('Successfully set prices for the Auction Oracle contract.\n');
}
