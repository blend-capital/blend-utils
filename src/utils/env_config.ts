import { Keypair, rpc } from '@stellar/stellar-sdk';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

class EnvConfig {
  rpc: rpc.Server;
  passphrase: string;
  friendbot: string;
  blend_wasm_rel_path: string;
  blend_v2_wasm_rel_path: string;
  comet_wasm_rel_path: string;
  admin: Keypair;

  constructor(
    rpc: rpc.Server,
    passphrase: string,
    friendbot: string,
    blend_wasm_rel_path: string,
    blend_v2_wasm_rel_path: string,
    comet_wasm_rel_path: string,
    admin: Keypair
  ) {
    this.rpc = rpc;
    this.passphrase = passphrase;
    this.friendbot = friendbot;
    this.blend_wasm_rel_path = blend_wasm_rel_path;
    this.blend_v2_wasm_rel_path = blend_v2_wasm_rel_path;
    this.comet_wasm_rel_path = comet_wasm_rel_path;
    this.admin = admin;
  }

  /**
   * Load the environment config from the .env file
   * @returns Environment config
   */
  static loadFromFile(): EnvConfig {
    const rpc_url = process.env.RPC_URL;
    const friendbot_url = process.env.FRIENDBOT_URL;
    const passphrase = process.env.NETWORK_PASSPHRASE;
    const blend_wasm_rel_path = process.env.BLEND_WASM_REL_PATH;
    const blend_v2_wasm_rel_path = process.env.BLEND_V2_WASM_REL_PATH;
    const comet_wasm_rel_path = process.env.COMET_WASM_REL_PATH;
    const admin = process.env.ADMIN;

    if (
      rpc_url == undefined ||
      friendbot_url == undefined ||
      passphrase == undefined ||
      blend_wasm_rel_path == undefined ||
      blend_v2_wasm_rel_path == undefined ||
      comet_wasm_rel_path == undefined ||
      admin == undefined
    ) {
      throw new Error('Error: .env file is missing required fields');
    }

    return new EnvConfig(
      new rpc.Server(rpc_url, { allowHttp: true }),
      passphrase,
      friendbot_url,
      blend_wasm_rel_path,
      blend_v2_wasm_rel_path,
      comet_wasm_rel_path,
      Keypair.fromSecret(admin)
    );
  }

  /**
   * Get the Keypair for a user from the env file
   * @param userKey - The name of the user in the env file
   * @returns Keypair for the user
   */
  getUser(userKey: string): Keypair {
    const userSecretKey = process.env[userKey];
    if (userSecretKey != undefined) {
      return Keypair.fromSecret(userSecretKey);
    } else {
      throw new Error(`${userKey} secret key not found in .env`);
    }
  }
}

export const config = EnvConfig.loadFromFile();
