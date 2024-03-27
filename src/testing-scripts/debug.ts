import {
  BackstopContract,
  EmitterContract,
  Network,
  PoolContract,
  PoolUser,
  RequestType,
  Request,
  Pool,
  Backstop,
  PositionEstimates,

  // ContractResponse,
} from '@blend-capital/blend-sdk';
import { config } from '../utils/env_config.js';
import { AddressBook } from '../utils/address-book.js';
import {
  TxParams,
  invokeClassicOp,
  invokeSorobanOperation,
  sendTransaction,
  signWithKeypair,
  simulationOperation,
} from '../utils/tx.js';
import {
  xdr,
  Address,
  SorobanRpc,
  TransactionBuilder,
  Asset,
  TimeoutInfinite,
  Operation,
  BASE_FEE,
  Transaction,
  Contract,
  scValToNative,
} from 'stellar-sdk';
import { airdropAccount } from '../utils/contract.js';
import { TokenContract } from '../external/token.js';
import { send } from 'process';
import { OracleContract } from '../external/oracle.js';

// import {
//   ContractResult,
//   GovernorClient,
//   Resources,
//   ContractErrorType,
//   VotesClient,
// } from 'soroban-governor-js-sdk';
async function debug(addressBook: AddressBook) {
  // let key = xdr.ScVal.scvVec([xdr.ScVal.scvSymbol('ResConfig')]);
  // let ledgerKey = xdr.LedgerKey.contractData(
  //   new xdr.LedgerKeyContractData({
  //     contract: Address.fromString(addressBook.getContractId('Stellar')).toScAddress(),
  //     key: key,
  //     durability: xdr.ContractDataDurability.persistent(),
  //   })
  // );
  // let test = await config.rpc.getLedgerEntries(ledgerKey);
  // console.log(test);

  const user1 = config.getUser('TEST');
  console.log(user1.publicKey());
  let resp = await config.rpc.getTransaction(
    '0000000000000000000000000000000000000000000000000000000000000000'
  );
  // await airdropAccount(user1);
  await airdropAccount(config.admin);
  let old_admin = config.getUser('OLD_ADMIN');
  let user1Sign = (txXdr: string) => signWithKeypair(txXdr, rpc_network.passphrase, user1);

  let oracle = new OracleContract(addressBook.getContractId('oracle'));
  const asset = xdr.ScVal.scvVec([
    xdr.ScVal.scvSymbol('Stellar'),
    Address.fromString(addressBook.getContractId('USDC')).toScVal(),
  ]);
  let account = await config.rpc.getAccount(user1.publicKey());
  let tx_builder = new TransactionBuilder(account, {
    fee: '10000',
    networkPassphrase: config.passphrase,
  }).setTimeout(TimeoutInfinite);

  tx_builder.addOperation(
    new Contract(addressBook.getContractId('oracle')).call('lastprice', asset)
  );
  const result = await config.rpc.simulateTransaction(tx_builder.build());
  if (SorobanRpc.Api.isSimulationSuccess(result)) {
    const xdr_str = result.result?.retval.toXDR('base64');
    if (xdr_str) {
      const price_result = xdr.ScVal.fromXDR(xdr_str, 'base64')?.value();
      if (price_result) {
        // eslint-disable-next-line
        // @ts-ignore
        console.log(scValToNative(price_result[0]?.val()));
      }
    }
  }
  // await invokeClassicOp(blnd_token.classic_mint(user1, asset, '100', config.admin), txParams);
  // console.log(StrKey.decodeEd25519PublicKey(whale.publicKey()).toString('hex'));

  // let pool = await Pool.load(rpc_network, addressBook.getContractId('Stellar'), 330957);
  // console.log(pool.config.oracle);
  // let rpc = new SorobanRpc.Server(config.rpc.serverURL.toString(), { allowHttp: true });

  // let pool = new PoolContract(addressBook.getContractId('Stellar'));
  // let goodOp = pool.submit({
  //   from: user1.publicKey(),
  //   spender: user1.publicKey(),
  //   to: user1.publicKey(),
  //   requests: [
  //     {
  //       amount: BigInt(100e7),
  //       request_type: RequestType.SupplyCollateral,
  //       address: addressBook.getContractId('XLM'),
  //     },
  //   ],
  // });
  // let account = await rpc.getAccount(user1.publicKey());
  // let tx = new TransactionBuilder(account, {
  //   fee: '10000',
  //   networkPassphrase: rpc_network.passphrase,
  // })
  //   .setTimeout(TimeoutInfinite)
  //   .addOperation(xdr.Operation.fromXDR(goodOp, 'base64'))
  //   .build();
  // let sim_resp = await rpc.simulateTransaction(tx);
  // let resp = ContractResponse.fromSimulationResponse(
  //   sim_resp,
  //   tx.toXDR(),
  //   rpc_network.passphrase,
  //   pool.parsers['submit']
  // );
  // console.log(resp);
  // let badOp = pool.submit({
  //   from: user1.publicKey(),
  //   spender: user1.publicKey(),
  //   to: user1.publicKey(),
  //   requests: [
  //     {
  //       amount: BigInt(10000000e7),
  //       request_type: RequestType.SupplyCollateral,
  //       address: addressBook.getContractId('XLM'),
  //     },
  //   ],
  // });
  // account = await rpc.getAccount(user1.publicKey());
  // let badTx = new TransactionBuilder(account, {
  //   fee: '10000',
  //   networkPassphrase: rpc_network.passphrase,
  // })
  //   .setTimeout(TimeoutInfinite)
  //   .addOperation(xdr.Operation.fromXDR(badOp, 'base64'))
  //   .build();
  // sim_resp = sim_resp as SorobanRpc.Api.SimulateTransactionSuccessResponse;
  // let sim_data = sim_resp.transactionData.build();
  // let testinga = new SorobanDataBuilder(sim_data);
  // let sim_fee = BigInt(sim_resp.minResourceFee) + BigInt(badTx.fee);
  // let txdata = new xdr.SorobanTransactionData({
  //   ext: sim_data.ext(),
  //   resourceFee: new xdr.Int64(sim_fee),
  //   resources: sim_data.resources(),
  // });

  // let tx_builder = TransactionBuilder.cloneFrom(badTx, {
  //   fee: sim_fee.toString(),
  //   networkPassphrase: rpc_network.passphrase,
  //   sorobanData: testinga.build(),
  // });
  // let vecRequest = sim_resp.result?.auth[0].rootInvocation().function().contractFn().args();
  // let modifiedArg = xdr.ScVal.scvVec([
  //   xdr.ScVal.scvMap([
  //     new xdr.ScMapEntry({
  //       key: xdr.ScVal.scvSymbol('address'),
  //       val: Address.fromString(addressBook.getContractId('XLM')).toScVal(),
  //     }),
  //     new xdr.ScMapEntry({
  //       key: xdr.ScVal.scvSymbol('amount'),
  //       val: nativeToScVal(10000000e7, { type: 'i128' }),
  //     }),
  //     new xdr.ScMapEntry({
  //       key: xdr.ScVal.scvSymbol('request_type'),
  //       val: xdr.ScVal.scvU32(RequestType.SupplyCollateral),
  //     }),
  //   ]),
  // ]);
  // let args = vecRequest?.slice(undefined, vecRequest.length - 1);
  // args!.push(modifiedArg);

  // let authorizedFunction = xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeContractFn(
  //   new xdr.InvokeContractArgs({
  //     contractAddress: Address.fromString(addressBook.getContractId('Stellar')).toScAddress(),
  //     functionName: 'submit',
  //     args: args!,
  //   })
  // );
  // let rootInvocation = new xdr.SorobanAuthorizedInvocation({
  //   function: authorizedFunction,
  //   subInvocations: sim_resp.result?.auth[0].rootInvocation().subInvocations()!,
  // });
  // // let auth = sim_resp.result?.auth[0];
  // let auth = new xdr.SorobanAuthorizationEntry({
  //   credentials: sim_resp.result?.auth[0].credentials()!,
  //   rootInvocation: rootInvocation,
  // });

  // // tx_builder.clearOperations();
  // switch (badTx.operations[0].type) {
  //   case 'invokeHostFunction':
  //     const invokeOp: Operation.InvokeHostFunction = badTx.operations[0];
  //     badTx.operations[0].auth = [auth];

  // tx_builder.addOperation(
  //   Operation.invokeHostFunction({
  //     source: invokeOp.source,
  //     func: invokeOp.func,
  //     // if auth entries are already present, we consider this "advanced
  //     // usage" and disregard ALL auth entries from the error
  //     //
  //     // the intuition is "if auth exists, this tx has probably been
  //     // simulated before"
  //     auth: [auth],
  //   })
  // );
  // }

  // let request = vecRequest?.vec()![0].map()![1];
  // vecRequest?.vec()![0].map()!;
  // console.log(JSON.stringify(request, null, 2));
  // let manualTx = tx_builder.build();
  // manualTx.sign(user1);
  // let bad_tx_result = await rpc.sendTransaction(manualTx);
  // if (bad_tx_result.status === 'PENDING') {
  //   let getResponse = await config.rpc.getTransaction(manualTx.hash().toString('hex'));
  //   let status = getResponse.status;
  //   // Poll this until the status is not "NOT_FOUND"
  //   while (status === 'NOT_FOUND') {
  //     // See if the transaction is complete
  //     await new Promise((resolve) => setTimeout(resolve, 2000));
  //     console.log('checking tx...');
  //     getResponse = await config.rpc.getTransaction(manualTx.hash().toString('hex'));
  //     status = getResponse.status;
  //     console.log(status);
  //   }
  //   console.log(getResponse);
  //   let txReponse = ContractResponse.fromTransactionResponse(
  //     getResponse,
  //     manualTx,
  //     rpc_network.passphrase,
  //     pool.parsers['submit']
  //   );
  //   console.log(txReponse);
  // }
  // await logInvocation(
  //   pool.submit(user1.publicKey(), user1Sign, rpc_network, tx_options, {
  //     from: user1.publicKey(),
  //     spender: user1.publicKey(),
  //     to: user1.publicKey(),
  //     requests: [
  //       {
  //         amount: BigInt(1e7),
  //         request_type: RequestType.SupplyCollateral,
  //         address: addressBook.getContractId('XLM'),
  //       },
  //     ],
  //   })
  // );
  // await logInvocation(
  //   pool.submit(user2.publicKey(), user2Sign, rpc_network, tx_options, {
  //     from: user2.publicKey(),
  //     spender: user2.publicKey(),
  //     to: user2.publicKey(),
  //     requests: [
  //       {
  //         amount: BigInt(1e7),
  //         request_type: RequestType.SupplyCollateral,
  //         address: addressBook.getContractId('XLM'),
  //       },
  //     ],
  //   })
  // );

  // await airdropAccount(whale);
  // let usdc = new TokenContract(addressBook.getContractId('USDC'));
  // await usdc.classic_mint(
  //   whale,
  //   new Asset('USDC', config.admin.publicKey()),
  //   '100000000',
  //   config.admin
  // );
  // await installContract('token', addressBook, config.admin);
  // await bumpContractCode('token', addressBook, config.admin);
  // await deployContract('testToken', 'token', addressBook, config.admin);
  // await bumpContractInstance('testToken', addressBook, config.admin);

  // console.log(
  //   await getTokenBalance(
  //     rpc_network,
  //     addressBook.getContractId('XLM'),
  //     Address.fromString(whale.publicKey())
  //   )
  // );
  // const stellarPool = new PoolClient(addressBook.getContractId('Stellar'));
  // const signWithWhale = (txXdr: string) => signWithKeypair(txXdr, rpc_network.passphrase, whale);
  // const stellarRequests: Request[] = [
  //   {
  //     amount: BigInt(100e7),
  //     request_type: 2,
  //     address: addressBook.getContractId('XLM'),
  //   },
  // ];

  // let result = await stellarPool.submit(whale.publicKey(), signWithWhale, rpc_network, tx_options, {
  //   from: whale.publicKey(),
  //   spender: whale.publicKey(),
  //   to: whale.publicKey(),
  //   requests: stellarRequests,
  // });
  // console.log(result);
}

async function testTransactionFlow(addressBook: AddressBook) {
  // let rpc = new SorobanRpc.Server(config.rpc.serverURL.toString(), { allowHttp: true });
  // let account = await rpc.getAccount(config.getUser('PROPOSER').publicKey());
  // let token = new TokenContract('CAXSI2OE322TCD7SA5GOJ53Q3ME5MIYQALEHUUT6JT4S6WXOS3XZUZAQ');
  // // await token.classic_mint(
  // //   config.getUser('PROPOSER'),
  // //   new Asset('VOTE', 'GBSXDX3C3X7TT2E23AAMYRAIWSY2MRDX73V5X2CKUZ44H2KJQQV2AHMB'),
  // //   '10000000000',
  // //   config.getUser('GOVERNOR_ADMIN')
  // // );
  // let votes_client = new VotesClient('CCXM6K3GSFPUU2G7OGACE3X7NBRYG6REBJN6CWN6RUTYBVOKZ5KSC5ZI');
  // let votes_op = votes_client.depositFor({
  //   from: config.getUser('PROPOSER').publicKey(),
  //   amount: 100000000000n,
  // });
  // let votes_tx = new TransactionBuilder(account, {
  //   fee: '10000',
  //   networkPassphrase: rpc_network.passphrase,
  // })
  //   .setTimeout(TimeoutInfinite)
  //   .addOperation(xdr.Operation.fromXDR(votes_op, 'base64'))
  //   .build();
  // let votes_sim_resp = await rpc.simulateTransaction(votes_tx);
  // votes_sim_resp = votes_sim_resp as SorobanRpc.Api.SimulateTransactionSuccessResponse;
  // console.log('Sim resp', JSON.stringify(votes_sim_resp.result?.retval));
  // let votes_result = ContractResult.fromSimulationResponse(
  //   votes_sim_resp,
  //   votes_tx.hash().toString('hex'),
  //   new Resources(0, 0, 0, 0, 0, 0, 0),
  //   votes_client.parsers['depositFor']
  // );
  // if (votes_result.result.isErr()) {
  //   console.log('Error', votes_result.result.unwrapErr());
  //   let err = votes_result.result.unwrapErr();
  //   if (err.type == ContractErrorType.InvokeHostFunctionEntryArchived) {
  //     // create a restore ledger entry tx_builder
  //   } else {
  //     throw votes_result.result.unwrapErr();
  //   }
  // }
  // let votes_assembled_tx = SorobanRpc.assembleTransaction(votes_tx, votes_sim_resp).build();
  // votes_assembled_tx.sign(config.getUser('PROPOSER'));
  // let votes_tx_result = await rpc.sendTransaction(votes_assembled_tx);
  // // console.log(votes_tx_result);
  // //Poll
  // if (votes_tx_result.status === 'PENDING') {
  //   await new Promise((resolve) => setTimeout(resolve, 2000));
  //   console.log('checking tx...');
  //   let response = await config.rpc.getTransaction(votes_tx_result.hash);
  //   let status = response.status;
  //   while (status === 'NOT_FOUND') {
  //     await new Promise((resolve) => setTimeout(resolve, 2000));
  //     response = await config.rpc.getTransaction(votes_tx_result.hash);
  //     status = response.status;
  //   }
  //   let result = ContractResult.fromTransactionResponse(
  //     response,
  //     votes_tx.hash().toString('hex'),
  //     Resources.fromTransaction(votes_assembled_tx.toXDR()),
  //     votes_client.parsers['depositFor']
  //   );
  //   if (result.result.isErr()) {
  //     throw result.result.unwrapErr();
  //   } else {
  //     console.log(result.result.unwrap());
  //   }
  // }
  // let votes_balance_op = votes_client.getVotes({
  //   account: config.getUser('PROPOSER').publicKey(),
  // });
  // let votes_balance_tx = new TransactionBuilder(account, {
  //   fee: '10000',
  //   networkPassphrase: rpc_network.passphrase,
  // })
  //   .setTimeout(TimeoutInfinite)
  //   .addOperation(xdr.Operation.fromXDR(votes_balance_op, 'base64'))
  //   .build();
  // let votes_balance_sim_resp = await rpc.simulateTransaction(votes_balance_tx);
  // console.log(
  //   ContractResult.fromSimulationResponse(
  //     votes_balance_sim_resp,
  //     votes_balance_tx.hash().toString('hex'),
  //     new Resources(0, 0, 0, 0, 0, 0, 0),
  //     votes_client.parsers['balance']
  //   ).result.unwrap()
  // );
  // let client = new GovernorClient('CAZA65HCGNNKGO7P66YNH3RSBVLCOJX5JXYCCUR66MMMBCT7ING4DBJL');
  // let settings_op = client.settings();
  // let settings_tx = new TransactionBuilder(account, {
  //   fee: '10000',
  //   networkPassphrase: rpc_network.passphrase,
  // })
  //   .setTimeout(TimeoutInfinite)
  //   .addOperation(xdr.Operation.fromXDR(settings_op, 'base64'))
  //   .build();
  // let settings_sim_resp = await rpc.simulateTransaction(settings_tx);
  // console.log(
  //   ContractResult.fromSimulationResponse(
  //     settings_sim_resp,
  //     settings_tx.hash().toString('hex'),
  //     new Resources(0, 0, 0, 0, 0, 0, 0),
  //     client.parsers['settings']
  //   ).result.unwrap()
  // );
  // let op = client.propose({
  //   creator: config.getUser('PROPOSER').publicKey(),
  //   calldata_: {
  //     args: [
  //       { value: 'GCDUQQ2LP2M32Q563YOJOG36KXO5T635FKSWG4IQWYFE2FQHMMQKYK3S', type: 'address' },
  //     ],
  //     contract_id: 'CCXM6K3GSFPUU2G7OGACE3X7NBRYG6REBJN6CWN6RUTYBVOKZ5KSC5ZI',
  //     function: 'balance',
  //   },
  //   sub_calldata_: [
  //     {
  //       args: [
  //         { value: 'GCDUQQ2LP2M32Q563YOJOG36KXO5T635FKSWG4IQWYFE2FQHMMQKYK3S', type: 'address' },
  //       ],
  //       contract_id: 'CCXM6K3GSFPUU2G7OGACE3X7NBRYG6REBJN6CWN6RUTYBVOKZ5KSC5ZI',
  //       function: 'balance',
  //       sub_auth: [],
  //     },
  //   ],
  //   title: 'New Proposal',
  //   description: 'This is something cool',
  // });
  // account = await rpc.getAccount(config.getUser('PROPOSER').publicKey());
  // let tx = new TransactionBuilder(account, {
  //   fee: '10000',
  //   networkPassphrase: rpc_network.passphrase,
  // })
  //   .setTimeout(TimeoutInfinite)
  //   .addOperation(xdr.Operation.fromXDR(op, 'base64'))
  //   .build();
  // let sim_resp = await rpc.simulateTransaction(tx);
  // console.log('Sim resp', sim_resp);
  // let result = ContractResult.fromSimulationResponse(
  //   sim_resp,
  //   tx.hash().toString('hex'),
  //   new Resources(0, 0, 0, 0, 0, 0, 0),
  //   client.parsers['propose']
  // );
  // if (result.result.isErr()) {
  //   let err = result.result.unwrapErr();
  //   if (err.type == ContractErrorType.InvokeHostFunctionEntryArchived) {
  //     // create a restore ledger entry tx_builder
  //   } else {
  //     throw result.result.unwrapErr();
  //   }
  // }
  // console.log('THIS IS SIM RESULT', result.result.unwrap());
  // let assembled_tx = SorobanRpc.assembleTransaction(tx, sim_resp).build();
  // assembled_tx.sign(config.getUser('PROPOSER'));
  // let tx_result = await rpc.sendTransaction(assembled_tx);
  // console.log(JSON.stringify(tx_result, null, 2));
  // //Poll
  // if (tx_result.status === 'PENDING') {
  //   await new Promise((resolve) => setTimeout(resolve, 2000));
  //   console.log('checking tx...');
  //   let response = await config.rpc.getTransaction(tx_result.hash);
  //   let status = response.status;
  //   while (status === 'NOT_FOUND') {
  //     await new Promise((resolve) => setTimeout(resolve, 2000));
  //     response = await config.rpc.getTransaction(tx_result.hash);
  //     status = response.status;
  //   }
  //   console.log(response);
  //   response = await config.rpc.getTransaction(tx_result.hash);
  //   console.log(response);
  //   let result = ContractResult.fromTransactionResponse(
  //     response,
  //     tx.hash().toString('hex'),
  //     Resources.fromTransaction(assembled_tx.toXDR()),
  //     client.parsers['propose']
  //   );
  //   if (result.result.isErr()) {
  //     throw result.result.unwrapErr();
  //   } else {
  //     console.log(result);
  //     console.log('This is result', result.result.unwrap());
  //   }
  // }
}

// async function testTransactionFlowSimple(addressBook: AddressBook) {
//   let rpc = new SorobanRpc.Server(config.rpc.serverURL.toString(), { allowHttp: true });
//   let account = await rpc.getAccount(config.admin.publicKey());
//   let votes = new VotesClient(addressBook.getContractId('votes'));
//   let { op: vote_balance_op, parser } = votes.getVotes({ account: config.admin.publicKey() });
//   let balanceTx = await AssembledTransaction.fromOperation({
//     operation: vote_balance_op.toXDR('base64'),
//     parseResultXdr: parser,
//     rpcUrl: rpc_network.rpc,
//     networkPassphrase: rpc_network.passphrase,
//     userAccount: account,
//   });
//   console.log(ContractResult.fromSimulationResponse(await balanceTx.simulate(), parser));
//   const signWithAdmin = (txXdr: string) =>
//     signWithKeypair(txXdr, rpc_network.passphrase, config.admin);
//   let { op, parser: result_parser } = votes.depositFor({
//     from: config.admin.publicKey(),
//     amount: 100000n,
//   });
//   let tx = await AssembledTransaction.fromOperation({
//     operation: op.toXDR('base64'),
//     parseResultXdr: result_parser,
//     rpcUrl: rpc_network.rpc,
//     networkPassphrase: rpc_network.passphrase,
//     userAccount: account,
//   });
//   let resp = await tx.simulate();
//   console.log('Sim resp', resp);
//   let sim_result = tx.parseSimulationResponse();
//   if (sim_result.result.isErr()) {
//     if (sim_result.result.unwrapErr().type === ContractErrorType.InvokeHostFunctionEntryArchived) {
//       // restore ledger entries
//     } else {
//       throw sim_result.result.unwrapErr();
//     }
//   }
//   console.log('about to sign and submit');
//   let result = await tx.signAndSubmit(undefined, undefined, config.admin);
//   console.log('completed sign and submit');
//   console.log(result);
//   console.log(ContractResult.fromSimulationResponse(await balanceTx.simulate(), parser));
// }

// async function deploy(addressBook: AddressBook) {
//   await installContract('governor', addressBook, config.admin);
//   await bumpContractCode('governor', addressBook, config.admin);
//   await deployContract('governor', 'governor', addressBook, config.admin);
//   await bumpContractInstance('governor', addressBook, config.admin);

//   await tryDeployStellarAsset(
//     addressBook,
//     config.admin,
//     new Asset('VoteToken', config.admin.publicKey())
//   );
//   await installContract('votes', addressBook, config.admin);
//   await bumpContractCode('votes', addressBook, config.admin);
//   await deployContract('votes', 'votes', addressBook, config.admin);
//   await bumpContractInstance('votes', addressBook, config.admin);
// }

async function restore(addressBook: AddressBook) {
  // let user = config.getUser('TEST');
  // let test = await config.rpc.getLatestLedger();
  // let data = await config.rpc.getContractData(
  //   'CAZA65HCGNNKGO7P66YNH3RSBVLCOJX5JXYCCUR66MMMBCT7ING4DBJL',
  //   xdr.ScVal.scvSymbol('ProposalId'),
  //   SorobanRpc.Durability.Persistent
  // );
  // let user = config.getUser('WHALE');
  // console.log(data);
  // console.log(test);
  // // let backstop = new EmitterContract(addressBook.getContractId('emitter'));
  // // let op = backstop.({
  // //   from: user.publicKey(),
  // //   pool_address: addressBook.getContractId('Stellar'),
  // //   amount: 1n,
  // // });
  // let account = await config.rpc.getAccount(user.publicKey());
  // const tx_builder = new TransactionBuilder(account, {
  //   fee: '1000',
  //   timebounds: { minTime: 0, maxTime: 0 },
  //   networkPassphrase: rpc_network.passphrase,
  // }).setTimeout(TimeoutInfinite);
  // const asset = xdr.ScVal.scvVec([
  //   xdr.ScVal.scvSymbol('Stellar'),
  //   Address.fromString(addressBook.getContractId('wBTC')).toScVal(),
  // ]);
  // tx_builder.addOperation(
  //   xdr.Operation.fromXDR(
  //     new PoolContract(addressBook.getContractId('Stellar')).submit({
  //       from: user.publicKey(),
  //       spender: user.publicKey(),
  //       to: user.publicKey(),
  //       requests: [
  //         {
  //           amount: 100000n,
  //           request_type: RequestType.Borrow,
  //           address: addressBook.getContractId('USDC'),
  //         },
  //       ],
  //     }),
  //     'base64'
  //   )
  // );
  // const tx = tx_builder.build();
  // let sim_resp = await config.rpc.simulateTransaction(tx);
  // console.log(sim_resp);
  // if (SorobanRpc.Api.isSimulationRestore(sim_resp)) {
  //   console.log('expired!');
  //   let account = await config.rpc.getAccount(user.publicKey());
  //   let fee = parseInt(BASE_FEE);
  //   fee += parseInt(sim_resp.restorePreamble.minResourceFee);
  //   const restoreTx = new TransactionBuilder(account, { fee: fee.toString() })
  //     .setTimeout(TimeoutInfinite)
  //     .setNetworkPassphrase(rpc_network.passphrase)
  //     .setSorobanData(sim_resp.restorePreamble.transactionData.build())
  //     .addOperation(Operation.restoreFootprint({}))
  //     .build();
  //   restoreTx.sign(user);
  //   await sendTransaction(restoreTx, (_: string) => undefined);
  // }
}

const network = process.argv[2];
const addressBook = AddressBook.loadFromFile(network);
const rpc_network: Network = {
  rpc: config.rpc.serverURL.toString(),
  passphrase: config.passphrase,
  opts: { allowHttp: true },
};
// const tx_options: TxParams = {
//   sim: false,
//   pollingInterval: 2000,
//   timeout: 30000,
//   builderOptions: {
//     fee: '10000',
//     timebounds: {
//       minTime: 0,
//       maxTime: 0,
//     },
//     networkPassphrase: config.passphrase,
//   },
// };
await debug(addressBook);
