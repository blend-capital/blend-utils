import { Asset, Keypair, Server } from 'soroban-client';
import config, { Contracts } from '../utils/config';
import { deployBackstop, installBackstop } from '../contracts/backstop';
import { installToken, deployToken, deployStellarAsset } from '../contracts/token';
import { deployEmitter, installEmitter } from '../contracts/emitter';
import { deployPoolFactory, installPoolFactory } from '../contracts/pool_factory';
import { deployMockOracle, installMockOracle } from '../contracts/oracle';
import { PoolFactory } from 'blend-sdk';
import { airdropAccount } from '../utils/contract';
import { installPool } from '../contracts/pool';

export async function deployAndInitContracts(
  stellarRpc: Server,
  contracts: Contracts,
  network: string,
  source: Keypair
) {
  await airdropAccount(stellarRpc, source);

  await installBackstop(stellarRpc, contracts, source);
  await installEmitter(stellarRpc, contracts, source);
  await installPoolFactory(stellarRpc, contracts, source);
  await installToken(stellarRpc, contracts, source, 'bToken');
  await installToken(stellarRpc, contracts, source, 'dToken');
  await installToken(stellarRpc, contracts, source, 'token');
  await installPool(stellarRpc, contracts, source);

  const blnd = await deployToken(stellarRpc, contracts, source, 'token', 'BLND');
  await blnd.initialize(
    source.publicKey(),
    7,
    Buffer.from('BLND Token'),
    Buffer.from('BLND'),
    source
  );

  if (network == 'standalone' || network == 'futurenet') {
    await installMockOracle(stellarRpc, contracts, source);
    await deployMockOracle(stellarRpc, contracts, source);
    const wbtc = await deployToken(stellarRpc, contracts, source, 'token', 'WBTC');
    await wbtc.initialize(
      source.publicKey(),
      7,
      Buffer.from('WBTC Token'),
      Buffer.from('WBTC'),
      source
    );
    const weth = await deployToken(stellarRpc, contracts, source, 'token', 'WETH');
    await weth.initialize(
      source.publicKey(),
      7,
      Buffer.from('WETH Token'),
      Buffer.from('WETH'),
      source
    );
    const blndusdc = await deployToken(
      stellarRpc,
      contracts,
      source,
      'token',
      'backstopToken'
    );
    await blndusdc.initialize(
      source.publicKey(),
      7,
      Buffer.from('BLND-USDC Token'),
      Buffer.from('BLND-USDC'),
      source
    );
    await deployStellarAsset(stellarRpc, contracts, source, Asset.native());
    await deployStellarAsset(stellarRpc, contracts, source, new Asset('USDC', source.publicKey()));
  }

  const backstop = await deployBackstop(stellarRpc, contracts, source);
  const emitter = await deployEmitter(stellarRpc, contracts, source);
  const poolFactory = await deployPoolFactory(stellarRpc, contracts, source);
  contracts.writeToFile();

  await backstop.initialize(source);
  await emitter.initialize(source);

  const poolInitMeta: PoolFactory.PoolInitMeta = {
    b_token_hash: Buffer.from(contracts.getWasmHash('bToken'), 'hex'),
    d_token_hash: Buffer.from(contracts.getWasmHash('dToken'), 'hex'),
    backstop: contracts.getContractId('backstop'),
    blnd_id: contracts.getContractId('BLND'),
    usdc_id: contracts.getContractId('USDC'),
    pool_hash: Buffer.from(contracts.getWasmHash('lendingPool'), 'hex'),
  };
  await poolFactory.initialize(poolInitMeta, source);
}

const network = process.argv[2];
const contracts = Contracts.loadFromFile(network);
const stellarRpc = new Server(config.rpc, {
  allowHttp: true,
});
const admin = config.admin;
if (admin === undefined) {
  throw Error('Error: env does not contain admin secret key');
} else {
  const bombadil = Keypair.fromSecret(admin);
  deployAndInitContracts(stellarRpc, contracts, network, bombadil);
}
