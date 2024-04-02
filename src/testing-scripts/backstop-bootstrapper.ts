import { Address, Asset, TransactionBuilder } from 'stellar-sdk';

import { TxParams, invokeClassicOp, invokeSorobanOperation, signWithKeypair } from '../utils/tx.js';
import { config } from '../utils/env_config.js';
import { addressBook } from '../utils/address-book.js';
import { BootstrapContract } from '../external/bootstrapper.js';
import { TokenContract } from '../external/token.js';
import {
  bumpContractCode,
  bumpContractInstance,
  deployContract,
  installContract,
} from '../utils/contract.js';
const txBuilderOptions: TransactionBuilder.TransactionBuilderOptions = {
  fee: '10000',
  timebounds: {
    minTime: 0,
    maxTime: 0,
  },
  networkPassphrase: config.passphrase,
};
export async function setupBackstopBootstrapper(): Promise<void> {
  const adminTxParams: TxParams = {
    account: await config.rpc.getAccount(config.admin.publicKey()),
    txBuilderOptions,
    signerFunction: async (txXDR: string) => {
      return signWithKeypair(txXDR, config.passphrase, config.admin);
    },
  };
  await installContract('bootstrapper', adminTxParams);
  await bumpContractCode('bootstrapper', adminTxParams);
  const backstopBootstrapper = await deployContract('bootstrapper', 'bootstrapper', adminTxParams);
  await bumpContractInstance('bootstrapper', adminTxParams);

  const whaleTxParams: TxParams = {
    account: await config.rpc.getAccount(config.getUser('WHALE').publicKey()),
    txBuilderOptions,
    signerFunction: async (txXDR: string) => {
      return signWithKeypair(txXDR, config.passphrase, config.getUser('WHALE'));
    },
  };
  //   await airdropAccount(config.getUser('FRODO'));
  const frodoTxParams: TxParams = {
    account: await config.rpc.getAccount(config.getUser('FRODO').publicKey()),
    txBuilderOptions,
    signerFunction: async (txXDR: string) => {
      return signWithKeypair(txXDR, config.passphrase, config.getUser('FRODO'));
    },
  };
  console.log('frodo pk', frodoTxParams.account.accountId());

  const bootstrapper = new BootstrapContract(backstopBootstrapper);

  await invokeSorobanOperation(
    bootstrapper.initialize(
      Address.fromString(addressBook.getContractId('backstop')),
      Address.fromString(addressBook.getContractId('comet'))
    ),
    () => undefined,
    adminTxParams
  );
  console.log('Successfully deployed and setup the bootstrap contract.\n');
  const blndAddress = addressBook.getContractId('BLND');
  const usdcAddress = addressBook.getContractId('USDC');
  const admin = config.admin;
  const BLND = new TokenContract(blndAddress, new Asset('BLND', admin.publicKey()));
  const USDC = new TokenContract(usdcAddress, new Asset('USDC', admin.publicKey()));
  await invokeClassicOp(BLND.classic_trustline(whaleTxParams.account.accountId()), whaleTxParams);
  await invokeClassicOp(
    BLND.classic_mint(whaleTxParams.account.accountId(), '250000'),
    adminTxParams
  );
  await invokeClassicOp(USDC.classic_trustline(frodoTxParams.account.accountId()), frodoTxParams);
  await invokeClassicOp(
    USDC.classic_mint(frodoTxParams.account.accountId(), '13000'),
    adminTxParams
  );
  await invokeSorobanOperation(
    bootstrapper.add_bootstrap(
      Address.fromString(whaleTxParams.account.accountId()),
      0,
      BigInt(250000e7),
      BigInt(1),
      0,
      Address.fromString(addressBook.getContractId('Stellar'))
    ),
    () => undefined,
    whaleTxParams
  );
  console.log('Successfully added a bootstrap to the bootstrap contract.\n');
  await invokeSorobanOperation(
    bootstrapper.join(
      Address.fromString(frodoTxParams.account.accountId()),
      BigInt(13000e7),
      Address.fromString(whaleTxParams.account.accountId()),
      0
    ),
    () => undefined,
    frodoTxParams
  );
  console.log('Successfully joined the bootstrap contract.\n');
  await invokeSorobanOperation(
    bootstrapper.exit(
      Address.fromString(frodoTxParams.account.accountId()),
      BigInt(4000e7),
      Address.fromString(whaleTxParams.account.accountId()),
      0
    ),
    () => undefined,
    frodoTxParams
  );
  console.log('Successfully exited the bootstrap contract.\n');
  await new Promise((resolve) => setTimeout(resolve, 10000));
  console.log(whaleTxParams.account.accountId());
  await invokeSorobanOperation(
    bootstrapper.close_bootstrap(
      Address.fromString(frodoTxParams.account.accountId()),
      Address.fromString(whaleTxParams.account.accountId()),
      0
    ),
    () => undefined,
    frodoTxParams
  );
  console.log('Successfully closed the bootstrap contract.\n');
  await invokeSorobanOperation(
    bootstrapper.claim(
      Address.fromString(whaleTxParams.account.accountId()),
      Address.fromString(whaleTxParams.account.accountId()),
      0
    ),
    () => undefined,
    whaleTxParams
  );
  await invokeSorobanOperation(
    bootstrapper.claim(
      Address.fromString(frodoTxParams.account.accountId()),
      Address.fromString(whaleTxParams.account.accountId()),
      0
    ),
    () => undefined,
    frodoTxParams
  );
  console.log('Successfully claimed the bootstrap contract.\n');
}
await setupBackstopBootstrapper();
