import { config } from '../utils/env_config.js';
import { AddressBook } from '../utils/address_book.js';
import { OracleClient } from '../external/oracle.js';
import { Address, Asset } from 'stellar-sdk';
import {
  BackstopClient,
  Network,
  PoolClient,
  PoolFactoryClient,
  Request,
  RequestType,
  ReserveConfig,
  ReserveEmissionMetadata,
  TxOptions,
  u128,
} from '@blend-capital/blend-sdk';
import { Keypair } from 'stellar-sdk';
import { airdropAccount } from '../utils/contract.js';
import { TokenClient } from '../external/token.js';
import { logInvocation, signWithKeypair } from '../utils/tx.js';
import { CometClient } from '../external/comet.js';

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
  };
  bridge_pool_liabilities: {
    xlm: u128;
    weth: u128;
    wbtc: u128;
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
  },
  bridge_pool_liabilities: {
    xlm: BigInt(0),
    weth: BigInt(0),
    wbtc: BigInt(0),
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
const usdc_token = new TokenClient(addressBook.getContractId('USDC'));
const usdc_asset = new Asset('USDC', config.admin.publicKey());
const weth_token = new TokenClient(addressBook.getContractId('wETH'));
const weth_asset = new Asset('wETH', config.admin.publicKey());
const wbtc_token = new TokenClient(addressBook.getContractId('wBTC'));
const rpc_network: Network = {
  rpc: config.rpc.serverURL.toString(),
  passphrase: config.passphrase,
  opts: { allowHttp: true },
};
const tx_options: TxOptions = {
  sim: false,
  pollingInterval: 2000,
  timeout: 30000,
  builderOptions: {
    fee: '10000',
    timebounds: {
      minTime: 0,
      maxTime: 0,
    },
    networkPassphrase: config.passphrase,
  },
};
const wbtc_asset = new Asset('wBTC', config.admin.publicKey());

async function randomize_prices(
  addressBook: AddressBook,
  last_prices: bigint[],
  vol: bigint
): Promise<bigint[]> {
  // Initialize Contracts
  const oracle = new OracleClient(addressBook.getContractId('oraclemock'));
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

  await oracle.setPriceStable(new_prices, config.admin);
  return new_prices;
}
async function randomize_user_action(
  addressBook: AddressBook,
  last_prices: bigint[],
  users: User[]
): Promise<User[]> {
  let user: User;
  if (Math.random() > 0.8 || users.length == 0) {
    const new_kp = Keypair.random();
    await airdropAccount(new_kp);
    console.log('new user created');
    await usdc_token.classic_trustline(new_kp, usdc_asset, new_kp);
    await usdc_token.classic_mint(new_kp, usdc_asset, '10000', config.admin);
    await weth_token.classic_trustline(new_kp, weth_asset, new_kp);
    await weth_token.classic_mint(new_kp, weth_asset, '10', config.admin);
    await wbtc_token.classic_trustline(new_kp, wbtc_asset, new_kp);
    await wbtc_token.classic_mint(new_kp, wbtc_asset, '1', config.admin);
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
      },
      bridge_pool_liabilities: {
        xlm: BigInt(0),
        weth: BigInt(0),
        wbtc: BigInt(0),
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
  }
  let pool;
  let pool_client;
  if (Math.floor(Math.random() * 10) % 2 == 0) {
    console.log('using bridge pool');
    pool = 'bridge';
    pool_client = new PoolClient(addressBook.getContractId('Bridge'));
  } else {
    console.log('using stellar pool');
    pool = 'stellar';
    pool_client = new PoolClient(addressBook.getContractId('Stellar'));
  }
  const num_requests = Math.floor(Math.random() * 10) % 3;
  const requests: Request[] = [];
  let borrowing_power = BigInt(0);
  if (pool == 'bridge') {
    borrowing_power +=
      (user.bridge_pool_collateral.xlm * last_prices[1] * BigInt(9)) / BigInt(10) +
      (user.bridge_pool_collateral.weth * last_prices[2] * BigInt(80)) / BigInt(100) +
      (user.bridge_pool_collateral.wbtc * last_prices[3] * BigInt(9)) / BigInt(10);
    borrowing_power -=
      (user.bridge_pool_liabilities.xlm * last_prices[1] * BigInt(9)) / BigInt(10) +
      (user.bridge_pool_liabilities.weth * last_prices[2] * BigInt(8)) / BigInt(10) +
      (user.bridge_pool_liabilities.wbtc * last_prices[3] * BigInt(9)) / BigInt(10);
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
      if (Math.floor(asset_seed * 10) % 3 == 0) {
        address = weth_token.address;
        wallet_balance = user.wallet.weth;
        pool_collateral = user.bridge_pool_collateral.weth;
        pool_liability = user.bridge_pool_liabilities.weth;
        cFactor = BigInt(85);
        dFactor = BigInt(80);
        price = last_prices[2];
      } else if (Math.floor(asset_seed * 10) % 3 == 1) {
        address = wbtc_token.address;
        wallet_balance = user.wallet.wbtc;
        pool_collateral = user.bridge_pool_collateral.wbtc;
        pool_liability = user.bridge_pool_liabilities.wbtc;
        cFactor = BigInt(90);
        dFactor = BigInt(90);
        price = last_prices[3];
      } else {
        address = addressBook.getContractId('XLM');
        wallet_balance = user.wallet.xlm;
        pool_collateral = user.bridge_pool_collateral.xlm;
        pool_liability = user.bridge_pool_liabilities.xlm;
        cFactor = BigInt(90);
        dFactor = BigInt(90);
        price = last_prices[1];
      }
    } else {
      if (Math.floor(asset_seed * 10) % 2 == 0) {
        address = usdc_token.address;
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
      } else if (address == usdc_token.address) {
        if (user.stellar_pool_collateral.xlm > BigInt(0)) {
          continue;
        }
        user.wallet.usdc -= amount;
        user.stellar_pool_collateral.usdc += amount;
      } else if (address == weth_token.address) {
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
      } else if (address == usdc_token.address) {
        user.wallet.usdc -= amount;
        user.stellar_pool_liabilities.usdc -= amount;
      } else if (address == weth_token.address) {
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
      if (address == usdc_token.address) {
        user.wallet.usdc += amount;
        user.stellar_pool_liabilities.usdc += amount;
      } else if (address == weth_token.address) {
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
  const signWithUser = (txXdr: string) =>
    signWithKeypair(txXdr, rpc_network.passphrase, user.keypair);

  try {
    await logInvocation(
      pool_client.submit(user.keypair.publicKey(), signWithUser, rpc_network, tx_options, {
        from: user.keypair.publicKey(),
        spender: user.keypair.publicKey(),
        to: user.keypair.publicKey(),
        requests: requests,
      })
    );
  } catch (error) {
    console.error(error);
  }
  users.push(user);
  return users;
}
async function simulate(addressBook: AddressBook) {
  let last_prices = [BigInt(1e9), BigInt(0.05e9), BigInt(2000e9), BigInt(36000e9)];
  let users: User[] = [];
  const liquidator = config.getUser('LIQUIDATOR');
  const signWithLiquidator = (txXdr: string) =>
    signWithKeypair(txXdr, rpc_network.passphrase, liquidator);
  await airdropAccount(liquidator);

  const bridgePool = new PoolClient(addressBook.getContractId('Bridge'));
  const stellarPool = new PoolClient(addressBook.getContractId('Stellar'));
  console.log('minting tokens to whale');
  await usdc_token.classic_mint(liquidator, usdc_asset, '100000000', config.admin);
  await weth_token.classic_mint(liquidator, weth_asset, '1000000', config.admin);
  await wbtc_token.classic_mint(liquidator, wbtc_asset, '100000', config.admin);
  console.log('Whale Supply tokens to Stellar pool');

  const stellarRequests: Request[] = [
    {
      amount: BigInt(100000000e7),
      request_type: RequestType.SupplyCollateral,
      address: addressBook.getContractId('USDC'),
    },
  ];
  await logInvocation(
    stellarPool.submit(liquidator.publicKey(), signWithLiquidator, rpc_network, tx_options, {
      from: liquidator.publicKey(),
      spender: liquidator.publicKey(),
      to: liquidator.publicKey(),
      requests: stellarRequests,
    })
  );

  console.log('Whale Supply tokens to Bridge pool');
  const bridgeSupplyRequests: Request[] = [
    {
      amount: BigInt('1000000000000000'),
      request_type: RequestType.SupplyCollateral,
      address: addressBook.getContractId('wETH'),
    },
    {
      amount: BigInt(100000000000000),
      request_type: RequestType.SupplyCollateral,
      address: addressBook.getContractId('wBTC'),
    },
  ];
  await logInvocation(
    bridgePool.submit(liquidator.publicKey(), signWithLiquidator, rpc_network, tx_options, {
      from: liquidator.publicKey(),
      spender: liquidator.publicKey(),
      to: liquidator.publicKey(),
      requests: bridgeSupplyRequests,
    })
  );
  const comet = new CometClient(addressBook.getContractId('comet'));
  const blnd_token = new TokenClient(addressBook.getContractId('BLND'));
  const blnd_asset = new Asset('BLND', config.admin.publicKey());
  await blnd_token.classic_trustline(liquidator, blnd_asset, liquidator);
  await blnd_token.classic_mint(liquidator, blnd_asset, '10000000', config.admin);
  await usdc_token.classic_trustline(liquidator, usdc_asset, liquidator);
  await usdc_token.classic_mint(liquidator, usdc_asset, '100000', config.admin);

  // mint 200k tokens to whale
  await comet.joinPool(
    BigInt(200_000e7),
    [BigInt(2_001_000e7), BigInt(50_001e7)],
    liquidator.publicKey(),
    liquidator
  );
  console.log('starting simulations');
  for (let i = 0; i < 10000; i++) {
    console.log('iteration: ', i);
    if (i % 5 == 0) {
      last_prices = await randomize_prices(addressBook, last_prices, BigInt(20));
    }
    users = await randomize_user_action(addressBook, last_prices, users);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

await simulate(addressBook);
