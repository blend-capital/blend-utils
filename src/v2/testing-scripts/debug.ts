import {
  Backstop,
  BackstopContractV1,
  BackstopContractV2,
  ContractErrorType,
  EmitterContract,
  Network,
  PoolContractV1,
  PoolContractV2,
  PoolUser,
  PoolV1,
  PoolV2,
  RequestType,
  ReserveV1,
  UserBalance,
  Version,
} from '@blend-capital/blend-sdk';
import { config } from '../../utils/env_config.js';
import { addressBook } from '../../utils/address-book.js';
import { invokeClassicOp, invokeSorobanOperation, signWithKeypair } from '../../utils/tx.js';
import {
  Address,
  Asset,
  Keypair,
  nativeToScVal,
  scValToNative,
  TransactionBuilder,
  xdr,
} from '@stellar/stellar-sdk';
import { CometContract } from '../../external/comet.js';
import { TokenContract } from '../../external/token.js';
import { OracleContract } from '../../external/oracle.js';
import { createUserLiquidation as createUserLiquidationV2 } from '../auctionTest/auctions.js';
import { createUserLiquidation as createUserLiquidationV1 } from '../../v1/auctionTest/auctions.js';
import { airdropAccount } from '../../utils/contract.js';
import { emit } from 'process';

async function testPoolLoad() {
  const network: Network = {
    rpc: config.rpc.serverURL,
    passphrase: config.passphrase,
    opts: { allowHttp: true },
  };
  const admin = config.admin;
  const pool = new PoolContractV1(addressBook.getContractId('Testnet'));
  const txBuilderOptions: TransactionBuilder.TransactionBuilderOptions = {
    fee: '10000',
    timebounds: {
      minTime: 0,
      maxTime: 0,
    },
    networkPassphrase: config.passphrase,
  };
  const adminTxParams = {
    account: await config.rpc.getAccount(admin.publicKey()),
    txBuilderOptions,
    signerFunction: async (txXDR: string) => {
      return signWithKeypair(txXDR, config.passphrase, admin);
    },
  };
  const emitter = new EmitterContract(addressBook.getContractId('emitter'));
  const comet = new CometContract(addressBook.getContractId('comet'));
  // console.log(
  //   await invokeSorobanOperation(
  //     comet
  //       .call(
  //         'balance',
  //         ...[nativeToScVal(addressBook.getContractId('backstop'), { type: 'address' })]
  //       )
  //       .toXDR('base64'),
  //     (result: string) => scValToNative(xdr.ScVal.fromXDR(result, 'base64')),
  //     adminTxParams
  //   )
  // );
  const backstopV1 = new BackstopContractV1(addressBook.getContractId('backstop'));
  await invokeSorobanOperation(
    emitter.distribute(),
    EmitterContract.parsers.distribute,
    adminTxParams
  );

  await invokeSorobanOperation(
    backstopV1.gulpEmissions(),
    BackstopContractV1.parsers.gulpEmissions,
    adminTxParams,
    undefined
  );
  await invokeSorobanOperation(
    pool.gulpEmissions(),
    PoolContractV2.parsers.gulpEmissions,
    adminTxParams
  );
}

async function liquidateUser() {
  const liquidator = config.getUser('TEST');
  await airdropAccount(liquidator);
  const liquidatorTxParams = {
    account: await config.rpc.getAccount(liquidator.publicKey()),
    txBuilderOptions: {
      fee: '10000',
      timebounds: {
        minTime: 0,
        maxTime: 0,
      },
      networkPassphrase: config.passphrase,
    },
    signerFunction: async (txXDR: string) => {
      return signWithKeypair(txXDR, config.passphrase, liquidator);
    },
  };
  const user = Keypair.random();
  console.log(user.publicKey(), user.secret());
  try {
    await airdropAccount(user);
  } catch (e) {
    console.log('User already funded');
  }
  const userTxParams = {
    account: await config.rpc.getAccount(user.publicKey()),
    txBuilderOptions: {
      fee: '1000',
      timebounds: {
        minTime: 0,
        maxTime: 0,
      },
      networkPassphrase: config.passphrase,
    },
    signerFunction: async (txXDR: string) => {
      return signWithKeypair(txXDR, config.passphrase, user);
    },
  };
  await airdropAccount(config.admin);
  const adminTxParams = {
    account: await config.rpc.getAccount(config.admin.publicKey()),
    txBuilderOptions: {
      fee: '10000',
      timebounds: {
        minTime: 0,
        maxTime: 0,
      },
      networkPassphrase: config.passphrase,
    },
    signerFunction: async (txXDR: string) => {
      return signWithKeypair(txXDR, config.passphrase, config.admin);
    },
  };

  const supplier = config.getUser('WHALE');
  await airdropAccount(supplier);
  const supplierTxParams = {
    account: await config.rpc.getAccount(supplier.publicKey()),
    txBuilderOptions: {
      fee: '10000',
      timebounds: {
        minTime: 0,
        maxTime: 0,
      },
      networkPassphrase: config.passphrase,
    },
    signerFunction: async (txXDR: string) => {
      return signWithKeypair(txXDR, config.passphrase, supplier);
    },
  };

  const poolV1 = new PoolContractV1(addressBook.getContractId('Testnet'));

  const wETH = new TokenContract(
    addressBook.getContractId('wETH'),
    new Asset('wETH', config.admin.publicKey())
  );
  const wBTC = new TokenContract(
    addressBook.getContractId('wBTC'),
    new Asset('wBTC', config.admin.publicKey())
  );
  const USDC = new TokenContract(
    addressBook.getContractId('USDC'),
    new Asset('USDC', config.admin.publicKey())
  );
  const oracle = new OracleContract(addressBook.getContractId('oraclemock'));
  await invokeSorobanOperation(
    oracle.setPriceStable([BigInt(1e7), BigInt(0.1e7), BigInt(3000e7), BigInt(60000e7)]),
    () => undefined,
    adminTxParams
  );
  await invokeClassicOp(wETH.classic_trustline(user.publicKey()), userTxParams);
  await invokeClassicOp(wBTC.classic_trustline(user.publicKey()), userTxParams);
  await invokeClassicOp(USDC.classic_trustline(user.publicKey()), userTxParams);
  await invokeClassicOp(USDC.classic_mint(user.publicKey(), '200'), adminTxParams);

  await invokeClassicOp(wETH.classic_trustline(liquidator.publicKey()), liquidatorTxParams);
  await invokeClassicOp(wBTC.classic_trustline(liquidator.publicKey()), liquidatorTxParams);
  await invokeClassicOp(USDC.classic_trustline(liquidator.publicKey()), liquidatorTxParams);
  await invokeClassicOp(USDC.classic_mint(liquidator.publicKey(), '100000'), adminTxParams);
  await invokeClassicOp(wETH.classic_mint(liquidator.publicKey(), '1000'), adminTxParams);

  await invokeClassicOp(wETH.classic_trustline(supplier.publicKey()), supplierTxParams);
  await invokeClassicOp(wETH.classic_mint(supplier.publicKey(), '1000'), adminTxParams);
  // await invokeSorobanOperation(
  //   poolV1.submit({
  //     from: supplier.publicKey(),
  //     to: supplier.publicKey(),
  //     spender: supplier.publicKey(),
  //     requests: [
  //       {
  //         address: wETH.contractId(),
  //         amount: BigInt(1000e7),
  //         request_type: RequestType.Supply,
  //       },
  //     ],
  //   }),
  //   PoolContractV1.parsers.submit,
  //   supplierTxParams
  // );
  // await invokeSorobanOperation(
  //   poolV1.submit({
  //     from: liquidator.publicKey(),
  //     to: liquidator.publicKey(),
  //     spender: liquidator.publicKey(),
  //     requests: [
  //       {
  //         address: USDC.contractId(),
  //         amount: BigInt(10000e7),
  //         request_type: RequestType.SupplyCollateral,
  //       },
  //     ],
  //   }),
  //   PoolContractV1.parsers.submit,
  //   liquidatorTxParams
  // );

  await invokeSorobanOperation(
    poolV1.submit({
      from: user.publicKey(),
      to: user.publicKey(),
      spender: user.publicKey(),
      requests: [
        {
          address: USDC.contractId(),
          amount: BigInt(100e7),
          request_type: RequestType.SupplyCollateral,
        },
        {
          address: wETH.contractId(),
          amount: BigInt(0.0252993e7),
          request_type: RequestType.Borrow,
        },
        {
          address: addressBook.getContractId('XLM'),
          amount: BigInt(1e7),
          request_type: RequestType.Borrow,
        },
      ],
    }),
    PoolContractV1.parsers.submit,
    userTxParams
  );

  const Fixed = new PoolContractV1(addressBook.getContractId('PairTrade'));

  // await invokeSorobanOperation(
  //   Fixed.submit({
  //     from: liquidator.publicKey(),
  //     to: liquidator.publicKey(),
  //     spender: liquidator.publicKey(),
  //     requests: [
  //       {
  //         address: wBTC.contractId(),
  //         amount: BigInt(5e7),
  //         request_type: RequestType.Supply,
  //       },
  //     ],
  //   }),
  //   PoolContractV1.parsers.submit,
  //   liquidatorTxParams
  // );
  // await invokeSorobanOperation(
  //   Fixed.submit({
  //     from: user.publicKey(),
  //     to: user.publicKey(),
  //     spender: user.publicKey(),
  //     requests: [
  //       {
  //         address: Asset.native().contractId(config.passphrase),
  //         amount: BigInt(1000e7),
  //         request_type: RequestType.SupplyCollateral,
  //       },
  //       {
  //         address: wBTC.contractId(),
  //         amount: BigInt(0.00153e7),
  //         request_type: RequestType.Borrow,
  //       },
  //     ],
  //   }),
  //   PoolContractV1.parsers.submit,
  //   userTxParams
  // );
  await invokeSorobanOperation(
    oracle.setPriceStable([BigInt(1e7), BigInt(0.1e7), BigInt(3300e7), BigInt(66000e7)]),
    () => undefined,
    adminTxParams
  );

  await createUserLiquidationV1(
    liquidatorTxParams,
    addressBook.getContractId('Testnet'),
    user.publicKey(),
    undefined
  );
  return user;
}

async function testReserve() {
  const network: Network = {
    rpc: config.rpc.serverURL,
    passphrase: config.passphrase,
    opts: { allowHttp: true },
  };
  const admin = config.admin;
  const txBuilderOptions: TransactionBuilder.TransactionBuilderOptions = {
    fee: '10000',
    timebounds: {
      minTime: 0,
      maxTime: 0,
    },
    networkPassphrase: config.passphrase,
  };
  const adminTxParams = {
    account: await config.rpc.getAccount(admin.publicKey()),
    txBuilderOptions,
    signerFunction: async (txXDR: string) => {
      return signWithKeypair(txXDR, config.passphrase, admin);
    },
  };

  const pool = new PoolContractV1(addressBook.getContractId('Testnet'));
  const pairtrade = new PoolContractV1(addressBook.getContractId('PairTradeV1'));
  await createUserLiquidationV1(
    adminTxParams,
    addressBook.getContractId('Testnet'),
    'GBBMK76DUW3VD2SD4ZNKBSVCGWW44TG63CVYTPYXPNLYVPOXMDJURMDX',
    undefined
  );
  await createUserLiquidationV1(
    adminTxParams,
    addressBook.getContractId('PairTradeV1'),
    'GBBMK76DUW3VD2SD4ZNKBSVCGWW44TG63CVYTPYXPNLYVPOXMDJURMDX',
    undefined
  );
}

async function repay(user: Keypair) {
  // const user = Keypair.fromSecret('SCEG3C3H4H3NTVIO4CXOTMQNAJZHL4NL4QCYVRQCDJCURWCULI73G4FF');
  const userTxParams = {
    account: await config.rpc.getAccount(user.publicKey()),
    txBuilderOptions: {
      fee: '1000',
      timebounds: {
        minTime: 0,
        maxTime: 0,
      },
      networkPassphrase: config.passphrase,
    },
    signerFunction: async (txXDR: string) => {
      return signWithKeypair(txXDR, config.passphrase, user);
    },
  };
  const poolV1 = new PoolContractV1(addressBook.getContractId('Testnet'));
  await invokeSorobanOperation(
    poolV1.submit({
      from: user.publicKey(),
      to: user.publicKey(),
      spender: user.publicKey(),
      requests: [
        {
          address: addressBook.getContractId('XLM'),
          amount: BigInt(0.5e7),
          request_type: RequestType.Repay,
        },
      ],
    }),
    PoolContractV1.parsers.submit,
    userTxParams
  );
}

async function sauron(user: Keypair) {
  const sauron = config.getUser('AUCT');
  await airdropAccount(sauron);

  const sauronTxParams = {
    account: await config.rpc.getAccount(sauron.publicKey()),
    txBuilderOptions: {
      fee: '2000000000',
      timebounds: {
        minTime: 0,
        maxTime: 0,
      },
      networkPassphrase: config.passphrase,
    },
    signerFunction: async (txXDR: string) => {
      return signWithKeypair(txXDR, config.passphrase, sauron);
    },
  };

  const pool = new PoolContractV1(addressBook.getContractId('Testnet'));
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const tx = await invokeSorobanOperation(
        pool.submit({
          from: sauron.publicKey(),
          to: sauron.publicKey(),
          spender: sauron.publicKey(),
          requests: [
            {
              address: user.publicKey(),
              amount: BigInt(100),
              request_type: RequestType.FillUserLiquidationAuction,
            },
          ],
        }),
        PoolContractV1.parsers.submit,
        sauronTxParams
      );
      console.log('won auction');
      return true;
    } catch (e: any) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      if (e.type === ContractErrorType.InvokeHostFunctionTrapped) {
        console.log('lost auction');
        return false;
      }
    }
  }
}

async function generateKeys() {
  for (let i = 0; i < 5; i++) {
    const keypair = Keypair.random();
    await airdropAccount(keypair);
    console.log(keypair.publicKey(), keypair.secret());
  }
}

async function stressTest() {
  let wins = 0;
  for (let i = 0; i < 100; i++) {
    const user = await liquidateUser();
    await repay(user);

    const result = await sauron(user);
    if (result) {
      wins++;
    }
    console.log('Wins: ', wins, 'Out of: ', i + 1);
  }
}

export async function getUser() {
  const poolAddress = addressBook.getContractId('TestnetV2');
  const backstopAddress = addressBook.getContractId('backstopV2');
  const blndAddress = addressBook.getContractId('BLND');
  const usdcAddress = addressBook.getContractId('USDC');
  const cometAddress = addressBook.getContractId('comet');
  const admin = config.admin;
  const txBuilderOptions: TransactionBuilder.TransactionBuilderOptions = {
    fee: '10000',
    timebounds: {
      minTime: 0,
      maxTime: 0,
    },
    networkPassphrase: config.passphrase,
  };
  const adminTxParams = {
    account: await config.rpc.getAccount(admin.publicKey()),
    txBuilderOptions,
    signerFunction: async (txXDR: string) => {
      return signWithKeypair(txXDR, config.passphrase, admin);
    },
  };
  const whale = config.getUser('TEST');
  await airdropAccount(whale);
  const whaleTxParams = {
    account: await config.rpc.getAccount(whale.publicKey()),
    txBuilderOptions,
    signerFunction: async (txXDR: string) => {
      return signWithKeypair(txXDR, config.passphrase, whale);
    },
  };
  const backstop = new BackstopContractV2(backstopAddress);
  const BLND = new TokenContract(blndAddress, new Asset('BLND', adminTxParams.account.accountId()));
  const USDC = new TokenContract(usdcAddress, new Asset('USDC', adminTxParams.account.accountId()));
  const comet = new CometContract(cometAddress);
  // await invokeClassicOp(BLND.classic_trustline(whaleTxParams.account.accountId()), whaleTxParams);
  // await invokeClassicOp(
  //   BLND.classic_mint(whaleTxParams.account.accountId(), '100000'),
  //   adminTxParams
  // );
  // await invokeClassicOp(USDC.classic_trustline(whaleTxParams.account.accountId()), whaleTxParams);
  // await invokeClassicOp(
  //   USDC.classic_mint(whaleTxParams.account.accountId(), '2600'),
  //   adminTxParams
  // );

  // await invokeSorobanOperation(
  //   comet.joinPool(
  //     BigInt(8000e7),
  //     [BigInt(100000e7), BigInt(2600e7)],
  //     whaleTxParams.account.accountId()
  //   ),
  //   () => undefined,
  //   whaleTxParams
  // );

  await invokeSorobanOperation(
    backstop.deposit({
      from: whaleTxParams.account.accountId(),
      pool_address: poolAddress,
      amount: BigInt(1000e7),
    }),

    BackstopContractV2.parsers.deposit,
    whaleTxParams
  );
}

// Start funding
// Funded:  GBMRHADLJVODSY4KMRU72KWIL2YVJPBJQS34GZ6LAQYL6LEZXYW2ZZTD
// GBMRHADLJVODSY4KMRU72KWIL2YVJPBJQS34GZ6LAQYL6LEZXYW2ZZTD SCBIYPOIBJNK75QJMQCNL4WXJCHPPQHBMSNDYYR7E6EOJ3ZTA5S33K76
// Start funding
// Funded:  GBKVV4Q66GOIL7MV3QGX77ZFICKZ46UDXMFQJHRMZB4PGKTSDGCQ3IQK
// GBKVV4Q66GOIL7MV3QGX77ZFICKZ46UDXMFQJHRMZB4PGKTSDGCQ3IQK SAMG563VGN6FBVMN4NXNAV2N7VGL4YOYJFW5MN3GFZCHIRRQZ3I3NEID
// Start funding
// Funded:  GBHEWRYAHJHYBOIIUS4GON3U34TPW5ADD7KGUFEYMEDVWH6QUZBUCJCV
// GBHEWRYAHJHYBOIIUS4GON3U34TPW5ADD7KGUFEYMEDVWH6QUZBUCJCV SDRDSML5TPKA3HIBNJD2YY7LUCCN2CLNHEAMDHVXDY466DHZQ4KUDKVA
// Start funding
// Funded:  GBKYNCZPPUCOZEGAQPXOTP532WDVITA3JTRSPUCQ5P5MKFWTJEOVESYH
// GBKYNCZPPUCOZEGAQPXOTP532WDVITA3JTRSPUCQ5P5MKFWTJEOVESYH SADJAE7XBN7MD7K34ATJMNIJBQ2OBBKZ4AIP4JIJYDH2O2RJAAROLVXF
// Start funding
// Funded:  GC4OUQJF5ENCXWUXM6GWYPKBC4CGLUP7UEKHH7XYBNVWLQV3OCTAMWI4
// GC4OUQJF5ENCXWUXM6GWYPKBC4CGLUP7UEKHH7XYBNVWLQV3OCTAMWI4 SBRV7RD2XXEPWW4TRUHNLVLGZN3HGGLE3PHALRL5GD3SA2FHLE6YOHET

await testPoolLoad();
