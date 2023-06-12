import { randomBytes } from 'crypto';
import { Asset, Keypair, Operation, Server, hash, xdr } from 'soroban-client';
import { Config } from '../utils/config.js';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createTxBuilder, signAndSubmitTransaction } from './tx.js';

// Relative paths from __dirname
const CONTRACT_REL_PATH: object = {
  token: '../../../blend-contracts/soroban_token_contract.wasm',
  bToken: '../../../blend-contracts/target/wasm32-unknown-unknown/optimized/b_token.wasm',
  dToken: '../../../blend-contracts/target/wasm32-unknown-unknown/optimized/d_token.wasm',
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
 * @param {Config} config
 * @returns {xdr.Operation<Operation.InvokeHostFunction>}
 */
export function createInstallOperation(wasmKey: string, config: Config) {
  const contractWasm = readFileSync(
    path.join(__dirname, CONTRACT_REL_PATH[wasmKey as keyof object])
  );

  const installContractArgs = new xdr.UploadContractWasmArgs({
    code: contractWasm,
  });
  const wasmHash = hash(installContractArgs.toXDR());

  config.setWasmHash(wasmKey, wasmHash.toString('hex'));
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
 * @param {Config} config
 * @param {Keypair} source
 * @returns {xdr.Operation<Operation.InvokeHostFunction>}
 */
export function createDeployOperation(
  contractKey: string,
  wasmKey: string,
  config: Config,
  source: Keypair
): xdr.Operation<Operation.InvokeHostFunction> {
  const contractIdSalt = randomBytes(32);
  const networkId = hash(Buffer.from(config.network.passphrase));
  const preimage = xdr.HashIdPreimage.envelopeTypeContractIdFromSourceAccount(
    new xdr.HashIdPreimageSourceAccountContractId({
      networkId: networkId,
      sourceAccount: xdr.PublicKey.publicKeyTypeEd25519(source.rawPublicKey()),
      salt: contractIdSalt,
    })
  );
  const contractId = hash(preimage.toXDR());

  config.setContractId(contractKey, contractId.toString('hex'));
  const wasmHash = Buffer.from(config.getWasmHash(wasmKey), 'hex');

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
 * @param {Config} config
 * @returns {xdr.Operation<Operation.InvokeHostFunction>}
 */
export function DeployStellarAssetOperation(
  asset: Asset,
  stellarRpc: Server,
  config: Config,
  source: Keypair
) {
  const xdrAsset = asset.toXDRObject();
  const networkId = hash(Buffer.from(config.network.passphrase));
  const preimage = xdr.HashIdPreimage.envelopeTypeContractIdFromAsset(
    new xdr.HashIdPreimageFromAsset({
      networkId: networkId,
      asset: xdrAsset,
    })
  );
  const contractId = hash(preimage.toXDR());

  config.setContractId(asset.code, contractId.toString('hex'));

  const deployFunction = xdr.HostFunctionArgs.hostFunctionTypeCreateContract(
    new xdr.CreateContractArgs({
      contractId: xdr.ContractId.contractIdFromAsset(xdrAsset),
      executable: xdr.ScContractExecutable.sccontractExecutableToken(),
    })
  );

  const operation = Operation.invokeHostFunction({
    args: deployFunction,
    auth: [],
  });

  invokeStellarOperation(stellarRpc, config, operation, source);
}

export async function invokeStellarOperation(
  stellarRpc: Server,
  config: Config,
  operation: xdr.Operation,
  source: Keypair
) {
  const network = config.network.passphrase;
  const txBuilder = await createTxBuilder(stellarRpc, network, source);
  txBuilder.addOperation(operation);
  console.log('Operated added to txBuilder');
  await signAndSubmitTransaction(stellarRpc, network, txBuilder.build(), source);
}

/**
 * @param {Server} stellarRpc
 * @param {Config} config
 */
export async function airdropAccounts(stellarRpc: Server, config: Config) {
  for (const user of config.users.keys()) {
    const pubKey = config.getAddress(user).publicKey();
    try {
      console.log('Start funding');
      await stellarRpc.requestAirdrop(pubKey, config.network.friendbot);
      console.log('Funded: ', pubKey);
    } catch (e) {
      console.log(pubKey, ' already funded');
    }
  }
  console.log('All users airdropped\n');
}
