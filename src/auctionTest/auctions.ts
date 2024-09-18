import { Pool, PoolContract, PositionsEstimate } from '@blend-capital/blend-sdk';
import { config } from '../utils/env_config.js';
import { invokeSorobanOperation, TxParams } from '../utils/tx.js';

export async function createUserLiquidation(
  txParams: TxParams,
  poolId: string,
  user: string,
  liquidation_percent: bigint | undefined
) {
  const pool = new PoolContract(poolId);
  const network = {
    rpc: config.rpc.serverURL.toString(),
    passphrase: config.passphrase,
    opts: { allowHttp: true },
  };
  const poolData = await Pool.load(network, poolId);
  const poolOracle = await poolData.loadOracle();
  const userData = await poolData.loadUser(user);
  const userEst = PositionsEstimate.build(poolData, poolOracle, userData.positions);
  if (liquidation_percent === undefined) {
    const avgInverseLF = userEst.totalEffectiveLiabilities / userEst.totalBorrowed;
    const avgCF = userEst.totalEffectiveCollateral / userEst.totalSupplied;
    const estIncentive = 1 + (1 - avgCF / avgInverseLF) / 2;
    const numberator = userEst.totalEffectiveLiabilities * 1.1 - userEst.totalEffectiveCollateral;
    const denominator = avgInverseLF * 1.1 - avgCF * estIncentive;
    liquidation_percent = BigInt(
      Math.round((numberator / denominator / userEst.totalBorrowed) * 100)
    );
    if (liquidation_percent > 100) {
      liquidation_percent = BigInt(100);
    } else if (liquidation_percent <= 0) {
      liquidation_percent = BigInt(0);
    } else {
      liquidation_percent = BigInt(liquidation_percent);
    }
  }
  await invokeSorobanOperation(
    pool.newLiquidationAuction({
      user,
      percent_liquidated: liquidation_percent,
    }),
    PoolContract.parsers.newLiquidationAuction,
    txParams
  );
}

export async function createBadDebtAuction(txParams: TxParams, poolId: string) {
  const pool = new PoolContract(poolId);
  await invokeSorobanOperation(pool.newBadDebtAuction(), PoolContract.parsers.badDebt, txParams);
}

export async function createInterestAuction(txParams: TxParams, poolId: string, assets: string[]) {
  const pool = new PoolContract(poolId);
  await invokeSorobanOperation(
    pool.newInterestAuction(assets),
    PoolContract.parsers.newInterestAuction,
    txParams
  );
}
