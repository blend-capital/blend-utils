import { randomBytes } from 'crypto';
import { Asset, Contract, Keypair, Operation, Server, hash, xdr } from 'soroban-client';
import { Contracts } from './config.js';
import config from './config';
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

/**
 * @param {string} wasmKey
 * @param {Contracts} contracts
 * @returns {xdr.Operation<Operation.InvokeHostFunction>}
 */
export function createInstallOperation(wasmKey: string, contracts: Contracts) {
  const contractWasm = readFileSync(
    path.join(__dirname, CONTRACT_REL_PATH[wasmKey as keyof object])
  );

  const installContractArgs = new xdr.UploadContractWasmArgs({
    code: contractWasm,
  });
  const wasmHash = hash(installContractArgs.toXDR());

  contracts.setWasmHash(wasmKey, wasmHash.toString('hex'));
  const op = Operation.invokeHostFunction({
    args: xdr.HostFunctionArgs.hostFunctionTypeUploadContractWasm(installContractArgs),
    auth: [],
  });

  return op;
}

/**
 *
 * @param {string} contractKey
 * @param {string} wasmKey
 * @param {Contracts} contracts
 * @param {Keypair} source
 * @returns {xdr.Operation<Operation.InvokeHostFunction>}
 */
export function createDeployOperation(
  contractKey: string,
  wasmKey: string,
  contracts: Contracts,
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

  contracts.setContractId(contractKey, contractId);
  const wasmHash = Buffer.from(contracts.getWasmHash(wasmKey), 'hex');

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

/**
 * @param {Asset} asset
 * @param {contracts} contracts
 * @returns {xdr.Operation<Operation.InvokeHostFunction>}
 */
export function createDeployStellarAssetOperation(asset: Asset, contracts: Contracts) {
  const xdrAsset = asset.toXDRObject();
  const networkId = hash(Buffer.from(config.passphrase));
  const preimage = xdr.HashIdPreimage.envelopeTypeContractIdFromAsset(
    new xdr.HashIdPreimageFromAsset({
      networkId: networkId,
      asset: xdrAsset,
    })
  );
  const contractId = new Contract(hash(preimage.toXDR()).toString('hex')).contractId('strkey');

  contracts.setContractId(asset.code, contractId);

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

export async function invokeStellarOperation(
  stellarRpc: Server,
  operation: xdr.Operation,
  source: Keypair
) {
  const network = config.passphrase;
  const txBuilder = await createTxBuilder(stellarRpc, network, source);
  txBuilder.addOperation(operation);
  await signAndSubmitTransaction(stellarRpc, network, txBuilder.build(), source);
}

/**
 * @param {Server} stellarRpc
 * @param {contracts} contracts
 */
export async function airdropAccount(stellarRpc: Server, user: Keypair) {
  try {
    console.log('Start funding');
    await stellarRpc.requestAirdrop(user.publicKey(), config.friendbot);
    console.log('Funded: ', user.publicKey());
  } catch (e) {
    console.log(user.publicKey(), ' already funded');
  }
}
