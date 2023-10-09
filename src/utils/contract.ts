import { randomBytes } from 'crypto';
import { Asset, Keypair, Operation, hash, xdr, Address, StrKey } from 'soroban-client';
import { AddressBook } from './address_book.js';
import { config } from './env_config.js';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createTxBuilder, invokeAndUnwrap, invokeTransaction } from './tx.js';

// Relative paths from __dirname
const CONTRACT_REL_PATH: object = {
  token: '../../../blend-contracts/soroban_token_contract.wasm',
  comet: '../../../blend-contracts/comet.wasm',
  oracle: '../../../blend-contracts/target/wasm32-unknown-unknown/release/mock_oracle.wasm',
  emitter: '../../../blend-contracts/target/wasm32-unknown-unknown/optimized/emitter.wasm',
  poolFactory: '../../../blend-contracts/target/wasm32-unknown-unknown/optimized/pool_factory.wasm',
  backstop: '../../../blend-contracts/target/wasm32-unknown-unknown/optimized/backstop_module.wasm',
  lendingPool: '../../../blend-contracts/target/wasm32-unknown-unknown/optimized/lending_pool.wasm',
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function installContract(wasmKey: string, addressBook: AddressBook, source: Keypair) {
  const contractWasm = readFileSync(
    path.join(__dirname, CONTRACT_REL_PATH[wasmKey as keyof object])
  );
  const wasmHash = hash(contractWasm);
  addressBook.setWasmHash(wasmKey, wasmHash.toString('hex'));
  console.log('Installing:', wasmKey, wasmHash.toString('hex'));
  const op = Operation.invokeHostFunction({
    func: xdr.HostFunction.hostFunctionTypeUploadContractWasm(contractWasm),
    auth: [],
  });
  addressBook.writeToFile();
  await invokeAndUnwrap(op, source, () => undefined);
}

export async function deployContract(
  contractKey: string,
  wasmKey: string,
  addressBook: AddressBook,
  source: Keypair
) {
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
  console.log('Deploying WASM', wasmKey, 'for', contractKey);
  const contractId = StrKey.encodeContract(hash(hashIdPreimage.toXDR()));
  addressBook.setContractId(contractKey, contractId);
  const wasmHash = Buffer.from(addressBook.getWasmHash(wasmKey), 'hex');

  const deployFunction = xdr.HostFunction.hostFunctionTypeCreateContract(
    new xdr.CreateContractArgs({
      contractIdPreimage: contractIdPreimage,
      executable: xdr.ContractExecutable.contractExecutableWasm(wasmHash),
    })
  );

  addressBook.writeToFile();
  await invokeAndUnwrap(
    Operation.invokeHostFunction({
      func: deployFunction,
      auth: [],
    }),
    config.admin,
    () => undefined
  );
}

export async function deployStellarAsset(asset: Asset, addressBook: AddressBook, source: Keypair) {
  const xdrAsset = asset.toXDRObject();
  const networkId = hash(Buffer.from(config.passphrase));
  const preimage = xdr.HashIdPreimage.envelopeTypeContractId(
    new xdr.HashIdPreimageContractId({
      networkId: networkId,
      contractIdPreimage: xdr.ContractIdPreimage.contractIdPreimageFromAsset(xdrAsset),
    })
  );
  const contractId = StrKey.encodeContract(hash(preimage.toXDR()));

  addressBook.setContractId(asset.code, contractId);
  const deployFunction = xdr.HostFunction.hostFunctionTypeCreateContract(
    new xdr.CreateContractArgs({
      contractIdPreimage: xdr.ContractIdPreimage.contractIdPreimageFromAsset(xdrAsset),
      executable: xdr.ContractExecutable.contractExecutableToken(),
    })
  );
  await invokeAndUnwrap(
    Operation.invokeHostFunction({
      func: deployFunction,
      auth: [],
    }),
    source,
    () => undefined
  );
}

export async function bumpContractInstance(
  contractKey: string,
  addressBook: AddressBook,
  source: Keypair
) {
  const address = Address.fromString(addressBook.getContractId(contractKey));
  console.log('bumping contract instance: ', address.toString());
  const contractInstanceXDR = xdr.LedgerKey.contractData(
    new xdr.LedgerKeyContractData({
      contract: address.toScAddress(),
      key: xdr.ScVal.scvLedgerKeyContractInstance(),
      durability: xdr.ContractDataDurability.persistent(),
    })
  );
  const bumpTransactionData = new xdr.SorobanTransactionData({
    resources: new xdr.SorobanResources({
      footprint: new xdr.LedgerFootprint({
        readOnly: [contractInstanceXDR],
        readWrite: [],
      }),
      instructions: 0,
      readBytes: 0,
      writeBytes: 0,
    }),
    refundableFee: xdr.Int64.fromString('0'),
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    ext: new xdr.ExtensionPoint(0),
  });

  const txBuilder = await createTxBuilder(source);
  txBuilder.addOperation(Operation.bumpFootprintExpiration({ ledgersToExpire: 535670 })); // 1 year
  txBuilder.setSorobanData(bumpTransactionData);
  const result = await invokeTransaction(txBuilder.build(), source, false, () => undefined);
  console.log(result.toString(), '\n');
}

export async function bumpContractCode(wasmKey: string, addressBook: AddressBook, source: Keypair) {
  console.log('bumping contract code: ', wasmKey);
  const wasmHash = Buffer.from(addressBook.getWasmHash(wasmKey), 'hex');
  const contractCodeXDR = xdr.LedgerKey.contractCode(
    new xdr.LedgerKeyContractCode({
      hash: wasmHash,
    })
  );
  const bumpTransactionData = new xdr.SorobanTransactionData({
    resources: new xdr.SorobanResources({
      footprint: new xdr.LedgerFootprint({
        readOnly: [contractCodeXDR],
        readWrite: [],
      }),
      instructions: 0,
      readBytes: 0,
      writeBytes: 0,
    }),
    refundableFee: xdr.Int64.fromString('0'),
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    ext: new xdr.ExtensionPoint(0),
  });

  const txBuilder = await createTxBuilder(source);
  txBuilder.addOperation(Operation.bumpFootprintExpiration({ ledgersToExpire: 535670 })); // 1 year
  txBuilder.setSorobanData(bumpTransactionData);
  const result = await invokeTransaction(txBuilder.build(), source, false, () => undefined);
  console.log(result.toString(), '\n');
}

export async function bumpContractData(
  contractKey: string,
  addressBook: AddressBook,
  dataKey: xdr.ScVal,
  source: Keypair
) {
  const address = Address.fromString(addressBook.getContractId(contractKey));
  console.log('bumping contract ledger entry: ', address.toString());
  const contractDataXDR = xdr.LedgerKey.contractData(
    new xdr.LedgerKeyContractData({
      contract: address.toScAddress(),
      key: dataKey,
      durability: xdr.ContractDataDurability.persistent(),
    })
  );
  const bumpTransactionData = new xdr.SorobanTransactionData({
    resources: new xdr.SorobanResources({
      footprint: new xdr.LedgerFootprint({
        readOnly: [contractDataXDR],
        readWrite: [],
      }),
      instructions: 0,
      readBytes: 0,
      writeBytes: 0,
    }),
    refundableFee: xdr.Int64.fromString('0'),
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    ext: new xdr.ExtensionPoint(0),
  });

  const txBuilder = await createTxBuilder(source);
  txBuilder.addOperation(Operation.bumpFootprintExpiration({ ledgersToExpire: 535670 })); // 1 year
  txBuilder.setSorobanData(bumpTransactionData);
  const result = await invokeTransaction(txBuilder.build(), source, false, () => undefined);
  console.log(result.toString(), '\n');
}

export async function restoreContractData(
  contractKey: string,
  addressBook: AddressBook,
  dataKey: xdr.ScVal,
  source: Keypair
) {
  const address = Address.fromString(addressBook.getContractId(contractKey));
  console.log('restoring contract ledger entry: ', address.toString());
  const contractDataXDR = xdr.LedgerKey.contractData(
    new xdr.LedgerKeyContractData({
      contract: address.toScAddress(),
      key: dataKey,
      durability: xdr.ContractDataDurability.persistent(),
    })
  );
  const restoreTransactionData = new xdr.SorobanTransactionData({
    resources: new xdr.SorobanResources({
      footprint: new xdr.LedgerFootprint({
        readOnly: [],
        readWrite: [contractDataXDR],
      }),
      instructions: 0,
      readBytes: 0,
      writeBytes: 0,
    }),
    refundableFee: xdr.Int64.fromString('0'),
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    ext: new xdr.ExtensionPoint(0),
  });

  const txBuilder = await createTxBuilder(source);
  txBuilder.addOperation(Operation.restoreFootprint({}));
  txBuilder.setSorobanData(restoreTransactionData);
  const result = await invokeTransaction(txBuilder.build(), source, false, () => undefined);
  console.log(result.toString(), '\n');
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
