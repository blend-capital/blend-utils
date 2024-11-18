import { config } from '../utils/env_config.js';
import { createUser } from './user.js';

const user_arg = process.argv[3];
let keypair = undefined;
if (user_arg !== undefined) {
  keypair = config.getUser(user_arg);
}

const user = await createUser(keypair);
console.log(user.secret(), '\n', user.publicKey());
