import { Asset, Keypair, scValToNative, xdr } from '@stellar/stellar-sdk';
import { airdropAccount } from '../utils/contract.js';
import { TokenContract } from '../external/token.js';
import { addressBook } from '../utils/address-book.js';
import { config } from '../utils/env_config.js';
import { invokeClassicOp, invokeSorobanOperation, signWithKeypair } from '../utils/tx.js';
import { PoolContract, Request, RequestType } from '@blend-capital/blend-sdk';
import { Key } from 'readline';

async function createUser(): Promise<Keypair> {
  let keypair = Keypair.random();
  await airdropAccount(keypair);
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
  const adminTxParams = {
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
  let highVolToken = new TokenContract(
    addressBook.getContractId('VOL'),
    new Asset('VOL', config.admin.publicKey())
  );
  let USDC = new TokenContract(
    addressBook.getContractId('USDC'),
    new Asset('USDC', config.admin.publicKey())
  );
  let highIRToken = new TokenContract(
    addressBook.getContractId('IR'),
    new Asset('IR', config.admin.publicKey())
  );
  let noCollateralToken = new TokenContract(
    addressBook.getContractId('NOCOL'),
    new Asset('NOCOL', config.admin.publicKey())
  );
  await invokeClassicOp(highVolToken.classic_trustline(keypair.publicKey()), txParams);
  await invokeSorobanOperation(
    highVolToken.mint(keypair.publicKey(), BigInt(10000e7)),
    (xdrString) => {
      return scValToNative(xdr.ScVal.fromXDR(xdrString, 'base64'));
    },
    adminTxParams
  );

  await invokeClassicOp(USDC.classic_trustline(keypair.publicKey()), txParams);
  await invokeSorobanOperation(
    USDC.mint(keypair.publicKey(), BigInt(10000e7)),
    (xdrString) => {
      return scValToNative(xdr.ScVal.fromXDR(xdrString, 'base64'));
    },
    adminTxParams
  );

  await invokeClassicOp(highIRToken.classic_trustline(keypair.publicKey()), txParams);
  await invokeSorobanOperation(
    highIRToken.mint(keypair.publicKey(), BigInt(10000e7)),
    (xdrString) => {
      return scValToNative(xdr.ScVal.fromXDR(xdrString, 'base64'));
    },
    adminTxParams
  );

  await invokeClassicOp(noCollateralToken.classic_trustline(keypair.publicKey()), txParams);
  await invokeSorobanOperation(
    noCollateralToken.mint(keypair.publicKey(), BigInt(10000e7)),
    (xdrString) => {
      return scValToNative(xdr.ScVal.fromXDR(xdrString, 'base64'));
    },
    adminTxParams
  );
  return keypair;
}

async function submit(
  privateKey: string,
  poolId: string,
  asset: string,
  action: RequestType,
  amount: bigint
): Promise<void> {
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
  let pool = new PoolContract(poolId);
  let request: Request = {
    amount: amount,
    request_type: action,
    address: asset,
  };
  await invokeSorobanOperation(
    pool.submit({
      from: keypair.publicKey(),
      to: keypair.publicKey(),
      spender: keypair.publicKey(),
      requests: [request],
    }),
    PoolContract.parsers.submit,
    txParams
  );
}

export { createUser, submit };
