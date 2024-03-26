import { BackstopContract, PoolContract } from '@blend-capital/blend-sdk';
import { TxParams, invokeClassicOp, invokeSorobanOperation } from '../utils/tx.js';
import { TokenContract } from '../external/token.js';
import { CometContract } from '../external/comet.js';
import { Asset } from 'stellar-sdk';

export async function setupPoolBackstop(
  backstopAddress: string,
  poolAddress: string,
  cometAddress: string,
  blndAddress: string,
  usdcAddress: string,
  adminTxParams: TxParams,
  whaleTxParams: TxParams
) {
  let pool = new PoolContract(poolAddress);
  let backstop = new BackstopContract(backstopAddress);
  let BLND = new TokenContract(blndAddress, new Asset('BLND', adminTxParams.account.accountId()));
  let USDC = new TokenContract(usdcAddress, new Asset('USDC', adminTxParams.account.accountId()));
  let comet = new CometContract(cometAddress);
  await invokeClassicOp(BLND.classic_trustline(whaleTxParams.account.accountId()), whaleTxParams);
  await invokeClassicOp(
    BLND.classic_mint(whaleTxParams.account.accountId(), '500100'),
    adminTxParams
  );
  await invokeClassicOp(USDC.classic_trustline(whaleTxParams.account.accountId()), whaleTxParams);
  await invokeClassicOp(
    USDC.classic_mint(whaleTxParams.account.accountId(), '12501'),
    adminTxParams
  );

  await invokeSorobanOperation(
    comet.joinPool(
      BigInt(50000e7),
      [BigInt(500100e7), BigInt(12501e7)],
      whaleTxParams.account.accountId()
    ),
    () => undefined,
    whaleTxParams
  );

  await invokeSorobanOperation(
    backstop.deposit({
      from: whaleTxParams.account.accountId(),
      pool_address: poolAddress,
      amount: BigInt(50_000e7),
    }),

    BackstopContract.parsers.deposit,
    whaleTxParams
  );

  await invokeSorobanOperation(
    backstop.updateTokenValue(),
    BackstopContract.parsers.updateTknVal,
    adminTxParams
  );

  await invokeSorobanOperation(pool.setStatus(0), PoolContract.parsers.setStatus, adminTxParams);
  await invokeSorobanOperation(
    backstop.addReward({
      to_add: pool.contractId(),
      to_remove: pool.contractId(),
    }),
    BackstopContract.parsers.addReward,
    adminTxParams
  );
  console.log('Successfully setup pool backstop\n');
}
