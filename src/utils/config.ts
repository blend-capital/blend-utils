import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });
export class Contracts {
  addresses: Map<string, string>;
  wasmHashes: Map<string, string>;
  fileName: string;

  constructor(addresses: Map<string, string>, wasmHashes: Map<string, string>, fileName: string) {
    this.addresses = addresses;
    this.wasmHashes = wasmHashes;
    this.fileName = fileName;
  }

  /**
   * @returns {Contracts}
   */
  static loadFromFile(network: string) {
    let fileName = '';
    switch (network) {
      case 'standalone':
        fileName = '../../local.contracts.json';
        break;
      case 'futurenet':
        fileName = '../../futurenet.contracts.json';
        break;
      case 'testnet':
        fileName = '../../testnet.contracts.json';
        break;
      case 'mainnet':
        fileName = '../../mainnet.contracts.json';
        break;
    }
    const addressFile = readFileSync(path.join(__dirname, fileName));
    const addressObj = JSON.parse(addressFile.toString());
    return new Contracts(
      new Map(Object.entries(addressObj.addresses)),
      new Map(Object.entries(addressObj.wasmHashes)),
      fileName
    );
  }

  writeToFile() {
    const newFile = JSON.stringify(
      this,
      (key, value) => {
        if (value instanceof Map) {
          return Object.fromEntries(value);
        } else if (key != 'fileName') {
          return value;
        }
      },
      2
    );
    writeFileSync(path.join(__dirname, this.fileName), newFile);
  }

  /**
   * @param {string} contractKey
   * @returns {string} - Hex encoded contractId
   */
  getContractId(contractKey: string) {
    const contractId = this.addresses.get(contractKey);

    if (contractId != undefined) {
      return contractId;
    } else {
      console.error(`unable to find address for ${contractKey} in ${this.fileName}`);
      throw Error();
    }
  }

  /**
   * @param {string} contractKey
   * @param {string} contractId - Hex encoded contractId
   */
  setContractId(contractKey: string, contractId: string) {
    this.addresses.set(contractKey, contractId);
  }

  /**
   * @param {string} contractKey
   * @returns {string} -
   */
  getWasmHash(contractKey: string) {
    const washHash = this.wasmHashes.get(contractKey);

    if (washHash != undefined) {
      return washHash;
    } else {
      console.error(`unable to find hash for ${contractKey} in ${this.fileName}`);
      throw Error();
    }
  }

  /**
   * @param {string} contractKey
   * @param {string} wasmHash - Hex encoded wasmHash
   */
  setWasmHash(contractKey: string, wasmHash: string) {
    this.wasmHashes.set(contractKey, wasmHash);
  }
}

interface Env {
  rpc: string | undefined;
  passphrase: string | undefined;
  friendbot: string | undefined;
  admin: string | undefined;
}

interface Config {
  rpc: string;
  passphrase: string;
  friendbot: string;
  admin: string;
}

function getEnv(): Env {
  return {
    rpc: process.env.rpc,
    passphrase: process.env.passphrase,
    friendbot: process.env.friendbot,
    admin: process.env.admin,
  };
}

function getConfig(env: Env): Config {
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) {
      throw new Error(`Error: Missing key ${key} in .env`);
    }
  }
  return env as Config;
}

export function getUser(user: string): string {
  const userSecretKey = process.env[user];
  if (userSecretKey != undefined) {
    return userSecretKey;
  } else {
    throw new Error(`${user} secret key not found in .env`);
  }
}
const env = getEnv();
const config = getConfig(env);

export default config;
