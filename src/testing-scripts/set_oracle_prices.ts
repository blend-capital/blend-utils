import { config } from '../utils/env_config.js';
import { AddressBook } from '../utils/address_book.js';
import { OracleClient } from '../external/oracle.js';
import { Address } from 'stellar-sdk';

async function set_oracle_prices(addressBook: AddressBook) {
  // Initialize Contracts
  const oracle = new OracleClient(addressBook.getContractId('oraclemock'));
  // await oracle.setData(
  //   Address.fromString(config.admin.publicKey()),
  //   {
  //     tag: 'Other',
  //     values: ['USD'],
  //   },
  //   [
  //     {
  //       tag: 'Stellar',
  //       values: [Address.fromString(addressBook.getContractId('USDC'))],
  //     },
  //     {
  //       tag: 'Stellar',
  //       values: [Address.fromString(addressBook.getContractId('XLM'))],
  //     },
  //     {
  //       tag: 'Stellar',
  //       values: [Address.fromString(addressBook.getContractId('wETH'))],
  //     },
  //     {
  //       tag: 'Stellar',
  //       values: [Address.fromString(addressBook.getContractId('wBTC'))],
  //     },
  //     {
  //       tag: 'Stellar',
  //       values: [Address.fromString(addressBook.getContractId('BLND'))],
  //     },
  //   ],
  //   7,
  //   300,
  //   config.admin
  // );
  await oracle.setPriceStable(
    [BigInt(1e7), BigInt(0.15e7), BigInt(2000e7), BigInt(36000e7), BigInt(100_0000)],
    config.admin
  );
}

const network = process.argv[2];
const addressBook = AddressBook.loadFromFile(network);
await set_oracle_prices(addressBook);
