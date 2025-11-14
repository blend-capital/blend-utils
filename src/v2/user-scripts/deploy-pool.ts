import {
  I128MAX,
  PoolContractV2,
  ReserveConfigV2,
  ReserveEmissionMetadata,
} from '@blend-capital/blend-sdk';
import { randomBytes } from 'crypto';
import { setupPool } from '../pool/pool-setup.js';
import { setupReserve } from '../pool/reserve-setup.js';
import { addressBook } from '../../utils/address-book.js';
import { config } from '../../utils/env_config.js';
import { TxParams, invokeSorobanOperation, signWithKeypair } from '../../utils/tx.js';

/**
 * Deploy a pool with the following parameters (Parameters can be changed as needed)
 * example: node ./lib/user-scripts/deploy-pool.js testnet true
 */

if (process.argv.length < 3) {
  throw new Error('Arguments required: `network`');
}

const txParams: TxParams = {
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

const getReserves = () => {
  return process.argv[2] === 'testnet' ?
    ['XLM', 'USDC', 'CETES', 'USTRY'] :
    ['XLM', 'USDC', 'CETES', 'USTRY', 'TESOURO'];
}

/// Deployment Constants
const pool_name = process.env.POOL_NAME || 'Etherfuse';
const backstop_take_rate = 0.2e7;
const max_positions = 6;
const min_collateral = BigInt(5e14); // 5$ must be scaled to oracle decimals (14)
const reserves = getReserves();
const reserve_configs: ReserveConfigV2[] = [
  // XLM
  {
    index: 0, // Does not matter
    decimals: 7,
    c_factor: 7500000, // (0_9000000)
    l_factor: 7500000, // (0_9000000)
    util: 5000000, // (0_5000000) must be under 950_0000
    max_util: 7000000, // (0_8000000) must be greater than util
    r_base: 100000, // (0_0050000)
    r_one: 400000, // (0_0500000)
    r_two: 3000000, // (0_1000000)
    r_three: 50000000,
    reactivity: 20, // must be 1000 or under
    supply_cap: BigInt(190_000_000e7), // ~ $50M
    enabled: true,
  },
  // USDC
  {
    index: 1,
    decimals: 7,
    c_factor: 9500000, // (0_9800000)
    l_factor: 9500000, // (0_9800000)
    util: 8000000, // (0_9000000)
    max_util: 9500000, // (0_9800000)
    r_base: 300000, // (0_0050000)
    r_one: 400000, // (0_0500000)
    r_two: 1200000, // (0_1000000)
    r_three: 50000000,
    reactivity: 20,
    supply_cap: BigInt(10_000_000e7), // ~ $10M
    enabled: true,
  },
  // CETES
  {
    index: 2,
    decimals: 7,
    c_factor: 8000000, // (0_9800000)
    l_factor: 8000000, // (0_9800000)
    util: 5000000, // (0_9000000)
    max_util: 9000000, // (0_9800000)
    r_base: 100000, // (0_0050000)
    r_one: 300000, // (0_0500000)
    r_two: 1200000, // (0_1000000)
    r_three: 50000000,
    reactivity: 20,
    supply_cap: BigInt(160_000_000e7), // ~ $10M
    enabled: true,
  },
  // USTRY
  {
    index: 3, // Does not matter
    decimals: 7,
    c_factor: 900_0000, // (0_9000000)
    l_factor: 900_0000, // (0_9000000)
    util: 500_0000, // (0_5000000) must be under 950_0000
    max_util: 900_0000, // (0_8000000) must be greater than util
    r_base: 100000, // (0_0050000)
    r_one: 200000, // (0_0500000)
    r_two: 1000000, // (0_1000000)
    r_three: 50000000,
    reactivity: 20, // must be 1000 or under
    supply_cap: BigInt(9_500_000e7), // ~ $10M
    enabled: true,
  },
];
const poolEmissionMetadata: ReserveEmissionMetadata[] = [
  {
    res_index: 1, // first reserve
    res_type: 1, // 0 for borrow emissions : 1 for supply emissions
    share: BigInt(0.5e7), // Share of total emissions
  },
  {
    res_index: 2, // second reserve
    res_type: 1, // 0 for borrow emissions : 1 for supply emissions
    share: BigInt(0.5e7), // Share of total emissions
  },
  {
    res_index: 3, // second reserve
    res_type: 1, // 0 for borrow emissions : 1 for supply emissions
    share: BigInt(0.5e7), // Share of total emissions
  },
];

async function deploy() {
  console.log('Deploy Pool\n');
  const poolSalt = randomBytes(32);

  const newPool = await setupPool(
    {
      admin: config.admin.publicKey(),
      name: pool_name,
      salt: poolSalt,
      oracle: addressBook.getContractId('oracle'),
      backstop_take_rate: backstop_take_rate,
      max_positions: max_positions,
      min_collateral: min_collateral,
    },
    txParams
  );

  console.log('Setup pool reserves and emissions\n');

  for (let i = 0; i < reserves.length; i++) {
    const reserve_name = reserves[i];
    const reserve_config = reserve_configs[i];
    await setupReserve(
      newPool.contractId(),
      {
        asset: addressBook.getContractId(reserve_name),
        metadata: reserve_config,
      },
      txParams
    );
  }

  await invokeSorobanOperation(
    newPool.setEmissionsConfig(poolEmissionMetadata),
    PoolContractV2.parsers.setEmissionsConfig,
    txParams
  );
}

await deploy();
