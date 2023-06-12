import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Keypair } from 'soroban-client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
interface Network {
  rpc: string;
  passphrase: string;
  friendbot: string;
}
export class Config {
  network: Network;
  users: Map<string, string>;
  addresses: Map<string, string>;
  wasmHashes: Map<string, string>;

  constructor(
    network: Network,
    users: Map<string, string>,
    addresses: Map<string, string>,
    wasmHashes: Map<string, string>
  ) {
    this.network = network;
    this.users = users;
    this.addresses = addresses;
    this.wasmHashes = wasmHashes;
  }

  /**
   * @returns {Config}
   */
  static loadFromFile(network: string) {
    let configFileName = '';
    switch (network) {
      case 'standalone':
        configFileName = '../../local.config.json';
        break;
      case 'future-net':
        configFileName = '../../future-net.config.json';
        break;
      case 'test-net':
        configFileName = '../../test-net.config.json';
        break;
    }
    const configFile = readFileSync(path.join(__dirname, configFileName));
    const configObj = JSON.parse(configFile.toString());
    return new Config(
      configObj.network,
      new Map(Object.entries(configObj.users)),
      new Map(Object.entries(configObj.addresses)),
      new Map(Object.entries(configObj.wasmHashes))
    );
  }

  writeToFile() {
    const newFile = JSON.stringify(this, null, 2);
    writeFileSync(path.join(__dirname, '/local.config.json'), newFile);
  }

  /**
   * @param {string} userKey
   * @returns {Keypair}
   */
  getAddress(userKey: string) {
    const userSecret = this.users.get(userKey);

    if (userSecret != undefined) {
      return Keypair.fromSecret(userSecret);
    } else {
      console.error('unable to find user in config: ', userKey);
      throw Error();
    }
  }

  /**
   * @param {string} userKey
   * @param {Keypair} keypair
   */
  setAddress(userKey: string, keypair: Keypair) {
    this.users.set(userKey, keypair.secret());
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
      console.error('unable to find address in config: ', contractKey);
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
      console.error('unable to find hash in config: ', contractKey);
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
