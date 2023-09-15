import { Address, Asset, Contract, StrKey, xdr } from 'soroban-client';
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
  invokeStellarOperation,
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
  // const stellarPool = addressBook.getContractId('Stellar');
  // const starbridgePool = addressBook.getContractId('Starbridge');
  const usdc = addressBook.getContractId('USDC');
  const xlm = addressBook.getContractId('XLM');
  const blnd = addressBook.getContractId('BLND');

  // const string_to_read = Backstop.BackstopDataKeyToXDR({
  //   tag: 'NextEmis',
  // }).toXDR();
  // const result = await config.rpc.getContractData(backstop, xdr.ScVal.fromXDR(string_to_read));
  // console.log(result.xdr);
  // console.log(
  //   'what_i_called: ',
  //   StrKey.encodeContract(
  //     Buffer.from('bd23f332491f9d394382fa55a35bd4c33985acbc965d4ec8c05b7ba4289c5558', 'hex')
  //   )
  // );
  // console.log('Stellar: ', StrKey.decodeContract(stellarPool).toString('hex'));
  console.log('usdc: ', StrKey.decodeContract(usdc).toString('hex'));
  console.log('xlm: ', StrKey.decodeContract(xlm).toString('hex'));
  console.log('blnd: ', StrKey.decodeContract(blnd).toString('hex'));
  console.log('comet: ', StrKey.decodeContract(addressBook.getContractId('comet')).toString('hex'));

  console.log('admin: ', config.admin.publicKey());
  console.log('whale: ', config.getUser('WHALE').publicKey());

  // const contractInstanceXDR = xdr.LedgerKey.contractData(
  //   new xdr.LedgerKeyContractData({
  //     contract: Address.fromString(starbridgePool).toScAddress(),
  //     key: xdr.ScVal.scvLedgerKeyContractInstance(),
  //     durability: xdr.ContractDataDurability.persistent(),
  //     bodyType: xdr.ContractEntryBodyType.dataEntry(),
  //   })
  // );
  // const result = await config.rpc.getLedgerEntries([contractInstanceXDR]);
  // const string_to_read = Pool.PoolDataKeyToXDR({
  //   tag: 'Backstop',
  // }).toXDR();
  // const result = await config.rpc.getContractData(backstop, xdr.ScVal.fromXDR(string_to_read));
  // console.log(result.entries);

  // const bal_scval = xdr.ScVal.scvVec([
  //   xdr.ScVal.scvSymbol('Balance'),
  //   Address.fromString(stellarPool).toScVal(),
  // ]);
  // const result = await config.rpc.getContractData(usdc, bal_scval);
  // console.log(result.xdr);

  // const invokeArgs = {
  //   method: 'pool_eps',
  //   args: [((i) => Address.fromString(i).toScVal())(stellarPool)],
  // };
  // const operation = new Contract(backstop).call(invokeArgs.method, ...invokeArgs.args);
  // await invokeStellarOperation(operation, admin);
  // console.log('---');
  // string_to_read = Backstop.BackstopDataKeyToXDR({
  //   tag: 'PoolEPS',
  //   values: [starbridgePool],
  // }).toXDR();
  // result = await config.rpc.getContractData(backstop, xdr.ScVal.fromXDR(string_to_read));
  // console.log(result.xdr);
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
