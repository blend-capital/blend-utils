import { TxParams, invokeSorobanOperation } from '../utils/tx.js';
import { CometContract } from '../external/comet.js';
import { config } from '../utils/env_config.js';
export async function setupComet(
  cometAddress: string,
  blndAddress: string,
  usdcAddress: string,
  txParams: TxParams
) {
  let cometContract = new CometContract(cometAddress);
  // setup BLND-USDC Pool
  await invokeSorobanOperation(
    cometContract.bind(blndAddress, BigInt(1_000e7), BigInt(8e7), config.admin),
    () => undefined,
    txParams
  );
  await invokeSorobanOperation(
    cometContract.bind(usdcAddress, BigInt(25e7), BigInt(2e7), config.admin),
    () => undefined,
    txParams
  );
  await invokeSorobanOperation(
    cometContract.setSwapFee(BigInt(0.003e7), config.admin),
    () => undefined,
    txParams
  );
  await invokeSorobanOperation(cometContract.finalize(), () => undefined, txParams);
  await invokeSorobanOperation(
    cometContract.setPublicSwap(true, config.admin),
    () => undefined,
    txParams
  );
  console.log('Successfully created BLND-USDC Comet Pool\n');
}
