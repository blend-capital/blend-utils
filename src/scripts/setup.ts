import { Asset } from 'soroban-client';
import { AddressBook } from '../utils/address_book';
import { deployBackstop, installBackstop } from '../contracts/backstop';
import { installToken, deployToken, deployStellarAsset } from '../contracts/token';
import { deployEmitter, installEmitter } from '../contracts/emitter';
import { deployPoolFactory, installPoolFactory } from '../contracts/pool_factory';
import { deployMockOracle, installMockOracle } from '../contracts/oracle';
import { PoolFactory } from 'blend-sdk';
import { airdropAccount } from '../utils/contract';
import { installPool } from '../contracts/pool';
import { config } from '../utils/env_config';

export async function deployAndInitContracts(addressBook: AddressBook) {
  await airdropAccount(config.admin);

  console.log('Installing Blend Contracts');
  await installBackstop(addressBook, config.admin);
  await installEmitter(addressBook, config.admin);
  await installPoolFactory(addressBook, config.admin);
  await installToken(addressBook, config.admin, 'token');
  await installPool(addressBook, config.admin);

  console.log('Deploying and Initializing Tokens');
  const blnd = await deployToken(addressBook, config.admin, 'token', 'BLND');
  await blnd.initialize(
    config.admin.publicKey(),
    7,
    Buffer.from('BLND Token'),
    Buffer.from('BLND'),
    config.admin
  );

  if (network != 'mainnet') {
    await installMockOracle(addressBook, config.admin);
    await deployMockOracle(addressBook, config.admin);
    const wbtc = await deployToken(addressBook, config.admin, 'token', 'WBTC');
    await wbtc.initialize(
      config.admin.publicKey(),
      7,
      Buffer.from('WBTC Token'),
      Buffer.from('WBTC'),
      config.admin
    );
    const weth = await deployToken(addressBook, config.admin, 'token', 'WETH');
    await weth.initialize(
      config.admin.publicKey(),
      7,
      Buffer.from('WETH Token'),
      Buffer.from('WETH'),
      config.admin
    );
    const blndusdc = await deployToken(addressBook, config.admin, 'token', 'backstopToken');
    await blndusdc.initialize(
      config.admin.publicKey(),
      7,
      Buffer.from('BLND-USDC Token'),
      Buffer.from('BLND-USDC'),
      config.admin
    );

    await deployStellarAsset(addressBook, config.admin, Asset.native());
    await deployStellarAsset(
      addressBook,
      config.admin,
      new Asset('USDC', config.admin.publicKey())
    );
  }

  console.log('Deploying and Initializing Blend addressBook');
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
}

const network = process.argv[2];
const addressBook = AddressBook.loadFromFile(network);
await deployAndInitContracts(addressBook);
