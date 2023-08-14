import { Keypair, StrKey, hash, xdr } from 'soroban-client';
import { AddressBook } from '../utils/address_book.js';
import {
  bumpContractInstance,
  createDeployOperation,
  createInstallOperation,
  invokeStellarOperation,
} from '../utils/contract.js';
import { PoolFactory } from 'blend-sdk';
import { config } from '../utils/env_config.js';

export async function installPoolFactory(contracts: AddressBook, source: Keypair) {
  const operation = createInstallOperation('poolFactory', contracts);
  await invokeStellarOperation(operation, source);
}

export async function deployPoolFactory(contracts: AddressBook, source: Keypair) {
  const operation = createDeployOperation('poolFactory', 'poolFactory', contracts, source);
  await invokeStellarOperation(operation, source);
  return new PoolFactoryContract(contracts.getContractId('poolFactory'), contracts);
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
              StrKey.decodeContract(this.poolFactoryOpsBuilder._contract.contractId())
            ),
            salt: salt,
          })
        ),
      })
    );
    const contractId = StrKey.encodeContract(hash(preimage.toXDR()));
    this.contracts.setContractId(name, contractId);
    this.contracts.writeToFile();
    await bumpContractInstance(name, this.contracts, source);
  }
}
