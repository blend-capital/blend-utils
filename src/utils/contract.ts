import {
  Address,
  Keypair,
  Operation,
  SorobanDataBuilder,
  StrKey,
  hash,
  xdr,
} from '@stellar/stellar-sdk';
import { randomBytes } from 'crypto';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { addressBook } from './address-book.js';
import { config } from './env_config.js';
import { TxParams, invokeSorobanOperation } from './tx.js';

// Relative paths from __dirname
const CONTRACT_REL_PATH: object = {
  token: '../../src/external/token.wasm',
  comet: '../../wasm_v1/comet.wasm',
  cometFactory: '../../wasm_v1/comet_factory.wasm',
  oraclemock: '../../src/external/oracle.wasm',
  emitter: '../../wasm_v1/emitter.wasm',
  poolFactory: '../../wasm_v1/pool_factory.wasm',
  backstop: '../../wasm_v1/backstop.wasm',
  lendingPool: '../../wasm_v1/pool.wasm',
  poolFactoryV2: '../../wasm_v2/pool_factory.wasm',
  backstopV2: '../../wasm_v2/backstop.wasm',
  lendingPoolV2: '../../wasm_v2/pool.wasm',
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function installContract(wasmKey: string, txParams: TxParams): Promise<Buffer> {
  const contractWasm = readFileSync(
    path.join(__dirname, CONTRACT_REL_PATH[wasmKey as keyof object])
  );
  const wasmHash = hash(contractWasm);
  addressBook.setWasmHash(wasmKey, wasmHash.toString('hex'));
  const op = Operation.invokeHostFunction({
    func: xdr.HostFunction.hostFunctionTypeUploadContractWasm(contractWasm),
    auth: [],
  });
  await invokeSorobanOperation(op.toXDR('base64'), () => undefined, txParams);
  addressBook.writeToFile();
  return wasmHash;
}

export async function deployContract(
  contractKey: string,
  wasmKey: string,
  txParams: TxParams
): Promise<string> {
  const contractIdSalt = randomBytes(32);
  const networkId = hash(Buffer.from(config.passphrase));
  const contractIdPreimage = xdr.ContractIdPreimage.contractIdPreimageFromAddress(
    new xdr.ContractIdPreimageFromAddress({
      address: Address.fromString(txParams.account.accountId()).toScAddress(),
      salt: contractIdSalt,
    })
  );

  const hashIdPreimage = xdr.HashIdPreimage.envelopeTypeContractId(
    new xdr.HashIdPreimageContractId({
      networkId: networkId,
      contractIdPreimage: contractIdPreimage,
    })
  );
  const contractId = StrKey.encodeContract(hash(hashIdPreimage.toXDR()));
  addressBook.setContractId(contractKey, contractId);
  const wasmHash = Buffer.from(addressBook.getWasmHash(wasmKey), 'hex');

  const deployFunction = xdr.HostFunction.hostFunctionTypeCreateContract(
    new xdr.CreateContractArgs({
      contractIdPreimage: contractIdPreimage,
      executable: xdr.ContractExecutable.contractExecutableWasm(wasmHash),
    })
  );
  const deployOp = Operation.invokeHostFunction({
    func: deployFunction,
    auth: [],
  });
  addressBook.writeToFile();
  await invokeSorobanOperation(deployOp.toXDR('base64'), () => undefined, txParams);
  return contractId;
}

export function generateContractId(accountId: string, salt: Buffer): string {
  const networkId = hash(Buffer.from(config.passphrase));
  const contractIdPreimage = xdr.ContractIdPreimage.contractIdPreimageFromAddress(
    new xdr.ContractIdPreimageFromAddress({
      address: Address.fromString(accountId).toScAddress(),
      salt: salt,
    })
  );

  const hashIdPreimage = xdr.HashIdPreimage.envelopeTypeContractId(
    new xdr.HashIdPreimageContractId({
      networkId: networkId,
      contractIdPreimage: contractIdPreimage,
    })
  );
  return StrKey.encodeContract(hash(hashIdPreimage.toXDR()));
}

export async function bumpContractInstance(contractKey: string, txParams: TxParams) {
  const address = Address.fromString(addressBook.getContractId(contractKey));
  const contractInstanceXDR = xdr.LedgerKey.contractData(
    new xdr.LedgerKeyContractData({
      contract: address.toScAddress(),
      key: xdr.ScVal.scvLedgerKeyContractInstance(),
      durability: xdr.ContractDataDurability.persistent(),
    })
  );
  const sorobanData = new SorobanDataBuilder().setReadOnly([contractInstanceXDR]).build();
  await invokeSorobanOperation(
    Operation.extendFootprintTtl({ extendTo: 535670 }).toXDR('base64'),
    () => undefined,
    txParams,
    sorobanData
  );
}

export async function bumpContractCode(wasmKey: string, txParams: TxParams) {
  const wasmHash = Buffer.from(addressBook.getWasmHash(wasmKey), 'hex');
  const contractCodeXDR = xdr.LedgerKey.contractCode(
    new xdr.LedgerKeyContractCode({
      hash: wasmHash,
    })
  );

  const sorobanData = new SorobanDataBuilder().setReadOnly([contractCodeXDR]).build();
  await invokeSorobanOperation(
    Operation.extendFootprintTtl({ extendTo: 535670 }).toXDR('base64'),
    () => undefined,
    txParams,
    sorobanData
  );
}

export async function bumpContractData(
  contractKey: string,
  dataKey: xdr.ScVal,
  txParams: TxParams
) {
  const address = Address.fromString(addressBook.getContractId(contractKey));
  const contractDataXDR = xdr.LedgerKey.contractData(
    new xdr.LedgerKeyContractData({
      contract: address.toScAddress(),
      key: dataKey,
      durability: xdr.ContractDataDurability.persistent(),
    })
  );
  const sorobanData = new SorobanDataBuilder().setReadOnly([contractDataXDR]).build();
  await invokeSorobanOperation(
    Operation.extendFootprintTtl({ extendTo: 535670 }).toXDR('base64'),
    () => undefined,
    txParams,
    sorobanData
  );
}

export async function restoreContractData(
  contractKey: string,
  dataKey: xdr.ScVal,
  txParams: TxParams
) {
  const address = Address.fromString(addressBook.getContractId(contractKey));
  const contractDataXDR = xdr.LedgerKey.contractData(
    new xdr.LedgerKeyContractData({
      contract: address.toScAddress(),
      key: dataKey,
      durability: xdr.ContractDataDurability.persistent(),
    })
  );
  const sorobanData = new SorobanDataBuilder().setReadWrite([contractDataXDR]).build();
  await invokeSorobanOperation(
    Operation.restoreFootprint({}).toXDR('base64'),
    () => undefined,
    txParams,
    sorobanData
  );
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
