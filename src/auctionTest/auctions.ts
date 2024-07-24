import { Pool, PoolContract } from '@blend-capital/blend-sdk';
import { invokeSorobanOperation, TxParams } from '../utils/tx.js';
import { config } from '../utils/env_config.js';

export async function createUserLiquidation(
  txParams: TxParams,
  poolId: string,
  user: string,
  liquidation_percent: bigint | undefined
) {
  const pool = new PoolContract(poolId);
  let network = {
    rpc: config.rpc.serverURL.toString(),
    passphrase: config.passphrase,
    opts: { allowHttp: true },
  };
  let currTimestamp = await config.rpc
    .getTransaction('0000000000000000000000000000000000000000000000000000000000000000')
    .then((tx) => tx.latestLedgerCloseTime);
  let poolData = await Pool.load(network, poolId, currTimestamp);
  let userData = await poolData.loadUser(network, user);
  if (liquidation_percent === undefined) {
    let avgInverseLF =
      userData.positionEstimates.totalEffectiveLiabilities /
      userData.positionEstimates.totalBorrowed;
    let avgCF =
      userData.positionEstimates.totalEffectiveCollateral /
      userData.positionEstimates.totalSupplied;
    let estIncentive = 1 + (1 - avgCF / avgInverseLF) / 2;
    let numberator =
      userData.positionEstimates.totalEffectiveLiabilities * 1.1 -
      userData.positionEstimates.totalEffectiveCollateral;
    let denominator = avgInverseLF * 1.1 - avgCF * estIncentive;
    liquidation_percent = BigInt(
      Math.round((numberator / denominator / userData.positionEstimates.totalBorrowed) * 100)
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
