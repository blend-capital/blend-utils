import { config } from '../utils/env_config.js';
import { AddressBook } from '../utils/address_book.js';
import { OracleClient } from '../external/oracle.js';

async function set_oracle_prices(addressBook: AddressBook) {
  // Initialize Contracts
  const oracle = new OracleClient(addressBook.getContractId('oraclemock'));

  await oracle.setPriceStable(
    [BigInt(1e7), BigInt(0.15e7), BigInt(2000e7), BigInt(36000e7)],
    config.admin
  );
}

const network = process.argv[2];
const addressBook = AddressBook.loadFromFile(network);
await set_oracle_prices(addressBook);
