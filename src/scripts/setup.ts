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

  console.log('Deploying and Initializing Tokens');
  const blnd = await deployToken(addressBook, config.admin, 'token', 'BLND');
  await blnd.initialize(config.admin.publicKey(), 7, 'BLND Token', 'BLND', config.admin);
  await bumpContractInstance('BLND', addressBook, config.admin);

  if (network != 'mainnet') {
    await installMockOracle(addressBook, config.admin);
    await bumpContractCode('oracle', addressBook, config.admin);
    await deployMockOracle(addressBook, config.admin);
    await bumpContractInstance('oracle', addressBook, config.admin);
    const wbtc = await deployToken(addressBook, config.admin, 'token', 'WBTC');
    await wbtc.initialize(config.admin.publicKey(), 6, 'WBTC Token', 'WBTC', config.admin);
    await bumpContractInstance('WBTC', addressBook, config.admin);
    const weth = await deployToken(addressBook, config.admin, 'token', 'WETH');
    await weth.initialize(config.admin.publicKey(), 9, 'WETH Token', 'WETH', config.admin);
    await bumpContractInstance('WETH', addressBook, config.admin);
    const blndusdc = await deployToken(addressBook, config.admin, 'token', 'backstopToken');
    await blndusdc.initialize(
      config.admin.publicKey(),
      7,
      'BLND-USDC Token',
      'BLND-USDC',
      config.admin
    );
    await bumpContractInstance('backstopToken', addressBook, config.admin);

    await deployStellarAsset(addressBook, config.admin, Asset.native());
    await bumpContractInstance('XLM', addressBook, config.admin);
    await deployStellarAsset(
      addressBook,
      config.admin,
      new Asset('USDC', config.admin.publicKey())
    );
    await bumpContractInstance('USDC', addressBook, config.admin);
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
