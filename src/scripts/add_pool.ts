import { BackstopContract } from '../contracts/backstop.js';
import { deployStellarAsset, deployToken, TokenContract } from '../contracts/token.js';
import { PoolFactoryContract } from '../contracts/pool_factory.js';
import { AddressBook } from '../utils/address_book.js';

import { OracleContract } from '../contracts/oracle.js';
import { Pool } from 'blend-sdk';
import { PoolContract } from '../contracts/pool.js';
import { config } from '../utils/env_config.js';
import {
  airdropAccount,
  bumpContractCode,
  bumpContractData,
  bumpContractInstance,
  restoreContractData,
} from '../utils/contract.js';
import { Address, Asset, xdr } from 'soroban-client';
import { createTxBuilder } from '../utils/tx.js';
import { randomBytes } from 'crypto';
import { CometContract } from '../contracts/comet.js';

export async function deployAndInitNewPool(addressBook: AddressBook, num_reserves: number) {
  await airdropAccount(config.admin);

  console.log('Bumping Blend Contracts');
  await bumpContractCode('backstop', addressBook, config.admin);
  await bumpContractCode('emitter', addressBook, config.admin);
  await bumpContractCode('poolFactory', addressBook, config.admin);
  await bumpContractCode('token', addressBook, config.admin);
  await bumpContractCode('lendingPool', addressBook, config.admin);
  await bumpContractInstance('oracle', addressBook, config.admin);
  await bumpContractInstance('backstop', addressBook, config.admin);
  await bumpContractInstance('emitter', addressBook, config.admin);
  await bumpContractInstance('poolFactory', addressBook, config.admin);

  console.log('Deploying and Initializing Tokens');
  for (let i = 0; i < num_reserves; i++) {
    // if (addressBook.getContractId('token' + i) != undefined) continue;
    const tkn_asset = new Asset('token' + i, config.admin.publicKey());
    await deployStellarAsset(addressBook, config.admin, tkn_asset);
    await bumpContractInstance('token' + i, addressBook, config.admin);
  }
  addressBook.writeToFile();
}
async function mockNewPool(addressBook: AddressBook, num_reserves: number) {
  const whale = config.getUser('WHALE');
  console.log('WHALE: ', whale.publicKey());

  await airdropAccount(whale);

  // Initialize Contracts
  const poolFactory = new PoolFactoryContract(
    addressBook.getContractId('poolFactory'),
    addressBook
  );
  const backstop = new BackstopContract(addressBook.getContractId('backstop'), addressBook);
  const oracle = new OracleContract(addressBook.getContractId('oracle'), addressBook);
  const tokens = [];
  for (let i = 0; i < num_reserves; i++) {
    tokens.push(new TokenContract(addressBook.getContractId('token' + i), addressBook));
  }

  // console.log('Deploy New Pool');
  // await poolFactory.deploy(
  //   config.admin.publicKey(),
  //   'testPool' + num_reserves,
  //   randomBytes(32),
  //   addressBook.getContractId('oracle'),
  //   BigInt(10000000),
  //   config.admin
  // );

  console.log('Setup new pool reserves and emissions');
  const newPool = new PoolContract(
    addressBook.getContractId('testPool' + num_reserves),
    addressBook
  );
  // const reserveMetaData: Pool.ReserveConfig = {
  //   index: 0,
  //   decimals: 7,
  //   c_factor: 900_0000,
  //   l_factor: 850_0000,
  //   util: 600_0000,
  //   max_util: 950_0000,
  //   r_one: 30_0000,
  //   r_two: 200_0000,
  //   r_three: 1_000_0000,
  //   reactivity: 1000,
  // };
  // for (let i = 0; i < num_reserves; i++) {
  //   await newPool.init_reserve(
  //     addressBook.getContractId('token' + i),
  //     reserveMetaData,
  //     config.admin
  //   );
  // }

  // const emissionMetadata: Pool.ReserveEmissionMetadata[] = [];
  // for (let i = 0; i < num_reserves; i++) {
  //   emissionMetadata.push({
  //     res_index: i, // index
  //     res_type: 0, // d_token
  //     share: BigInt(1e7) / BigInt(num_reserves), // equal share
  //   });
  // }
  // await newPool.set_emissions_config(emissionMetadata, config.admin);
  // console.log('');
  // console.log('minting blnd and usdc');
  // const blnd_asset = new Asset('BLND', config.admin.publicKey());
  // const usdc_asset = new Asset('USDC', config.admin.publicKey());
  // const blnd_token = new TokenContract(addressBook.getContractId('BLND'), addressBook);
  // const usdc_token = new TokenContract(addressBook.getContractId('USDC'), addressBook);
  // const comet = new CometContract(addressBook.getContractId('comet'), addressBook);
  // console.log('Create BLND-USDC Pool and mint ');
  // await blnd_token.classic_trustline(whale, blnd_asset, whale);
  // await blnd_token.classic_mint(whale, blnd_asset, '10000005', config.admin);
  // await usdc_token.classic_trustline(whale, usdc_asset, whale);
  // await usdc_token.classic_mint(whale, usdc_asset, '25005', config.admin);
  // const current_ledger = await config.rpc.getLatestLedger();
  // const approval_ledger = current_ledger.sequence + 6311000;
  // await blnd_token.approve(
  //   whale.publicKey(),
  //   comet.comet.contractId(),
  //   BigInt(100_000_000e7),
  //   approval_ledger,
  //   whale
  // );
  // await usdc_token.approve(
  //   whale.publicKey(),
  //   comet.comet.contractId(),
  //   BigInt(100_000_000e7),
  //   approval_ledger,
  //   whale
  // );

  // mint 100k tokens to whale
  // await comet.joinPool(
  //   BigInt(100_000e7),
  //   [BigInt(1_001_000e7), BigInt(25_001e7)],
  //   whale.publicKey(),
  //   whale
  // );
  // console.log('minted tokens');
  // const string_to_restore = Token.TokenDataKeyToXDR({
  //   tag: 'Balance',
  //   values: [whale.publicKey()],
  // }).toXDR();
  // const result = await config.rpc.getContractData(
  //   addressBook.getContractId('backstopToken'),
  //   xdr.ScVal.fromXDR(string_to_restore)
  // );
  // console.log(result.xdr);
  // const xdr_op = backstop.backstopOpBuilder.deposit({
  //   from: whale.publicKey(),
  //   pool_address: newPool.poolOpBuilder._contract.contractId(),
  //   amount: BigInt(10_000_000e7),
  // });
  // const txBuilder = await createTxBuilder(whale);
  // const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
  // txBuilder.addOperation(operation);
  // const xdr_tx = txBuilder.build().toXDR();
  // console.log('');
  // console.log(xdr_tx);
  // console.log('');
  console.log('Setup backstop for new pool');
  await backstop.deposit(
    whale.publicKey(),
    newPool.poolOpBuilder._contract.contractId(),
    BigInt(50_000e7),
    whale
  );

  console.log('Updating pool status');
  await newPool.update_status(config.admin);
  // const string_to_restore = Pool.PoolDataKeyToXDR({
  //   tag: 'PoolConfig',
  // }).toXDR();
  // await restoreContractData(
  //   'testPool4',
  //   addressBook,
  //   xdr.ScVal.fromXDR(string_to_restore),
  //   config.admin
  // );
  // await bumpContractData(
  //   'testPool4',
  //   addressBook,
  //   xdr.ScVal.fromXDR(string_to_restore),
  //   config.admin
  // );

  // const result = await config.rpc.getContractData(
  //   'CCDI7QPFCTH26MRLUXST5X5CDE2LPIVRA6EMBNGVEF6LOH4YMWK5ELOP',
  //   xdr.ScVal.fromXDR(string_to_restore)
  // );
  // console.log(result.xdr);
  console.log('Setting Asset Prices, minting tokens, and building requests');
  let poolRequests: Pool.Request[] = [];
  for (let i = 0; i < num_reserves; i++) {
    await oracle.setAssetPrices(
      [{ price: BigInt(1e7), assetId: addressBook.getContractId('token' + i) }],
      config.admin
    );
    console.log('set price for token', +i);
    const asset = new Asset('token' + i, config.admin.publicKey());
    await tokens[i].classic_trustline(whale, asset, whale);
    await tokens[i].classic_mint(whale, asset, BigInt(100e7).toString(), config.admin);
    console.log('minted token', +i);

    poolRequests.push({
      amount: BigInt(100e7),
      request_type: 2,
      address: addressBook.getContractId('token' + i),
    });
    console.log('supplying token', +i);
    await newPool.submit(
      whale.publicKey(),
      whale.publicKey(),
      whale.publicKey(),
      poolRequests,
      whale
    );
    poolRequests = [];

    console.log('borrowing token', +i);
    poolRequests.push({
      amount: BigInt(50e7),
      request_type: 4,
      address: addressBook.getContractId('token' + i),
    });
    await newPool.submit(
      whale.publicKey(),
      whale.publicKey(),
      whale.publicKey(),
      poolRequests,
      whale
    );
    poolRequests = [];
    console.log('bumping token balance');

    const scval_to_restore = xdr.ScVal.scvVec([
      xdr.ScVal.scvSymbol('Balance'),
      Address.fromString(newPool.poolOpBuilder._contract.address().toString()).toScVal(),
    ]);
    // await restoreContractData('USDC', addressBook, scval_to_restore, admin);
    await bumpContractData('token' + i, addressBook, scval_to_restore, config.admin);
  }
  addressBook.writeToFile();
  // poolRequests.push({
  //   amount: BigInt(1e7),
  //   request_type: 2,
  //   address: addressBook.getContractId('token0'),
  // });

  // console.log('Whale Supply tokens and borrowing from new pool');
  // await newPool.submit(
  //   whale.publicKey(),
  //   whale.publicKey(),
  //   whale.publicKey(),
  //   poolRequests,
  //   whale
  // );
}

const network = process.argv[2];
const addressBook = AddressBook.loadFromFile(network);
console.log(config.admin.publicKey());
// await deployAndInitNewPool(addressBook, 2);
await mockNewPool(addressBook, 2);
