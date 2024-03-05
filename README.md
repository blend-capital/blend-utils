# blend-utils

Deployment and utility scripts for interacting with the Blend Protocol and setting up mock environments.

## Requirements

- Clone the [blend-contracts](https://github.com/blend-capital/blend-contracts) and build the contracts. This needs to be a sibling, ie:

```
parent-folder/
    blend-utils/
    blend-contracts/
```

## Setup

1. Install Node.JS dependencies:

```bash
npm i
```

2. Compile the scripts

```bash
npm run build
```

3. Create a `.env` file based on the `.env.example` file

## Deploy

The deployment script takes in a single "network" parameter that defines what is deployed.

If the network is mainnet, no mocked contracts will be deployed (like the `mock_oracle`). A `network.contracts.json` file will be created or replaced with the newly deployed contract addresses and WASM hashes used. All transactions will be sourced and payed for by the `ADMIN` key defined in the `.env` file.

To deploy the contracts on a "network_name" network, run:

```bash
node ./lib/scripts/testing-scripts/setup.js network_name
```

## Mock

Test environments optionally come with default data. The `mock` script does a few things to help make interacting with Blend in a test environment easier:

1. Creates a handful of test tokens, including XLM's Stellar Asset Contract (SAC), USDC with a SAC, and some Soroban native tokens.
2. Sets prices for the test tokens on the mock oracle.
3. Creates two pools with a set of assets.
4. Deposits into the backstop for the pools with `WHALE` and adds the pools into the reward zone.
5. Deposits and borrows assets from each pool from `WHALE`.

To add mock data to the Blend protocol in a the "network_name" test network, run:

```bash
node ./lib/scripts/testing-scripts/mock.js network_name
```

## Pool Deployment

Blend utils also helps deploy blend pools. The `deploy-pool` script takes in a single "network" parameter that defines what network the pool is deployed on.

The script requires that the `<NETWORK-NAME>.contracts.json` file exists and is up to date. If they wish to use a different oracle than standard they should update the file with the address of the oracle smart contract they wish to use. Additionally, all the token contracts that the pool will use must be defined in the file.

Finally, the user must have the `ADMIN` key defined in the `.env` file as well as the network passphrase and rpc url.

The `ADMIN` account must be sufficiently funded to pay for the deployment transaction fees and the initial pool backstop deposit.

The following constants must also be defined in the `deploy-pool` script:

- `deposit_asset` - The asset that will be deposited into the BLND:USDC pool to fund the deployed pool's backstop. `0` denotes BLND, `1` denotes USDC, and `2` denotes a balanced deposit of both BLND and USDC.
- `blnd_max` - The maximum amount of BLND that can be deposited into the liquidity pool. This parameter is not used if the `deposit_asset` isn't `0` or `2`.
- `usdc_max` - The maximum amount of USDC that can be deposited into the liquidity pool. This parameter is not used if the `deposit_asset` isn't `1` or `2`.
- `mint_amount` - The number of liquidity pool tokens to mint for the user. The minted tokens will be deposited into the deployed pool's backstop.
- `pool_name` - The name of the pool to be deployed.
- `backstop_take_rate` - The percent of interest paid by borrowers that is sent to the pool's backstop depositors. This parameter is a number between 0 and 100.
- `max_positions` - The maximum number of positions that can be opened in the pool. This parameter must be a number greater than 0. Pool creators should be careful not to set this number too high as it can cause user's positions to become un-liquidatable due to soroban resource limits.
- `reserves` - A vector of asset names that will be set as initial reserves in the pool. The addresses of the token contracts associated with these assets must be defined in the `<NETWORK-NAME>.contracts.json` file.
- `reserve_configs` - A vector of `ReserveConfig` assets that will be set as the initial reserve configurations for the pool's initial reserves. These should be set in the same order as the reserves. The `ReserveConfig` struct has the following parameters.
  - `index` - The index of the reserve. This index should be the order in which the reserves are defined in the `reserves` vector.
  - `decimals` - The number of decimals the reserves underlying token has.
  - `c_factor` - The reserve's collateral factor. This parameter is a number between 0 and 1e7. For more information see: https://docs.blend.capital/pool-creators/adding-assets/risk-parameters
  - `l_factor` - The reserve's liability factor. This parameter is a number between 0 and 1e7. For more information see: https://docs.blend.capital/pool-creators/adding-assets/risk-parameters
  - `util` - The reserve's utilization target. For more information see: https://docs.blend.capital/pool-creators/adding-assets/risk-parameters
  - `max_util` - The reserve's maximum utilization. For more information see: https://docs.blend.capital/pool-creators/adding-assets/risk-parameters
  - `r_base` - The reserve's base interest rate. This is the minimum interest rate charged for borrowing the reserve's underlying asset. It should be set very low unless the asset is supposed to be fixed-rate.
  - `r_one` - The rate at which the reserve's borrowing interest rate increases as utilization increases below the target utilization rate. For more information see: https://docs.blend.capital/pool-creators/adding-assets/interest-rates
  - `r_two` - The rate at which the reserve's borrowing interest rate increases as utilization increases above the target utilization rate. For more information see: https://docs.blend.capital/pool-creators/adding-assets/interest-rates
  - `r_three` - The rate at which the reserve's borrowing interest rate increases as utilization increases above 95% utilization. For more information see: https://docs.blend.capital/pool-creators/adding-assets/interest-rates
  - `reactivity` - The reserve's reactivity. This governs how quickly the reserve's interest rate changes in response to being above or below the utilization rate. For more information see: https://docs.blend.capital/pool-creators/adding-assets/interest-rates
- `pool_emission_metadata` - A vector of `ReserveEmissionMetadata` structs which governs what percent of total pool emissions a given reserve receives. The `ReserveEmissionMetadata` struct has the following parameters.
  - `reserve_index` - The index of the reserve. This index should correspond with `index` argument in the `ReserveConfig` struct.
  - `res_type` - 0 for emissions directed to reserve lenders, and 1 for emissions directed to reserve borrowers. It's possible to add an entry for both reserve lenders and reserve borrowers.
  - `share` - The percent of total pool emissions that the reserve receives. This parameter is a number between 0 and 1e7. The sum of all shares should be 1e7.
- `starting_status` - The initial status the admin wishes to set for the pool. The status can be one of the following: `0` for `Admin-Active`, `2` for `Admin-On-Ice`, `3` for `On-Ice`, and `4` for `Admin-Frozen`. For more information on pool status see: https://docs.blend.capital/tech-docs/core-contracts/lending-pool/pool-management
- `add_to_reward_zone` - A boolean value that determines whether the pool is added to the reward zone. If `true`, the pool will be added to the reward zone. If `false`, the pool will not be added to the reward zone.
- `pool_to_remove` - The name of the pool to remove from the reward zone. This parameter is only used if `add_to_reward_zone` is `true`.
- `revoke_admin` - A boolean value that determines whether the admin is removed from the pool. If `true`, the admin will be removed from the pool making it immutable.

After setting the constants, the user can run the `deploy-pool` script to deploy the pool.

```bash
node ./lib/scripts/user-scripts/deploy-pool.js network_name
```
