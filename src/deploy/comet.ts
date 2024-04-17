import { Address, scValToNative, xdr } from '@stellar/stellar-sdk';
import { randomBytes } from 'crypto';
import { CometContract, CometFactoryContract } from '../external/comet.js';
import { addressBook } from '../utils/address-book.js';
import {
  bumpContractCode,
  bumpContractInstance,
  deployContract,
  installContract,
} from '../utils/contract.js';
import { config } from '../utils/env_config.js';
import { TxParams, invokeSorobanOperation } from '../utils/tx.js';

export async function deployComet(txParams: TxParams): Promise<CometContract> {
  await installContract('comet', txParams);
  await bumpContractCode('comet', txParams);
  await installContract('cometFactory', txParams);
  await bumpContractCode('cometFactory', txParams);

  const comet_wasm = Buffer.from(addressBook.getWasmHash('comet'), 'hex');

  const cometFactoryAddress = await deployContract('cometFactory', 'cometFactory', txParams);
  await bumpContractInstance('cometFactory', txParams);
  const cometFactory = new CometFactoryContract(cometFactoryAddress);
  await invokeSorobanOperation(
    cometFactory.init(txParams.account.accountId(), comet_wasm),
    () => undefined,
    txParams
  );

  const comet = await invokeSorobanOperation<Address>(
    cometFactory.newCometPool(randomBytes(32), config.admin.publicKey()),
    (result: string) => scValToNative(xdr.ScVal.fromXDR(result, 'base64')) as Address,
    txParams
  );
  if (!comet) {
    throw new Error('Failed to deploy Comet contract.');
  }
  addressBook.setContractId('comet', comet.toString());
  addressBook.writeToFile();
  console.log('Successfully deployed Comet contract.\n');
  return new CometContract(comet.toString());
}
