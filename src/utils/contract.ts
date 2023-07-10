import { randomBytes } from 'crypto';
import { Asset, Contract, Keypair, Operation, hash, xdr } from 'soroban-client';
import { AddressBook } from './address_book.js';
import { config } from './env_config.js';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createTxBuilder, signAndSubmitTransaction } from './tx';

// Relative paths from __dirname
const CONTRACT_REL_PATH: object = {
  token: '../../../blend-contracts/soroban_token_contract.wasm',
  oracle: '../../../blend-contracts/target/wasm32-unknown-unknown/release/mock_blend_oracle.wasm',
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

  const installContractArgs = new xdr.UploadContractWasmArgs({
    code: contractWasm,
  });
  const wasmHash = hash(installContractArgs.toXDR());

  addressBook.setWasmHash(wasmKey, wasmHash.toString('hex'));
  const op = Operation.invokeHostFunction({
    args: xdr.HostFunctionArgs.hostFunctionTypeUploadContractWasm(installContractArgs),
    auth: [],
  });

  console.log('built op');
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
  const preimage = xdr.HashIdPreimage.envelopeTypeContractIdFromSourceAccount(
    new xdr.HashIdPreimageSourceAccountContractId({
      networkId: networkId,
      sourceAccount: xdr.PublicKey.publicKeyTypeEd25519(source.rawPublicKey()),
      salt: contractIdSalt,
    })
  );
  const contractId = new Contract(hash(preimage.toXDR()).toString('hex')).contractId('strkey');

  addressBook.setContractId(contractKey, contractId);
  const wasmHash = Buffer.from(addressBook.getWasmHash(wasmKey), 'hex');

  const deployFunction = xdr.HostFunctionArgs.hostFunctionTypeCreateContract(
    new xdr.CreateContractArgs({
      contractId: xdr.ContractId.contractIdFromSourceAccount(contractIdSalt),
      executable: xdr.ScContractExecutable.sccontractExecutableWasmRef(wasmHash),
    })
  );

  return Operation.invokeHostFunction({
    args: deployFunction,
    auth: [],
  });
}

export function createDeployStellarAssetOperation(
  asset: Asset,
  addressBook: AddressBook
): xdr.Operation<Operation.InvokeHostFunction> {
  const xdrAsset = asset.toXDRObject();
  const networkId = hash(Buffer.from(config.passphrase));
  const preimage = xdr.HashIdPreimage.envelopeTypeContractIdFromAsset(
    new xdr.HashIdPreimageFromAsset({
      networkId: networkId,
      asset: xdrAsset,
    })
  );
  const contractId = new Contract(hash(preimage.toXDR()).toString('hex')).contractId('strkey');

  addressBook.setContractId(asset.code, contractId);

  const deployFunction = xdr.HostFunctionArgs.hostFunctionTypeCreateContract(
    new xdr.CreateContractArgs({
      contractId: xdr.ContractId.contractIdFromAsset(xdrAsset),
      executable: xdr.ScContractExecutable.sccontractExecutableToken(),
    })
  );

  return Operation.invokeHostFunction({
    args: deployFunction,
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
