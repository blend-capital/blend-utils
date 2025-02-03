import { TransactionBuilder } from '@stellar/stellar-sdk';
import { config } from '../../utils/env_config.js';
import { invokeSorobanOperation, signWithKeypair } from '../../utils/tx.js';
import { installBlend } from '../deploy/blend.js';
import { mock } from './mock-example.js';
import { BackstopContractV1, BackstopContractV2, EmitterContract } from '@blend-capital/blend-sdk';
import { addressBook } from '../../utils/address-book.js';

const txBuilderOptions: TransactionBuilder.TransactionBuilderOptions = {
  fee: '10000',
  timebounds: {
    minTime: 0,
    maxTime: 0,
  },
  networkPassphrase: config.passphrase,
};
async function migrateV1ToV2() {
  const admin = config.admin;
  const adminTxParams = {
    account: await config.rpc.getAccount(admin.publicKey()),
    txBuilderOptions,
    signerFunction: async (txXDR: string) => {
      return signWithKeypair(txXDR, config.passphrase, admin);
    },
  };
  await installBlend(false, adminTxParams);
  await mock(false);

  const emitter = new EmitterContract(addressBook.getContractId('emitter'));
  const backstopV1 = new BackstopContractV1(addressBook.getContractId('backstop'));
  const backstopV2 = new BackstopContractV2(addressBook.getContractId('backstopV2'));

  await invokeSorobanOperation(
    emitter.queueSwapBackstop({
      new_backstop: addressBook.getContractId('backstopV2'),
      new_backstop_token: addressBook.getContractId('comet'),
    }),
    EmitterContract.parsers.queueSwapBackstop,
    adminTxParams
  );

  await new Promise((res) => setTimeout(res, 1000 * 60 * 2));

  await invokeSorobanOperation(
    emitter.distribute(),
    EmitterContract.parsers.distribute,
    adminTxParams
  );

  try {
    await invokeSorobanOperation(
      backstopV1.gulpEmissions(),
      BackstopContractV1.parsers.gulpEmissions,
      adminTxParams
    );
  } catch (e) {
    console.log('Backstop V1 Emissions already gulped');
  }

  await invokeSorobanOperation(
    emitter.swapBackstop(),
    EmitterContract.parsers.swapBackstop,
    adminTxParams
  );

  await invokeSorobanOperation(
    backstopV2.distribute(),
    BackstopContractV2.parsers.distribute,
    adminTxParams
  );
}

await migrateV1ToV2();
