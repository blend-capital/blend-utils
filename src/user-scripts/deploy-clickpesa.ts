import {
    BackstopContract,
    PoolContract,
    ReserveConfig,
    ReserveEmissionMetadata,
} from '@blend-capital/blend-sdk';
import { Asset, TransactionBuilder } from '@stellar/stellar-sdk';
import { randomBytes } from 'crypto';
import { CometContract } from '../external/comet.js';
import { addressBook } from '../utils/address-book.js';
import { tryDeployStellarAsset } from '../deploy/stellar-asset.js';
import { setupPool } from '../pool/pool-setup.js';
import { setupReserve } from '../pool/reserve-setup.js';
import { config } from '../utils/env_config.js';
import { TxParams, invokeSorobanOperation, signWithKeypair } from '../utils/tx.js';

const txBuilderOptions: TransactionBuilder.TransactionBuilderOptions = {
    fee: '10000',
    timebounds: {
        minTime: 0,
        maxTime: 0,
    },
    networkPassphrase: config.passphrase,
};
await deployClickPesaPool();

async function deployClickPesaPool() {

    // await airdropAccount(config.admin); /* Not on Mainnet */
    const adminTxParams: TxParams = {
        account: await config.rpc.getAccount(config.admin.publicKey()),
        txBuilderOptions,
        signerFunction: async (txXDR: string) => {
            return signWithKeypair(txXDR, config.passphrase, config.admin);
        },
    };

    const usdc_contractId = addressBook.getContractId('USDC');
    const CPYT = await tryDeployStellarAsset(
        new Asset('CPYT', 'GA2MSSZKJOU6RNL3EJKH3S5TB5CDYTFQFWRYFGUJVIN5I6AOIRTLUHTO'),
        adminTxParams
    );
    const oracle_aggregator = addressBook.getContractId('oracleAggregator');

    // ********** Stellar Pool (XLM, USDC) **********//

    const stellarPool = await setupPool(
        {
            admin: config.admin.publicKey(),
            name: 'ClickPesa Debt Fund',
            salt: randomBytes(32),
            oracle: oracle_aggregator,
            backstop_take_rate: 0.15e7,
            max_positions: 4,
        },
        adminTxParams
    );

    const stellarPoolCpytReserveMetaData: ReserveConfig = {
        index: 0,
        decimals: 7,
        c_factor: 980_0000,
        l_factor: 0,
        util: 10_0000,
        max_util: 20_0000,
        r_base: 100000,
        r_one: 500000,
        r_two: 5000000,
        r_three: 1_0000000,
        reactivity: 0,
    };
    await setupReserve(
        stellarPool.contractId(),
        {
            asset: CPYT.contractId(),
            metadata: stellarPoolCpytReserveMetaData,
        },
        adminTxParams
    );

    const stellarPoolUsdcReserveMetaData: ReserveConfig = {
        index: 1,
        decimals: 7,
        c_factor: 0,
        l_factor: 9800000,
        util: 9500000,
        max_util: 1_0000000,
        r_base: 1200000,
        r_one: 0,
        r_two: 0,
        r_three: 0,
        reactivity: 0,
    };

    await setupReserve(
        stellarPool.contractId(),
        { asset: usdc_contractId, metadata: stellarPoolUsdcReserveMetaData },
        adminTxParams
    );

    const stellarPoolEmissionMetadata: ReserveEmissionMetadata[] = [
        {
            res_index: 0, // CPYT
            res_type: 0, // d_token
            share: BigInt(0.5e7), // 50%
        },
        {
            res_index: 1, // USDC
            res_type: 1, // b_token
            share: BigInt(0.5e7), // 50%
        },
    ];
    await invokeSorobanOperation(
        stellarPool.setEmissionsConfig(stellarPoolEmissionMetadata),
        PoolContract.parsers.setEmissionsConfig,
        adminTxParams
    );

    const comet = new CometContract(addressBook.getContractId('comet'));
    await invokeSorobanOperation(
        comet.joinPool(
            BigInt(50000e7),
            [BigInt(500100e7), BigInt(25000e7)],
            adminTxParams.account.accountId()
        ),
        () => undefined,
        adminTxParams
    );
        
    const backstop = new BackstopContract(addressBook.getContractId('backstop'));
    await invokeSorobanOperation(
        backstop.deposit({
            from: adminTxParams.account.accountId(),
            pool_address: stellarPool.contractId(),
            amount: BigInt(50_000e7),
        }),

        BackstopContract.parsers.deposit,
        adminTxParams
    );
            
    await invokeSorobanOperation(
        backstop.updateTokenValue(),
        BackstopContract.parsers.updateTknVal,
        adminTxParams
    );

    await invokeSorobanOperation(stellarPool.setStatus(0), PoolContract.parsers.setStatus, adminTxParams);
    await invokeSorobanOperation(
        backstop.addReward({
            to_add: stellarPool.contractId(),
            to_remove: stellarPool.contractId(),
        }),
        BackstopContract.parsers.addReward,
        adminTxParams
    );
    console.log('Successfully setup pool backstop\n');
}
        