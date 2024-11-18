import { Network, Pool, PositionsEstimate } from '@blend-capital/blend-sdk';
import { addressBook } from '../utils/address-book.js';
import { config } from '../utils/env_config.js';

const replacer = (key: any, value: any) => {
  if (value instanceof Map) {
    return Array.from(value.entries());
  } else if (typeof value == 'bigint') {
    return value.toString() + 'n';
  } else {
    return value;
  }
};

const network: Network = {
  rpc: config.rpc.serverURL.toString(),
  passphrase: config.passphrase,
  opts: { allowHttp: true },
};

const auctioneer = config.getUser('AUCT');
const whale = config.getUser('WHALE');
const samwise = config.getUser('SAMWISE');
const poolId = addressBook.getContractId('Auction');

const pool = await Pool.load(network, poolId);
console.log('POOL');
console.log(JSON.stringify(pool, replacer, 2));
console.log('');

const poolOracle = await pool.loadOracle();
console.log('POOL ORACLE');
console.log(JSON.stringify(poolOracle, replacer, 2));
console.log('');

const whaleData = await pool.loadUser(whale.publicKey());
const whaleEst = PositionsEstimate.build(pool, poolOracle, whaleData.positions);
console.log('WHALE');
console.log(JSON.stringify(whaleData, replacer, 2));
console.log(JSON.stringify(whaleEst, replacer, 2));
console.log('');

const samwiseData = await pool.loadUser(samwise.publicKey());
const samwiseEst = PositionsEstimate.build(pool, poolOracle, samwiseData.positions);
console.log('SAMWISE');
console.log(JSON.stringify(samwiseData, replacer, 2));
console.log(JSON.stringify(samwiseEst, replacer, 2));
console.log('');

const auctioneerData = await pool.loadUser(auctioneer.publicKey());
const auctioneerEst = PositionsEstimate.build(pool, poolOracle, auctioneerData.positions);
console.log('AUCTIONEER');
console.log(JSON.stringify(auctioneerData, replacer, 2));
console.log(JSON.stringify(auctioneerEst, replacer, 2));
console.log('');
