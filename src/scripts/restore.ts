import { Address, Asset, xdr } from 'soroban-client';
import { AddressBook } from '../utils/address_book';
import { deployBackstop, installBackstop } from '../contracts/backstop';
import { installToken, deployToken, deployStellarAsset } from '../contracts/token';
import { deployEmitter, installEmitter } from '../contracts/emitter';
import { deployPoolFactory, installPoolFactory } from '../contracts/pool_factory';
import { deployMockOracle, installMockOracle } from '../contracts/oracle';
import { PoolFactory } from 'blend-sdk';
import {
  airdropAccount,
  bumpContractCode,
  bumpContractData,
  bumpContractInstance,
  restoreContractData,
} from '../utils/contract';
import { installPool } from '../contracts/pool';
import { config } from '../utils/env_config';
import { Backstop, Pool } from 'blend-sdk';
import * as fs from 'fs';

export async function restore(addressBook: AddressBook) {
  const admin = config.admin;

  // contracts to restore and/or bump
  const backstop = addressBook.getContractId('backstop');
  const stellarPool = addressBook.getContractId('Stellar');
  const usdc = addressBook.getContractId('USDC');
  const xlm = addressBook.getContractId('XLM');

  // restore and bump reward zone
  // const string_to_restore = Backstop.BackstopDataKeyToXDR({ tag: 'RewardZone' }).toXDR();
  // const string_to_restore = Backstop.BackstopDataKeyToXDR({
  //   tag: 'PoolBalance',
  //   values: [stellarPool],
  // }).toXDR();
  // const string_to_restore = Pool.PoolDataKeyToXDR({ tag: 'Admin' }).toXDR();
  // const string_to_restore = Pool.PoolDataKeyToXDR({ tag: 'ResData', values: [xlm] }).toXDR();
  // const result = await config.rpc.getContractData(
  //   stellarPool,
  //   xdr.ScVal.fromXDR(string_to_restore)
  // );
  // console.log(result.xdr);
  // const contractCodeXDR = xdr.LedgerKey.contractCode(
  //   new xdr.LedgerKeyContractCode({
  //     hash: Buffer.from('bb0edfb2d5cf30814a6f928776b0d275b4702042866908d94a1ab722ba86b20c', 'hex'),
  //     bodyType: xdr.ContractEntryBodyType.dataEntry(),
  //   })
  // );
  // const result = await config.rpc.getLedgerEntries([contractCodeXDR]);
  // const entry = result.entries;
  // if (entry !== null) {
  //   const entry_xdr = entry[0].xdr;
  //   const ledgerEntryData = xdr.LedgerEntryData.fromXDR(entry_xdr, 'base64');
  //   const wasm_buffer = ledgerEntryData.contractCode().body().code();
  //   fs.writeFileSync('/temp_folder/backstop.wasm', wasm_buffer);
  //   const wasmHash = hash(wasm_buffer);
  //   console.log('done');
  // }
  const scval_to_restore = xdr.ScVal.scvVec([
    xdr.ScVal.scvSymbol('Balance'),
    Address.fromString(stellarPool).toScVal(),
  ]);
  // await restoreContractData('USDC', addressBook, scval_to_restore, admin);
  await bumpContractData('USDC', addressBook, scval_to_restore, admin);
  // await restoreContractData('XLM', addressBook, scval_to_restore, admin);
  await bumpContractData('XLM', addressBook, scval_to_restore, admin);
}

const network = process.argv[2];
const addressBook = AddressBook.loadFromFile(network);
console.log(config.admin.publicKey());
await restore(addressBook);
/*

'Contract data not found. Contract: CD6CDRUWP7NJI7ABE2K5DBOJ66F4XF7DQDDICHIS6S2SL5X3KT42BDS2, Key: AAAADwAAAAdSZXNMaXN0AA==, Durability: persistent';
"Contract data not found. Contract: CD6CDRUWP7NJI7ABE2K5DBOJ66F4XF7DQDDICHIS6S2SL5X3KT42BDS2, Key: AAAAEAAAAAEAAAACAAAADwAAAAlSZXNDb25maWcAAAAAAAASAAAAAX3B7N+TNRmfyZGNvgxzLOHRFGqo8pzJw2CvxqdHrpTf, Durability: persistent"
"Contract data not found. Contract: CD6CDRUWP7NJI7ABE2K5DBOJ66F4XF7DQDDICHIS6S2SL5X3KT42BDS2, Key: AAAAEAAAAAEAAAACAAAADwAAAAdSZXNEYXRhAAAAABIAAAABfcHs35M1GZ/JkY2+DHMs4dEUaqjynMnDYK/Gp0eulN8=, Durability: persistent"
*/
