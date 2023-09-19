import { config } from '../../utils/env_config.js';
import { airdropAccount } from '../../utils/contract.js';
import { AssetPrices, OracleContract } from '../../contracts/oracle.js';
import { TokenContract } from '../../contracts/token.js';
import { Pool, Token } from 'blend-sdk';
import { PoolContract } from '../../contracts/pool.js';
import { Asset, xdr } from 'soroban-client';
import { createTxBuilder } from '../../utils/tx.js';
import { AddressBook } from '../../utils/address_book.js';

async function setup_users(addressBook: AddressBook, num_reserves: number) {
  const frodo = config.getUser('FRODO');
  const samwise = config.getUser('SAMWISE');
  console.log('FRODO: ', frodo.publicKey());
  console.log('SAMWISE: ', samwise.publicKey());

  await airdropAccount(frodo);
  await airdropAccount(samwise);

  // Setup Users
  const tokens = [];
  for (let i = 0; i < num_reserves; i++) {
    tokens.push(new TokenContract(addressBook.getContractId('token' + i), addressBook));
  }
  const oracle = new OracleContract(addressBook.getContractId('oracle'), addressBook);
  const newPool = new PoolContract(
    addressBook.getContractId('testPool' + num_reserves),
    addressBook
  );
  console.log('Minting tokens, and building requests');
  const poolRequests: Pool.Request[] = [];
  // Samwise will borrow 7e7 of token 1 and 3 and deposit 10e7 of token 0 and 2
  for (let i = 0; i < num_reserves; i++) {
    const asset = new Asset('token' + i, config.admin.publicKey());
    await tokens[i].classic_trustline(frodo, asset, frodo);
    await tokens[i].classic_mint(frodo, asset, BigInt(100e7).toString(), config.admin);
    await tokens[i].classic_trustline(samwise, asset, samwise);
    await tokens[i].classic_mint(samwise, asset, BigInt(100e7).toString(), config.admin);
    console.log('frodo depositing in pool' + i);
    poolRequests.push({
      amount: BigInt(50e7),
      request_type: 2,
      address: addressBook.getContractId('token' + i),
    });
    await newPool.submit(
      frodo.publicKey(),
      frodo.publicKey(),
      frodo.publicKey(),
      poolRequests,
      frodo
    );
    poolRequests.pop();
    if (i % 2 == 0) {
      poolRequests.push({
        amount: BigInt(10e7),
        request_type: 2,
        address: addressBook.getContractId('token' + i),
      });
    } else {
      poolRequests.push({
        amount: BigInt(7e7),
        request_type: 4,
        address: addressBook.getContractId('token' + i),
      });
    }
    console.log('Sam Supply tokens and borrowing from new pool' + i);
    await newPool.submit(
      samwise.publicKey(),
      samwise.publicKey(),
      samwise.publicKey(),
      poolRequests,
      samwise
    );
    poolRequests.pop();
  }
}

async function create_liquidation(addressBook: AddressBook, num_reserves: number) {
  const frodo = config.getUser('FRODO');
  const samwise = config.getUser('SAMWISE');

  const tokens = [];
  for (let i = 0; i < num_reserves; i++) {
    tokens.push(new TokenContract(addressBook.getContractId('token' + i), addressBook));
  }
  const oracle = new OracleContract(addressBook.getContractId('oracle'), addressBook);
  const newPool = new PoolContract(
    addressBook.getContractId('testPool' + num_reserves),
    addressBook
  );
  //check sam positions
  console.log('checking sam positions');
  const string_to_restore = Pool.PoolDataKeyToXDR({
    tag: 'Positions',
    values: [samwise.publicKey()],
  }).toXDR();
  const result = await config.rpc.getContractData(
    addressBook.getContractId('testPool' + num_reserves),
    xdr.ScVal.fromXDR(string_to_restore)
  );
  console.log(result.xdr);

  // Liquidate Samwise
  let liquidation_cost_cpu = BigInt(0);
  let liquidation_cost_mem = BigInt(0);
  const collateral_assets: AssetPrices[] = [
    { price: BigInt(9e6), assetId: addressBook.getContractId('token0') },
    //{ price: BigInt(9e6), assetId: addressBook.getContractId('token2') },
  ];
  console.log('setting prices');
  await oracle.setAssetPrices(collateral_assets, frodo);
  const pool_op_builder: Pool.PoolOpBuilder = new Pool.PoolOpBuilder(
    addressBook.getContractId('testPool' + num_reserves)
  );
  const new_auction_op = pool_op_builder.new_liquidation_auction({
    user: samwise.publicKey(),
    percent_liquidated: BigInt(30),
  });
  console.log('simulating create auction');
  const operation = xdr.Operation.fromXDR(new_auction_op, 'base64');
  const tx_builder = await createTxBuilder(frodo);
  console.log('created tx builder');
  tx_builder.addOperation(operation);
  const prepped_tx = await config.rpc.prepareTransaction(tx_builder.build(), config.passphrase);
  prepped_tx.sign(frodo);
  console.log('prepped tx');
  const simmed_liq = await config.rpc.simulateTransaction(prepped_tx);
  console.log(simmed_liq);
  liquidation_cost_cpu += BigInt(simmed_liq.cost.cpuInsns);
  liquidation_cost_mem += BigInt(simmed_liq.cost.memBytes);
  console.log('liquidation create cost cpu: ', liquidation_cost_cpu);
  console.log('liquidation create cost mem: ', liquidation_cost_mem);
  // create auction
  console.log('Creating Auction');
  await newPool.new_liquidation_auction(samwise.publicKey(), BigInt(50e7), frodo);
  const current_block = await config.rpc.getLatestLedger();
  console.log('current block: ', current_block);
  return current_block.sequence + 1;
}

async function fill_liquidation(
  addressBook: AddressBook,
  num_reserves: number,
  start_block: number
) {
  const frodo = config.getUser('FRODO');
  const samwise = config.getUser('SAMWISE');
  const tokens = [];
  for (let i = 0; i < num_reserves; i++) {
    tokens.push(new TokenContract(addressBook.getContractId('token' + i), addressBook));
  }
  const newPool = new PoolContract(
    addressBook.getContractId('testPool' + num_reserves),
    addressBook
  );
  //get auction
  const target_block = start_block + 200;
  console.log('letting auction scale');
  while ((await config.rpc.getLatestLedger()).sequence < target_block) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    console.log(
      'waiting for auction to scale to ' + target_block + ' current block: ',
      (await config.rpc.getLatestLedger()).sequence
    );
    await delay(2500);
  }
  console.log('simulating auction fill auction');

  // Liquidate Samwise
  let liquidation_cost_cpu = BigInt(0);
  let liquidation_cost_mem = BigInt(0);

  const pool_op_builder: Pool.PoolOpBuilder = new Pool.PoolOpBuilder(
    addressBook.getContractId('testPool' + num_reserves)
  );
  const fill_auction_op = pool_op_builder.fill_auction({
    from: frodo.publicKey(),
    auction_type: 0,
    user: samwise.publicKey(),
  });
  const operation = xdr.Operation.fromXDR(fill_auction_op, 'base64');
  const tx_builder = await createTxBuilder(frodo);
  tx_builder.addOperation(operation);
  const prepped_tx = await config.rpc.prepareTransaction(tx_builder.build(), config.passphrase);
  prepped_tx.sign(frodo);

  const simmed_liq = await config.rpc.simulateTransaction(prepped_tx);
  console.log(simmed_liq);
  liquidation_cost_cpu += BigInt(simmed_liq.cost.cpuInsns);
  liquidation_cost_mem += BigInt(simmed_liq.cost.memBytes);
  console.log('liquidation fill cost cpu: ', liquidation_cost_cpu);
  console.log('liquidation fill cost mem: ', liquidation_cost_mem);

  // fill auction
  console.log('Filling Auction');
  await newPool.fill_auction(frodo.publicKey(), 0, samwise.publicKey(), frodo);
}
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const network = process.argv[2];
const addressBook = AddressBook.loadFromFile(network);
console.log(config.admin.publicKey());
await setup_users(addressBook, 2);
// const start_block = await create_liquidation(addressBook, 2);
// await fill_liquidation(addressBook, 2, start_block);
