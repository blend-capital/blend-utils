import { PoolContract } from '../contracts/pool';
import { Pool } from 'blend-sdk';
import { config } from '../utils/env_config';
import { AddressBook } from '../utils/address_book';

async function mock(addressBook: AddressBook) {
  const whale = config.getUser('WHALE');
  console.log('WHALE: ', whale.publicKey());

  const pool = new PoolContract(addressBook.getContractId('Stellar'), addressBook);
  const requests: Pool.Request[] = [
    {
      amount: BigInt(1000e7),
      request_type: 2,
      address: addressBook.getContractId('USDC'),
    },
    {
      amount: BigInt(1000e7),
      request_type: 2,
      address: addressBook.getContractId('XLM'),
    },
    {
      amount: BigInt(700e7),
      request_type: 4,
      address: addressBook.getContractId('USDC'),
    },
    {
      amount: BigInt(500e7),
      request_type: 4,
      address: addressBook.getContractId('XLM'),
    },
  ];
  await pool.submit(whale.publicKey(), whale.publicKey(), whale.publicKey(), requests, whale);
}

const network = process.argv[2];
const addressBook = AddressBook.loadFromFile(network);
await mock(addressBook);
