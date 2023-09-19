import { Asset } from 'soroban-client';
import { AddressBook } from '../utils/address_book';
import { deployBackstop, installBackstop } from '../contracts/backstop';
import { installToken, deployToken, deployStellarAsset } from '../contracts/token';
import { deployEmitter, installEmitter } from '../contracts/emitter';
import { deployPoolFactory, installPoolFactory } from '../contracts/pool_factory';
import { deployMockOracle, installMockOracle } from '../contracts/oracle';
import { PoolFactory } from 'blend-sdk';
import { airdropAccount, bumpContractCode, bumpContractInstance } from '../utils/contract';
import { installPool } from '../contracts/pool';
import { config } from '../utils/env_config';
import { deployComet, installComet } from '../contracts/comet';

export async function deployAndInitContracts(addressBook: AddressBook) {
  await airdropAccount(config.admin);

  console.log('Installing Blend Contracts');
  await installBackstop(addressBook, config.admin);
  await bumpContractCode('backstop', addressBook, config.admin);
  await installEmitter(addressBook, config.admin);
  await bumpContractCode('emitter', addressBook, config.admin);
  await installPoolFactory(addressBook, config.admin);
  await bumpContractCode('poolFactory', addressBook, config.admin);
  await installToken(addressBook, config.admin, 'token');
  await bumpContractCode('token', addressBook, config.admin);
  await installPool(addressBook, config.admin);
  await bumpContractCode('lendingPool', addressBook, config.admin);

  if (network != 'mainnet') {
    // mocks
    console.log('Installing and deploying: Blend Mocked Contracts');
    await installMockOracle(addressBook, config.admin);
    await bumpContractCode('oracle', addressBook, config.admin);
    await deployMockOracle(addressBook, config.admin);
    await bumpContractInstance('oracle', addressBook, config.admin);

    // Tokens
    console.log('Installing and deploying: Tokens');
    // const wbtc = await deployToken(addressBook, config.admin, 'token', 'WBTC');
    // await wbtc.initialize(config.admin.publicKey(), 6, 'WBTC Token', 'WBTC', config.admin);
    // await bumpContractInstance('WBTC', addressBook, config.admin);
    // const weth = await deployToken(addressBook, config.admin, 'token', 'WETH');
    // await weth.initialize(config.admin.publicKey(), 9, 'WETH Token', 'WETH', config.admin);
    // await bumpContractInstance('WETH', addressBook, config.admin);

    await deployStellarAsset(addressBook, config.admin, Asset.native());
    await bumpContractInstance('XLM', addressBook, config.admin);
    await deployStellarAsset(
      addressBook,
      config.admin,
      new Asset('USDC', config.admin.publicKey())
    );
    await bumpContractInstance('USDC', addressBook, config.admin);
    await deployStellarAsset(
      addressBook,
      config.admin,
      new Asset('BLND', config.admin.publicKey())
    );
    await bumpContractInstance('BLND', addressBook, config.admin);

    // Comet LP
    await installComet(addressBook, config.admin);
    const comet = await deployComet(addressBook, config.admin);
    await bumpContractInstance('comet', addressBook, config.admin);
    await comet.init(config.admin.publicKey(), config.admin);
  }

  console.log('Deploying and Initializing Blend');
  const backstop = await deployBackstop(addressBook, config.admin);
  const emitter = await deployEmitter(addressBook, config.admin);
  const poolFactory = await deployPoolFactory(addressBook, config.admin);
  addressBook.writeToFile();

  await backstop.initialize(config.admin);
  await emitter.initialize(config.admin);
  const poolInitMeta: PoolFactory.PoolInitMeta = {
    backstop: addressBook.getContractId('backstop'),
    blnd_id: addressBook.getContractId('BLND'),
    usdc_id: addressBook.getContractId('USDC'),
    pool_hash: Buffer.from(addressBook.getWasmHash('lendingPool'), 'hex'),
  };
  await poolFactory.initialize(poolInitMeta, config.admin);

  await bumpContractInstance('backstop', addressBook, config.admin);
  await bumpContractInstance('emitter', addressBook, config.admin);
  await bumpContractInstance('poolFactory', addressBook, config.admin);
}

const network = process.argv[2];
const addressBook = AddressBook.loadFromFile(network);
console.log(config.admin.publicKey());
await deployAndInitContracts(addressBook);
