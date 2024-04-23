import { config } from '../utils/env_config.js';
import { Account, Address, Asset } from '@stellar/stellar-sdk';
import {
  BackstopContract,
  Network,
  PoolContract,
  Request,
  RequestType,
  ReserveConfig,
  ReserveEmissionMetadata,
  u128,
} from '@blend-capital/blend-sdk';
import { Keypair } from '@stellar/stellar-sdk';
import { airdropAccount } from '../utils/contract.js';
import { TxParams, invokeClassicOp, invokeSorobanOperation, signWithKeypair } from '../utils/tx.js';
import { TokenContract } from '../external/token.js';
import { AddressBook } from '../utils/address-book.js';
import { CometContract } from '../external/comet.js';
import { OracleContract } from '../external/oracle.js';

interface User {
  keypair: Keypair;
  wallet: {
    xlm: u128;
    weth: u128;
    wbtc: u128;
    usdc: u128;
  };
  bridge_pool_collateral: {
    xlm: u128;
    weth: u128;
    wbtc: u128;
    usdc: u128;
  };
  bridge_pool_liabilities: {
    xlm: u128;
    weth: u128;
    wbtc: u128;
    usdc: u128;
  };
  stellar_pool_collateral: {
    xlm: u128;
    usdc: u128;
  };
  stellar_pool_liabilities: {
    xlm: u128;
    usdc: u128;
  };
}

const user: User = {
  keypair: Keypair.random(),
  wallet: {
    xlm: BigInt(9000e7),
    weth: BigInt(10000e7),
    wbtc: BigInt(10e7),
    usdc: BigInt(1e7),
  },
  bridge_pool_collateral: {
    xlm: BigInt(0),
    weth: BigInt(0),
    wbtc: BigInt(0),
    usdc: BigInt(0),
  },
  bridge_pool_liabilities: {
    xlm: BigInt(0),
    weth: BigInt(0),
    wbtc: BigInt(0),
    usdc: BigInt(0),
  },
  stellar_pool_collateral: {
    xlm: BigInt(0),
    usdc: BigInt(0),
  },
  stellar_pool_liabilities: {
    xlm: BigInt(0),
    usdc: BigInt(0),
  },
};
// asset index is 0 usdc, 1 xlm, 2 weth, 3 wbtc
// oracle is 9 decimals
const network = process.argv[2];
const addressBook = AddressBook.loadFromFile(network);
const usdc_asset = new Asset('USDC', config.admin.publicKey());
const usdc_token = new TokenContract(addressBook.getContractId('USDC'), usdc_asset);
const weth_asset = new Asset('wETH', config.admin.publicKey());
const weth_token = new TokenContract(addressBook.getContractId('wETH'), weth_asset);
const wbtc_asset = new Asset('wBTC', config.admin.publicKey());
const wbtc_token = new TokenContract(addressBook.getContractId('wBTC'), wbtc_asset);
const rpc_network: Network = {
  rpc: config.rpc.serverURL.toString(),
  passphrase: config.passphrase,
  opts: { allowHttp: true },
};

async function randomize_prices(
  addressBook: AddressBook,
  last_prices: bigint[],
  vol: bigint,
  admin_tx_options: TxParams
): Promise<bigint[]> {
  // Initialize Contracts
  const oracle = new OracleContract(addressBook.getContractId('oraclemock'));
  // Randomize Prices
  const new_prices = last_prices.map((price) => {
    if (price == BigInt(1_000_000_000)) return price;
    return (
      (price *
        (BigInt(1_000_000_000) + BigInt(Math.ceil(Math.random() * 10_000_000) - 5_000_000) * vol)) /
      BigInt(1_000_000_000)
    );
  });
  console.log('');
  console.log('new prices: ', new_prices);
  console.log('');

  await invokeSorobanOperation(
    oracle.setPriceStable(new_prices),
    () => undefined,
    admin_tx_options
  );
  return new_prices;
}
async function randomize_user_action(
  addressBook: AddressBook,
  last_prices: bigint[],
  users: User[],
  admin_tx_options: TxParams
): Promise<User[]> {
  let user: User;
  let user_tx_options: TxParams;
  if (Math.random() > 0.8 || users.length == 0) {
    const new_kp = Keypair.random();
    await airdropAccount(new_kp);
    let account: Account;
    try {
      account = await config.rpc.getAccount(new_kp.publicKey());
    } catch (error) {
      console.log('Error getting account.. trying again');
      await new Promise((resolve) => setTimeout(resolve, 100000));
      account = await config.rpc.getAccount(new_kp.publicKey());
      // Handle error here
    }

    user_tx_options = {
      account: account,
      signerFunction: (txXdr: string) => signWithKeypair(txXdr, rpc_network.passphrase, new_kp),
      txBuilderOptions: {
        fee: '10000',
        timebounds: {
          minTime: 0,
          maxTime: 0,
        },
        networkPassphrase: config.passphrase,
      },
    };
    console.log('new user created');
    await invokeClassicOp(usdc_token.classic_trustline(new_kp.publicKey()), user_tx_options);
    await invokeClassicOp(usdc_token.classic_mint(new_kp.publicKey(), '10000'), admin_tx_options);
    await invokeClassicOp(weth_token.classic_trustline(new_kp.publicKey()), user_tx_options);
    await invokeClassicOp(weth_token.classic_mint(new_kp.publicKey(), '10'), admin_tx_options);
    await invokeClassicOp(wbtc_token.classic_trustline(new_kp.publicKey()), user_tx_options);
    await invokeClassicOp(wbtc_token.classic_mint(new_kp.publicKey(), '1'), admin_tx_options);
    console.log('assets minted');
    user = {
      keypair: new_kp,
      wallet: {
        xlm: BigInt(9000e7),
        usdc: BigInt(10000e7),
        weth: BigInt(10e7),
        wbtc: BigInt(1e7),
      },
      bridge_pool_collateral: {
        xlm: BigInt(0),
        weth: BigInt(0),
        wbtc: BigInt(0),
        usdc: BigInt(0),
      },
      bridge_pool_liabilities: {
        xlm: BigInt(0),
        weth: BigInt(0),
        wbtc: BigInt(0),
        usdc: BigInt(0),
      },
      stellar_pool_collateral: {
        xlm: BigInt(0),
        usdc: BigInt(0),
      },
      stellar_pool_liabilities: {
        xlm: BigInt(0),
        usdc: BigInt(0),
      },
    };
  } else {
    user = users.splice(Math.floor(Math.random() * users.length))[0];
    user_tx_options = {
      account: await config.rpc.getAccount(user.keypair.publicKey()),
      signerFunction: (txXdr: string) =>
        signWithKeypair(txXdr, rpc_network.passphrase, user.keypair),
      txBuilderOptions: {
        fee: '10000',
        timebounds: {
          minTime: 0,
          maxTime: 0,
        },
        networkPassphrase: config.passphrase,
      },
    };
  }
  let pool = 'bridge';
  let pool_client = new PoolContract(addressBook.getContractId('Bridge'));

  const num_requests = Math.floor(Math.random() * 10) % 3;
  const requests: Request[] = [];
  let borrowing_power = BigInt(0);
  if (pool == 'bridge') {
    borrowing_power +=
      (user.bridge_pool_collateral.xlm * last_prices[1] * BigInt(9)) / BigInt(10) +
      (user.bridge_pool_collateral.weth * last_prices[2] * BigInt(85)) / BigInt(100) +
      (user.bridge_pool_collateral.wbtc * last_prices[3] * BigInt(9)) / BigInt(10) +
      (user.bridge_pool_collateral.usdc * last_prices[0] * BigInt(95)) / BigInt(100);
    borrowing_power -=
      (user.bridge_pool_liabilities.xlm * last_prices[1] * BigInt(9)) / BigInt(10) +
      (user.bridge_pool_liabilities.weth * last_prices[2] * BigInt(8)) / BigInt(10) +
      (user.bridge_pool_liabilities.wbtc * last_prices[3] * BigInt(9)) / BigInt(10) +
      (user.bridge_pool_collateral.usdc * last_prices[0] * BigInt(95)) / BigInt(100);
  } else {
    borrowing_power +=
      (user.stellar_pool_collateral.xlm * last_prices[1] * BigInt(10)) / BigInt(9) +
      (user.stellar_pool_collateral.usdc * BigInt(100)) / BigInt(95);
    borrowing_power -=
      (user.stellar_pool_liabilities.xlm * last_prices[1] * BigInt(100)) / BigInt(85) +
      (user.stellar_pool_liabilities.usdc * BigInt(100)) / BigInt(90);
  }
  for (let i = 0; i <= num_requests; i++) {
    let address;
    let wallet_balance;
    let pool_collateral;
    let pool_liability;
    let request_type;
    let amount;
    let cFactor = BigInt(1);
    let dFactor = BigInt(1);
    let price = BigInt(0);

    const asset_seed = Math.random();
    if (pool == 'bridge') {
      if (Math.floor(asset_seed * 10) % 4 == 0) {
        address = weth_token.address().toString();
        wallet_balance = user.wallet.weth;
        pool_collateral = user.bridge_pool_collateral.weth;
        pool_liability = user.bridge_pool_liabilities.weth;
        cFactor = BigInt(85);
        dFactor = BigInt(80);
        price = last_prices[2];
      } else if (Math.floor(asset_seed * 10) % 3 == 1) {
        address = wbtc_token.address().toString();
        wallet_balance = user.wallet.wbtc;
        pool_collateral = user.bridge_pool_collateral.wbtc;
        pool_liability = user.bridge_pool_liabilities.wbtc;
        cFactor = BigInt(90);
        dFactor = BigInt(90);
        price = last_prices[3];
      } else if (Math.floor(asset_seed * 10) % 3 == 2) {
        address = addressBook.getContractId('XLM');
        wallet_balance = user.wallet.xlm;
        pool_collateral = user.bridge_pool_collateral.xlm;
        pool_liability = user.bridge_pool_liabilities.xlm;
        cFactor = BigInt(90);
        dFactor = BigInt(90);
        price = last_prices[1];
      } else {
        address = usdc_token.address().toString();
        wallet_balance = user.wallet.usdc;
        pool_collateral = user.bridge_pool_collateral.usdc;
        pool_liability = user.bridge_pool_liabilities.usdc;
        cFactor = BigInt(95);
        dFactor = BigInt(95);
        price = last_prices[0];
      }
    } else {
      if (Math.floor(asset_seed * 10) % 2 == 0) {
        address = usdc_token.address().toString();
        wallet_balance = user.wallet.usdc;
        pool_collateral = user.stellar_pool_collateral.usdc;
        pool_liability = user.stellar_pool_liabilities.usdc;
        cFactor = BigInt(95);
        dFactor = BigInt(90);
        price = BigInt(1e9);
      } else {
        address = addressBook.getContractId('XLM');
        wallet_balance = user.wallet.xlm;
        pool_collateral = user.stellar_pool_collateral.xlm;
        pool_liability = user.stellar_pool_liabilities.xlm;
        cFactor = BigInt(90);
        dFactor = BigInt(85);
        price = last_prices[1];
      }
    }
    const action_seed = Math.random();
    if (Math.floor(action_seed * 10) % 4 == 0) {
      request_type = RequestType.SupplyCollateral;
      amount = BigInt(Math.floor(Number(wallet_balance - wallet_balance / BigInt(5))));
      if (amount < BigInt(10)) {
        continue;
      }
      if (address == addressBook.getContractId('XLM')) {
        user.wallet.xlm -= amount;
        if (pool == 'bridge') {
          user.bridge_pool_collateral.xlm += amount;
        } else {
          user.stellar_pool_collateral.xlm += amount;
        }
      } else if (address == usdc_token.address().toString()) {
        if (user.stellar_pool_collateral.xlm > BigInt(0)) {
          continue;
        }
        if (pool == 'stellar') {
          user.wallet.usdc -= amount;
          user.stellar_pool_collateral.usdc += amount;
        } else {
          user.wallet.usdc -= amount;
          user.bridge_pool_collateral.usdc += amount;
        }
      } else if (address == weth_token.address().toString()) {
        if (user.bridge_pool_collateral.wbtc > BigInt(0)) {
          continue;
        }
        user.wallet.weth -= amount;
        user.bridge_pool_collateral.weth += amount;
      } else {
        if (user.bridge_pool_collateral.weth > BigInt(0)) {
          continue;
        }
        user.wallet.wbtc -= amount;
        user.bridge_pool_collateral.wbtc += amount;
      }
      borrowing_power += (((amount * price) / BigInt(1e9)) * cFactor) / BigInt(100);
    } else if (Math.floor(action_seed * 10) % 4 == 1) {
      continue; //TODO remove - we just wanna force liqs
      request_type = RequestType.Repay;
      amount = BigInt(Math.floor(Number(pool_liability / BigInt(5))));

      if (amount < BigInt(10) || amount > wallet_balance) {
        continue;
      }
      borrowing_power += (((amount * price) / BigInt(1e9)) * BigInt(100)) / dFactor;
      if (address == addressBook.getContractId('XLM')) {
        user.wallet.xlm -= amount;
        if (pool == 'bridge') {
          user.bridge_pool_liabilities.xlm -= amount;
        } else {
          user.stellar_pool_liabilities.xlm -= amount;
        }
      } else if (address == usdc_token.address().toString()) {
        user.wallet.usdc -= amount;
        user.stellar_pool_liabilities.usdc -= amount;
      } else if (address == weth_token.address().toString()) {
        user.wallet.weth -= amount;
        user.bridge_pool_liabilities.weth -= amount;
      } else {
        user.wallet.wbtc -= amount;
        user.bridge_pool_liabilities.wbtc -= amount;
      }
    } else if (Math.floor(action_seed * 10) % 4 == 2) {
      continue; //TODO remove - we just wanna force liqs
      request_type = RequestType.WithdrawCollateral;
      amount = BigInt(Math.floor(Number(pool_collateral / BigInt(5))));
      if (amount < BigInt(10)) {
        continue;
      }
      borrowing_power -= (((amount * price) / BigInt(1e9)) * cFactor) / BigInt(100);
      if (borrowing_power < 0) {
        continue;
      }
      if (address == addressBook.getContractId('XLM')) {
        user.wallet.xlm += amount;
        if (pool == 'bridge') {
          user.bridge_pool_collateral.xlm -= amount;
        } else {
          user.stellar_pool_collateral.xlm -= amount;
        }
      } else if (address == usdc_token.address) {
        user.wallet.usdc += amount;
        user.stellar_pool_collateral.usdc -= amount;
      } else if (address == weth_token.address) {
        user.wallet.weth += amount;
        user.bridge_pool_collateral.weth -= amount;
      } else {
        user.wallet.wbtc += amount;
        user.bridge_pool_collateral.wbtc -= amount;
      }
    } else {
      if (address == addressBook.getContractId('XLM')) {
        continue;
      }
      request_type = RequestType.Borrow;
      amount = BigInt(
        Math.floor(Number(((borrowing_power / price) * dFactor * BigInt(98)) / BigInt(10000)))
      );
      if (amount < BigInt(10)) {
        continue;
      }
      if (address == usdc_token.address().toString()) {
        user.wallet.usdc += amount;
        user.bridge_pool_liabilities.usdc += amount;
      } else if (address == weth_token.address().toString()) {
        if (user.bridge_pool_liabilities.wbtc > BigInt(0)) {
          continue;
        }
        user.wallet.weth += amount;
        user.bridge_pool_liabilities.weth += amount;
      } else {
        if (user.bridge_pool_liabilities.weth > BigInt(0)) {
          continue;
        }
        user.wallet.wbtc += amount;
        user.bridge_pool_liabilities.wbtc += amount;
      }
      borrowing_power = BigInt(0);
    }

    requests.push({
      amount: amount,
      request_type: request_type,
      address: address,
    });
  }

  try {
    await invokeSorobanOperation(
      pool_client.submit({
        from: user.keypair.publicKey(),
        spender: user.keypair.publicKey(),
        to: user.keypair.publicKey(),
        requests: requests,
      }),
      PoolContract.parsers.submit,
      user_tx_options
    );
  } catch (error) {
    console.error(error);
  }
  users.push(user);
  return users;
}
async function simulate(addressBook: AddressBook) {
  let last_prices = [
    BigInt(1e9),
    BigInt(0.12e9),
    BigInt(2000e9),
    BigInt(36000e9),
    BigInt(0.05e9),
    BigInt(0.24e9),
  ];
  let users: User[] = [];
  const liquidator = config.getUser('LIQUIDATOR');
  const signWithAdmin = (txXdr: string) =>
    signWithKeypair(txXdr, rpc_network.passphrase, config.admin);
  const signWithLiquidator = (txXdr: string) =>
    signWithKeypair(txXdr, rpc_network.passphrase, liquidator);
  await airdropAccount(liquidator);
  const liquidator_tx_options: TxParams = {
    account: await config.rpc.getAccount(liquidator.publicKey()),
    signerFunction: signWithLiquidator,
    txBuilderOptions: {
      fee: '10000',
      timebounds: {
        minTime: 0,
        maxTime: 0,
      },
      networkPassphrase: config.passphrase,
    },
  };
  const admin_tx_options: TxParams = {
    account: await config.rpc.getAccount(config.admin.publicKey()),
    signerFunction: signWithAdmin,
    txBuilderOptions: {
      fee: '10000',
      timebounds: {
        minTime: 0,
        maxTime: 0,
      },
      networkPassphrase: config.passphrase,
    },
  };
  const bridgePool = new PoolContract(addressBook.getContractId('Bridge'));
  const stellarPool = new PoolContract(addressBook.getContractId('Stellar'));
  // console.log('minting tokens to liquidator');
  // await invokeClassicOp(
  //   usdc_token.classic_trustline(liquidator.publicKey()),
  //   liquidator_tx_options
  // );
  // await invokeClassicOp(
  //   usdc_token.classic_mint(liquidator.publicKey(), '100000000'),
  //   admin_tx_options
  // );
  // await invokeClassicOp(
  //   weth_token.classic_trustline(liquidator.publicKey()),
  //   liquidator_tx_options
  // );
  // await invokeClassicOp(
  //   weth_token.classic_mint(liquidator.publicKey(), '1000000'),
  //   admin_tx_options
  // );
  // await invokeClassicOp(
  //   wbtc_token.classic_trustline(liquidator.publicKey()),
  //   liquidator_tx_options
  // );
  // await invokeClassicOp(
  //   wbtc_token.classic_mint(liquidator.publicKey(), '100000'),
  //   admin_tx_options
  // );
  // // console.log('Whale Supply tokens to Stellar pool');

  // // const stellarRequests: Request[] = [
  // //   {
  // //     amount: BigInt(100000000e7),
  // //     request_type: RequestType.SupplyCollateral,
  // //     address: addressBook.getContractId('USDC'),
  // //   },
  // // ];

  // // await invokeSorobanOperation(
  // //   bridgePool.submit({
  // //     from: liquidator.publicKey(),
  // //     spender: liquidator.publicKey(),
  // //     to: liquidator.publicKey(),
  // //     requests: stellarRequests,
  // //   }),
  // //   PoolContract.parsers.submit,
  // //   liquidator_tx_options
  // // );

  // console.log('Whale Supply tokens to Bridge pool');
  // const bridgeSupplyRequests: Request[] = [
  //   {
  //     amount: BigInt(100000e7),
  //     request_type: RequestType.SupplyCollateral,
  //     address: addressBook.getContractId('wETH'),
  //   },
  //   {
  //     amount: BigInt(100000000000),
  //     request_type: RequestType.SupplyCollateral,
  //     address: addressBook.getContractId('wBTC'),
  //   },
  //   {
  //     amount: BigInt(100000000e7),
  //     request_type: RequestType.SupplyCollateral,
  //     address: addressBook.getContractId('USDC'),
  //   },
  // ];
  // await invokeSorobanOperation(
  //   bridgePool.submit({
  //     from: liquidator.publicKey(),
  //     spender: liquidator.publicKey(),
  //     to: liquidator.publicKey(),
  //     requests: bridgeSupplyRequests,
  //   }),
  //   PoolContract.parsers.submit,
  //   liquidator_tx_options
  // );
  // const comet = new CometContract(addressBook.getContractId('comet'));

  // await invokeClassicOp(
  //   usdc_token.classic_mint(liquidator.publicKey(), '100000'),
  //   admin_tx_options
  // );
  // console.log('minting lp tokens');
  // // mint lp tokens to whale
  // await invokeSorobanOperation(
  //   comet.deposit_single_max_out(
  //     usdc_token.address().toString(),
  //     BigInt(1000e7),
  //     BigInt(1e7),
  //     liquidator.publicKey()
  //   ),
  //   () => undefined,
  //   liquidator_tx_options
  // );
  // console.log('update backstop token lp value');
  // const backstop = new BackstopContract(addressBook.getContractId('backstop'));
  // await invokeSorobanOperation(backstop.updateTokenValue(), () => undefined, liquidator_tx_options);
  console.log('starting simulations');
  for (let i = 0; i < 10000; i++) {
    console.log('iteration: ', i);
    if (i % 5 == 0) {
      last_prices = await randomize_prices(addressBook, last_prices, BigInt(20), admin_tx_options);
    }
    users = await randomize_user_action(addressBook, last_prices, users, admin_tx_options);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

await simulate(addressBook);
