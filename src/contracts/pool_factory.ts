import { Contract, Keypair, hash, xdr } from 'soroban-client';
import { AddressBook } from '../utils/address_book.js';
import {
  createDeployOperation,
  createInstallOperation,
  invokeStellarOperation,
} from '../utils/contract.js';
import { PoolFactory } from 'blend-sdk';
import { config } from '../utils/env_config.js';

export async function deployPoolFactory(contracts: AddressBook, source: Keypair) {
  const operation = createDeployOperation('poolFactory', 'poolFactory', contracts, source);
  await invokeStellarOperation(operation, source);
  return new PoolFactoryContract(contracts.getContractId('poolFactory'), contracts);
}
export async function installPoolFactory(contracts: AddressBook, source: Keypair) {
  const operation = createInstallOperation('poolFactory', contracts);
  await invokeStellarOperation(operation, source);
}

export class PoolFactoryContract {
  poolFactoryOpsBuilder: PoolFactory.PoolFactoryOpBuilder;
  contracts: AddressBook;

  constructor(address: string, contracts: AddressBook) {
    this.poolFactoryOpsBuilder = new PoolFactory.PoolFactoryOpBuilder(address);
    this.contracts = contracts;
  }

  public async initialize(pool_init_meta: PoolFactory.PoolInitMeta, source: Keypair) {
    const xdr_op = this.poolFactoryOpsBuilder.initialize({ pool_init_meta });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(operation, source);
  }

  public async deploy(
    admin: string,
    name: string,
    salt: Buffer,
    oracle: string,
    backstop_take_rate: bigint,
    source: Keypair
  ) {
    const xdr_op = this.poolFactoryOpsBuilder.deploy({
      admin,
      name,
      salt,
      oracle,
      backstop_take_rate,
    });
    const operation = xdr.Operation.fromXDR(xdr_op, 'base64');
    await invokeStellarOperation(operation, source);

    const networkId = hash(Buffer.from(config.passphrase));
    const preimage = xdr.HashIdPreimage.envelopeTypeContractId(
      new xdr.HashIdPreimageContractId({
        networkId: networkId,
        contractIdPreimage: xdr.ContractIdPreimage.contractIdPreimageFromAddress(
          new xdr.ContractIdPreimageFromAddress({
            address: xdr.ScAddress.scAddressTypeContract(
              Buffer.from(this.poolFactoryOpsBuilder._contract.contractId('hex'), 'hex')
            ),
            salt: salt,
          })
        ),
      })
    );
    const contractId = new Contract(hash(preimage.toXDR()).toString('hex')).contractId('strkey');

    this.contracts.setContractId(name, contractId);
    this.contracts.writeToFile();
  }
}
