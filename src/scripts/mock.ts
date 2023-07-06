import { Asset, Keypair, Server } from 'soroban-client';
import config, { Contracts, getUser } from '../utils/config';
import { BackstopContract } from '../contracts/backstop';
import { BlendTokenContract } from '../contracts/token';
import { PoolFactoryContract } from '../contracts/pool_factory';
import { OracleContract } from '../contracts/oracle';
import { airdropAccount } from '../utils/contract';
import { PoolContract } from '../contracts/pool';
import { randomBytes } from 'crypto';
import { Pool } from 'blend-sdk';

async function mock(stellarRpc: Server, contracts: Contracts, source: Keypair) {
  const frodo = Keypair.fromSecret(getUser('frodo'));

  await airdropAccount(stellarRpc, frodo);

  // Initialize Contracts
  const blnd = new BlendTokenContract(contracts.getContractId('BLND'), stellarRpc, contracts);
  const poolFactory = new PoolFactoryContract(
    contracts.getContractId('poolFactory'),
    stellarRpc,
    contracts
  );
  const backstop = new BackstopContract(contracts.getContractId('backstop'), stellarRpc, contracts);
  const backstopToken = new BlendTokenContract(
    contracts.getContractId('backstopToken'),
    stellarRpc,
    contracts
  );
  const oracle = new OracleContract(contracts.getContractId("oracle"), stellarRpc, contracts);
  const weth_token = new BlendTokenContract(contracts.getContractId('WETH'), stellarRpc, contracts);
  const wbtc_token = new BlendTokenContract(contracts.getContractId('WBTC'), stellarRpc, contracts);
  const usdc_token = new BlendTokenContract(contracts.getContractId('USDC'), stellarRpc, contracts);
  const xlm = new BlendTokenContract(contracts.getContractId('XLM'), stellarRpc, contracts);


  console.log('Mint 10m to admin and transfer blnd admin to emitter');
  await blnd.mint(source.publicKey(), BigInt(10_000_000e7), source);
  await blnd.new_admin(contracts.getContractId('emitter'), source);

  console.log('Deploy Starbridge Pool');
  await poolFactory.deploy(
    source.publicKey(),
    'Starbridge',
    randomBytes(32),
    contracts.getContractId('oracle'),
    BigInt(10000000),
    source
  );

  console.log('Setup Starbridge reserves and emissions');
  const starBridgePool = new PoolContract(
    contracts.getContractId('Starbridge'),
    stellarRpc,
    contracts
  );
  const xlmReserveMetaData: Pool.ReserveMetadata = {
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
    source.publicKey(),
    contracts.getContractId('XLM'),
    xlmReserveMetaData,
    source
  );
  const wethReserveMetaData: Pool.ReserveMetadata = {
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
    source.publicKey(),
    contracts.getContractId('WETH'),
    wethReserveMetaData,
    source
  );
  const wbtcReserveMetaData: Pool.ReserveMetadata = {
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
    source.publicKey(),
    contracts.getContractId('WBTC'),
    wbtcReserveMetaData,
    source
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
  await starBridgePool.set_emissions_config(source.publicKey(), emissionMetadata, source);

  console.log('Setup backstop for Starbridge');
  await backstopToken.mint(frodo.publicKey(), BigInt(1_000_000e7), source);
  await backstop.deposit(
    frodo.publicKey(),
    starBridgePool.poolOpBuilder._contract.contractId('strkey'),
    BigInt(1_000_000e7),
    frodo
  );
  await starBridgePool.update_state(source);
  await backstop.add_reward(
    contracts.getContractId('Starbridge'),
    contracts.getContractId('Starbridge'),
    source
  );

  console.log('Deploy Stellar Pool');
  await poolFactory.deploy(
    source.publicKey(),
    'Stellar',
    randomBytes(32),
    contracts.getContractId('oracle'),
    BigInt(10000000),
    source
  );

  console.log('Setup Stellar reserves and emissions');
  const stellarPool = new PoolContract(contracts.getContractId('Stellar'), stellarRpc, contracts);
  const stellarPoolXlmReserveMetaData: Pool.ReserveMetadata = {
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
    source.publicKey(),
    contracts.getContractId('XLM'),
    stellarPoolXlmReserveMetaData,
    source
  );
  const stellarPoolUsdcReserveMetaData: Pool.ReserveMetadata = {
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
    source.publicKey(),
    contracts.getContractId('USDC'),
    stellarPoolUsdcReserveMetaData,
    source
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
  await stellarPool.set_emissions_config(source.publicKey(), stellarPoolEmissionMetadata, source);

  console.log('Setup backstop for Stellar');
  await backstopToken.mint(frodo.publicKey(), BigInt(1_000_000e7), source);
  await backstop.deposit(
    frodo.publicKey(),
    stellarPool.poolOpBuilder._contract.contractId('strkey'),
    BigInt(1_000_000e7),
    frodo
  );
  await stellarPool.update_state(source);
  await backstop.add_reward(
    contracts.getContractId('Stellar'),
    contracts.getContractId('Stellar'),
    source
  );

  console.log('Distribute to pools');
  await backstop.distribute(source);
  await starBridgePool.update_emissions(source);
  await stellarPool.update_emissions(source);

  console.log('Setting Asset Prices');
  await oracle.setAssetPrices(
    [
      { price: BigInt(1e7), assetId: contracts.getContractId('USDC') },
      { price: BigInt(30_000e7), assetId: contracts.getContractId('WBTC') },
      { price: BigInt(0.1e7), assetId: contracts.getContractId('XLM') },
      { price: BigInt(2000e7), assetId: contracts.getContractId('WETH') },
      { price: BigInt(0.5e7), assetId: contracts.getContractId('backstopToken') },
    ],
    source
  );

  console.log('Minting tokens to frodo');
  await wbtc_token.mint(frodo.publicKey(), BigInt(10e7), source);
  await weth_token.mint(frodo.publicKey(), BigInt(50e7), source);
  await usdc_token.mint_stellar_asset(
    frodo,
    source,
    new Asset('USDC', source.publicKey()),
    '200000'
  );

  console.log('Frodo Supply tokens and borrowing from Starbridge pool');
  await starBridgePool.supply(
    frodo.publicKey(),
    wbtc_token.tokenOpBuilder._contract.contractId('strkey'),
    BigInt(1e7),
    frodo
  );
  await starBridgePool.supply(
    frodo.publicKey(),
    weth_token.tokenOpBuilder._contract.contractId('strkey'),
    BigInt(10e7),
    frodo
  );
  await starBridgePool.supply(
    frodo.publicKey(),
    xlm.tokenOpBuilder._contract.contractId('strkey'),
    BigInt(4000e7),
    frodo
  );

  await starBridgePool.borrow(
    frodo.publicKey(),
    wbtc_token.tokenOpBuilder._contract.contractId('strkey'),
    BigInt(6e6),
    frodo.publicKey(),
    frodo
  );

  console.log('Frodo Supply tokens and borrowing from Stellar pool');
  await stellarPool.supply(
    frodo.publicKey(),
    usdc_token.tokenOpBuilder._contract.contractId('strkey'),
    BigInt(10_000e7),
    frodo
  );
  await stellarPool.supply(
    frodo.publicKey(),
    xlm.tokenOpBuilder._contract.contractId('strkey'),
    BigInt(4000e7),
    frodo
  );
  await stellarPool.borrow(
    frodo.publicKey(),
    usdc_token.tokenOpBuilder._contract.contractId('strkey'),
    BigInt(9000e7),
    frodo.publicKey(),
    frodo
  );

  await stellarPool.borrow(
    frodo.publicKey(),
    xlm.tokenOpBuilder._contract.contractId('strkey'),
    BigInt(2000e7),
    frodo.publicKey(),
    frodo
  );
}

const network = process.argv[2];
const contracts = Contracts.loadFromFile(network);
const stellarRpc = new Server(config.rpc, {
  allowHttp: true,
});
const admin = config.admin;
const bombadil = Keypair.fromSecret(admin);
mock(stellarRpc, contracts, bombadil);

