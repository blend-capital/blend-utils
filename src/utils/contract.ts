import { randomBytes } from 'crypto';
import { Asset, Contract, Keypair, Operation, hash, xdr, Address } from 'soroban-client';
import { AddressBook } from './address_book.js';
import { config } from './env_config.js';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createTxBuilder, signAndSubmitTransaction } from './tx';

// Relative paths from __dirname
const CONTRACT_REL_PATH: object = {
  token: '../../../blend-contracts/soroban_token_contract.wasm',
  oracle: '../../../blend-contracts/target/wasm32-unknown-unknown/release/mock_oracle.wasm',
  emitter: '../../../blend-contracts/target/wasm32-unknown-unknown/release/emitter.wasm',
  poolFactory: '../../../blend-contracts/target/wasm32-unknown-unknown/optimized/pool_factory.wasm',
  backstop: '../../../blend-contracts/target/wasm32-unknown-unknown/optimized/backstop_module.wasm',
  lendingPool: '../../../blend-contracts/target/wasm32-unknown-unknown/optimized/lending_pool.wasm',
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createInstallOperation(
  wasmKey: string,
  addressBook: AddressBook
): xdr.Operation<Operation.InvokeHostFunction> {
  const contractWasm = readFileSync(
    path.join(__dirname, CONTRACT_REL_PATH[wasmKey as keyof object])
  );
  const wasmHash = hash(contractWasm);
  addressBook.setWasmHash(wasmKey, wasmHash.toString('hex'));
  const op = Operation.invokeHostFunction({
    func: xdr.HostFunction.hostFunctionTypeUploadContractWasm(contractWasm),
    auth: [],
  });

  return op;
}

export function createDeployOperation(
  contractKey: string,
  wasmKey: string,
  addressBook: AddressBook,
  source: Keypair
): xdr.Operation<Operation.InvokeHostFunction> {
  const contractIdSalt = randomBytes(32);
  const networkId = hash(Buffer.from(config.passphrase));
  const contractIdPreimage = xdr.ContractIdPreimage.contractIdPreimageFromAddress(
    new xdr.ContractIdPreimageFromAddress({
      address: Address.fromString(source.publicKey()).toScAddress(),
      salt: contractIdSalt,
    })
  );

  const hashIdPreimage = xdr.HashIdPreimage.envelopeTypeContractId(
    new xdr.HashIdPreimageContractId({
      networkId: networkId,
      contractIdPreimage: contractIdPreimage,
    })
  );

  const contractId = new Contract(hash(hashIdPreimage.toXDR()).toString('hex')).contractId(
    'strkey'
  );
  console.log(contractId);
  addressBook.setContractId(contractKey, contractId);
  const wasmHash = Buffer.from(addressBook.getWasmHash(wasmKey), 'hex');

  const deployFunction = xdr.HostFunction.hostFunctionTypeCreateContract(
    new xdr.CreateContractArgs({
      contractIdPreimage: contractIdPreimage,
      executable: xdr.ContractExecutable.contractExecutableWasm(wasmHash),
    })
  );

  return Operation.invokeHostFunction({
    func: deployFunction,
    auth: [],
  });
}

export function createDeployStellarAssetOperation(
  asset: Asset,
  addressBook: AddressBook
): xdr.Operation<Operation.InvokeHostFunction> {
  const xdrAsset = asset.toXDRObject();
  const networkId = hash(Buffer.from(config.passphrase));
  const preimage = xdr.HashIdPreimage.envelopeTypeContractId(
    new xdr.HashIdPreimageContractId({
      networkId: networkId,
      contractIdPreimage: xdr.ContractIdPreimage.contractIdPreimageFromAsset(xdrAsset),
    })
  );
  const contractId = new Contract(hash(preimage.toXDR()).toString('hex')).contractId('strkey');

  addressBook.setContractId(asset.code, contractId);
  const deployFunction = xdr.HostFunction.hostFunctionTypeCreateContract(
    new xdr.CreateContractArgs({
      contractIdPreimage: xdr.ContractIdPreimage.contractIdPreimageFromAsset(xdrAsset),
      executable: xdr.ContractExecutable.contractExecutableToken(),
    })
  );

  return Operation.invokeHostFunction({
    func: deployFunction,
    auth: [],
  });
}

export async function invokeStellarOperation(operation: xdr.Operation, source: Keypair) {
  const txBuilder = await createTxBuilder(source);
  txBuilder.addOperation(operation);
  await signAndSubmitTransaction(txBuilder.build(), source);
}

export async function airdropAccount(user: Keypair) {
  try {
    console.log('Start funding');
    await config.rpc.requestAirdrop(user.publicKey(), config.friendbot);
    console.log('Funded: ', user.publicKey());
  } catch (e) {
    console.log(user.publicKey(), ' already funded');
  }
}
