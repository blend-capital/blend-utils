import { RequestType } from '@blend-capital/blend-sdk';
import { Asset, Keypair, scValToNative, xdr } from '@stellar/stellar-sdk';
import { TokenContract } from '../external/token.js';
import { addressBook } from '../utils/address-book.js';
import { airdropAccount } from '../utils/contract.js';
import { config } from '../utils/env_config.js';
import { invokeClassicOp, invokeSorobanOperation, signWithKeypair } from '../utils/tx.js';
import { submit } from './user.js';

const keypair = config.getUser('AUCT');
const user = await createLiquidator(keypair);
console.log(user.secret(), '\n', user.publicKey());

async function createLiquidator(user_keypair: Keypair | undefined): Promise<Keypair> {
  const keypair = user_keypair ?? Keypair.random();
  await airdropAccount(keypair);
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
  const highVolToken = new TokenContract(
    addressBook.getContractId('VOL'),
    new Asset('VOL', config.admin.publicKey())
  );
  const USDC = new TokenContract(
    addressBook.getContractId('USDC'),
    new Asset('USDC', config.admin.publicKey())
  );
  const highIRToken = new TokenContract(
    addressBook.getContractId('IR'),
    new Asset('IR', config.admin.publicKey())
  );
  const noCollateralToken = new TokenContract(
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
    USDC.mint(keypair.publicKey(), BigInt(20000e7)),
    (xdrString) => {
      return scValToNative(xdr.ScVal.fromXDR(xdrString, 'base64'));
    },
    adminTxParams
  );
  await invokeClassicOp(highIRToken.classic_trustline(keypair.publicKey()), txParams);
  await invokeClassicOp(noCollateralToken.classic_trustline(keypair.publicKey()), txParams);

  const poolId = addressBook.getContractId('Auction');
  await submit(
    txParams,
    poolId,
    addressBook.getContractId('USDC'),
    RequestType.SupplyCollateral,
    BigInt(5000e7)
  );
  return keypair;
}
