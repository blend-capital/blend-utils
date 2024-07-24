import { createUser } from './user.js';

let user = await createUser();
console.log(user.secret(), '\n', user.publicKey());
