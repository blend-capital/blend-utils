import {
  BackstopContract,
  PoolContract,
  Request,
  RequestType,
  ReserveConfig,
  ReserveEmissionMetadata,
} from '@blend-capital/blend-sdk';
import { Asset, TransactionBuilder } from '@stellar/stellar-sdk';
import { randomBytes } from 'crypto';
import { deployBlend } from '../deploy/blend.js';
import { deployComet } from '../deploy/comet.js';
import { tryDeployStellarAsset } from '../deploy/stellar-asset.js';
import { setupPool } from '../pool/pool-setup.js';
import { setupReserve } from '../pool/reserve-setup.js';
import { airdropAccount } from '../utils/contract.js';
import { config } from '../utils/env_config.js';
import { TxParams, invokeClassicOp, invokeSorobanOperation, signWithKeypair } from '../utils/tx.js';

const txBuilderOptions: TransactionBuilder.TransactionBuilderOptions = {
  fee: '10000',
  timebounds: {
    minTime: 0,
    maxTime: 0,
  },
  networkPassphrase: config.passphrase,
};
await mock();

async function mock() {
  // your account should be admin in .env
  const adminTxParams: TxParams = {
    account: await config.rpc.getAccount(config.admin.publicKey()),
    txBuilderOptions,
    signerFunction: async (txXDR: string) => {
      return signWithKeypair(txXDR, config.passphrase, config.admin);
    },
  };

  const XLM = await tryDeployStellarAsset(Asset.native(), adminTxParams);
  const BLND = await tryDeployStellarAsset(
    new Asset('BLND', config.admin.publicKey()),
    adminTxParams
  );
  const usdc_issuer = '';
  const USDC = await tryDeployStellarAsset(
    new Asset('USDC', config.admin.publicKey()),
    adminTxParams
  );
  const wETH = await tryDeployStellarAsset(
    new Asset('wETH', config.admin.publicKey()),
    adminTxParams
  );
  const wBTC = await tryDeployStellarAsset(
    new Asset('wBTC', config.admin.publicKey()),
    adminTxParams
  );
  const cometContract = await deployComet(
    adminTxParams,
    [BLND.contractId(), USDC.contractId()],
    [BigInt(0.8e7), BigInt(0.2e7)],
    [BigInt(1e7), BigInt(0.2e7)],
    BigInt(0.003e7)
  );
  const [backstopContract, emitterContract] = await deployBlend(
    BLND.contractId(),
    cometContract.contractId(),
    USDC.contractId(),
    new Map(),
    adminTxParams
  );
}
