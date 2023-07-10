import { Asset } from 'soroban-client';
import { BackstopContract } from '../contracts/backstop';
import { BlendTokenContract } from '../contracts/token';
import { PoolFactoryContract } from '../contracts/pool_factory';
import { OracleContract } from '../contracts/oracle';
import { airdropAccount } from '../utils/contract';
import { PoolContract } from '../contracts/pool';
import { randomBytes } from 'crypto';
import { Pool } from 'blend-sdk';
import { config } from '../utils/env_config';
import { AddressBook } from '../utils/address_book';

async function mock(addressBook: AddressBook) {
  const frodo = config.getUser('FRODO');

  await airdropAccount(frodo);

  // Initialize Contracts
  const blnd = new BlendTokenContract(addressBook.getContractId('BLND'), addressBook);
  const poolFactory = new PoolFactoryContract(
    addressBook.getContractId('poolFactory'),
    addressBook
  );
  const backstop = new BackstopContract(addressBook.getContractId('backstop'), addressBook);
  const backstopToken = new BlendTokenContract(
    addressBook.getContractId('backstopToken'),
    addressBook
  );
  const oracle = new OracleContract(addressBook.getContractId('oracle'), addressBook);
  const weth_token = new BlendTokenContract(addressBook.getContractId('WETH'), addressBook);
  const wbtc_token = new BlendTokenContract(addressBook.getContractId('WBTC'), addressBook);
  const usdc_token = new BlendTokenContract(addressBook.getContractId('USDC'), addressBook);

  console.log('Mint 10m to admin and transfer blnd admin to emitter');
  await blnd.mint(config.admin.publicKey(), BigInt(10_000_000e7), config.admin);
  await blnd.new_admin(addressBook.getContractId('emitter'), config.admin);

  console.log('Deploy Starbridge Pool');
  await poolFactory.deploy(
    config.admin.publicKey(),
    'Starbridge',
    randomBytes(32),
    addressBook.getContractId('oracle'),
    BigInt(10000000),
    config.admin
  );

  console.log('Setup Starbridge pool reserves and emissions');
  const starBridgePool = new PoolContract(addressBook.getContractId('Starbridge'), addressBook);
  const xlmReserveMetaData: Pool.ReserveConfig = {
    index: 0,
    decimals: 7,
    c_factor: 900_0000,
    l_factor: 850_0000,
    util: 600_0000,
    max_util: 950_0000,
    r_one: 30_0000,
    r_two: 200_0000,
    r_three: 1_000_0000,
    reactivity: 1000,
  };
  await starBridgePool.init_reserve(
    config.admin.publicKey(),
    addressBook.getContractId('XLM'),
    xlmReserveMetaData,
    config.admin
  );
  const wethReserveMetaData: Pool.ReserveConfig = {
    index: 1,
    decimals: 7,
    c_factor: 750_0000,
    l_factor: 750_0000,
    util: 650_0000,
    max_util: 950_0000,
    r_one: 50_0000,
    r_three: 1_500_0000,
    r_two: 500_0000,
    reactivity: 1000,
  };
  await starBridgePool.init_reserve(
    config.admin.publicKey(),
    addressBook.getContractId('WETH'),
    wethReserveMetaData,
    config.admin
  );

  const wbtcReserveMetaData: Pool.ReserveConfig = {
    index: 2,
    decimals: 7,
    c_factor: 900_0000,
    l_factor: 900_0000,
    util: 750_0000,
    max_util: 950_0000,
    r_one: 50_0000,
    r_three: 1_500_0000,
    r_two: 500_0000,
    reactivity: 1000,
  };
  await starBridgePool.init_reserve(
    config.admin.publicKey(),
    addressBook.getContractId('WBTC'),
    wbtcReserveMetaData,
    config.admin
  );

  const emissionMetadata: Pool.ReserveEmissionMetadata[] = [
    {
      res_index: 1, // WETH
      res_type: 0, // d_token
      share: BigInt(0.5e7), // 50%
    },
    {
      res_index: 2, // WBTC
      res_type: 1, // b_token
      share: BigInt(0.5e7), // 50%
    },
  ];
  await starBridgePool.set_emissions_config(
    config.admin.publicKey(),
    emissionMetadata,
    config.admin
  );

  console.log('Setup backstop for Starbridge pool');
  await backstopToken.mint(frodo.publicKey(), BigInt(1_000_000e7), config.admin);
  await backstop.deposit(
    frodo.publicKey(),
    starBridgePool.poolOpBuilder._contract.contractId('strkey'),
    BigInt(1_000_000e7),
    frodo
  );
  await starBridgePool.update_status(config.admin);
  await backstop.add_reward(
    addressBook.getContractId('Starbridge'),
    addressBook.getContractId('Starbridge'),
    config.admin
  );

  console.log('Deploy Stellar Pool');
  await poolFactory.deploy(
    config.admin.publicKey(),
    'Stellar',
    randomBytes(32),
    addressBook.getContractId('oracle'),
    BigInt(10000000),
    config.admin
  );

  console.log('Setup Stellar pool reserves and emissions');
  const stellarPool = new PoolContract(addressBook.getContractId('Stellar'), addressBook);
  const stellarPoolXlmReserveMetaData: Pool.ReserveConfig = {
    index: 0,
    decimals: 7,
    c_factor: 900_0000,
    l_factor: 850_0000,
    util: 600_0000,
    max_util: 950_0000,
    r_one: 30_0000,
    r_two: 200_0000,
    r_three: 1_000_0000,
    reactivity: 1000,
  };
  await stellarPool.init_reserve(
    config.admin.publicKey(),
    addressBook.getContractId('XLM'),
    stellarPoolXlmReserveMetaData,
    config.admin
  );
  const stellarPoolUsdcReserveMetaData: Pool.ReserveConfig = {
    index: 1,
    decimals: 7,
    c_factor: 750_0000,
    l_factor: 750_0000,
    util: 650_0000,
    max_util: 950_0000,
    r_one: 50_0000,
    r_three: 1_500_0000,
    r_two: 500_0000,
    reactivity: 1000,
  };
  await stellarPool.init_reserve(
    config.admin.publicKey(),
    addressBook.getContractId('USDC'),
    stellarPoolUsdcReserveMetaData,
    config.admin
  );

  const stellarPoolEmissionMetadata: Pool.ReserveEmissionMetadata[] = [
    {
      res_index: 0, // WETH
      res_type: 0, // d_token
      share: BigInt(0.7e7), // 50%
    },
    {
      res_index: 1, // WBTC
      res_type: 1, // d_token
      share: BigInt(0.3e7), // 50%
    },
  ];
  await stellarPool.set_emissions_config(
    config.admin.publicKey(),
    stellarPoolEmissionMetadata,
    config.admin
  );

  console.log('Setup backstop for Stellar pool');
  await backstopToken.mint(frodo.publicKey(), BigInt(1_000_000e7), config.admin);
  await backstop.deposit(
    frodo.publicKey(),
    stellarPool.poolOpBuilder._contract.contractId('strkey'),
    BigInt(1_000_000e7),
    frodo
  );
  await stellarPool.update_status(config.admin);
  await backstop.add_reward(
    addressBook.getContractId('Stellar'),
    addressBook.getContractId('Stellar'),
    config.admin
  );

  console.log('Distribute to pools');
  await backstop.distribute(config.admin);
  await starBridgePool.update_emissions(config.admin);
  await stellarPool.update_emissions(config.admin);

  console.log('Setting Asset Prices');
  await oracle.setAssetPrices(
    [
      { price: BigInt(1e7), assetId: addressBook.getContractId('USDC') },
      { price: BigInt(30_000e7), assetId: addressBook.getContractId('WBTC') },
      { price: BigInt(0.1e7), assetId: addressBook.getContractId('XLM') },
      { price: BigInt(2000e7), assetId: addressBook.getContractId('WETH') },
      { price: BigInt(0.5e7), assetId: addressBook.getContractId('backstopToken') },
    ],
    config.admin
  );

  console.log('Minting tokens to frodo');
  await wbtc_token.mint(frodo.publicKey(), BigInt(10e7), config.admin);
  await weth_token.mint(frodo.publicKey(), BigInt(50e7), config.admin);
  await usdc_token.mint_stellar_asset(
    frodo,
    config.admin,
    new Asset('USDC', config.admin.publicKey()),
    '200000'
  );

  const starbridgeRequests: Pool.Request[] = [
    {
      amount: BigInt(4000e7),
      request_type: 2,
      reserve_index: 0,
    },
    {
      amount: BigInt(10e7),
      request_type: 2,
      reserve_index: 1,
    },
    {
      amount: BigInt(1e7),
      request_type: 4,
      reserve_index: 1,
    },
  ];
  console.log('Frodo Supply tokens and borrowing from Starbridge pool');

  await starBridgePool.submit(
    frodo.publicKey(),
    frodo.publicKey(),
    frodo.publicKey(),
    starbridgeRequests,
    frodo
  );

  console.log('Frodo Supply tokens and borrowing from Stellar pool');
  const stellarRequests: Pool.Request[] = [
    {
      amount: BigInt(10000e7),
      request_type: 2,
      reserve_index: 1,
    },
    {
      amount: BigInt(4000e7),
      request_type: 2,
      reserve_index: 0,
    },
    {
      amount: BigInt(5000e7),
      request_type: 4,
      reserve_index: 1,
    },
    {
      amount: BigInt(2000),
      request_type: 4,
      reserve_index: 0,
    },
  ];
  stellarPool.submit(
    frodo.publicKey(),
    frodo.publicKey(),
    frodo.publicKey(),
    stellarRequests,
    frodo
  );
}

const network = process.argv[2];
const addressBook = AddressBook.loadFromFile(network);
await mock(addressBook);
