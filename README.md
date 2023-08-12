# blend-utils

Deployment and utility scripts for interacting with the Blend Protocol and setting up mock environments.

## Requirements

* Clone the [blend-contracts](https://github.com/blend-capital/blend-contracts) and build the contracts. This needs to be a sibling, ie:
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
node --es-module-specifier-resolution=node ./lib/scripts/setup.js network_name
```

## Mock

Test environments optionally come with default data. The `mock` script does a few things to help make interacting with Blend in a test environment easier:

1. Creates a handful of test tokens, including XLM's Stellar Asset Contract (SAC), USDC with a SAC, and some Soroban native tokens.
2. Sets prices for the test tokens on the mock oracle.
3. Creates two pools with a set of assets.
4. Deposits into the backstop for the pools with `WHALE` and adds the pools into the reward zone.
5. Starts the next emission cycle.
6. Deposits and borrows assets from each pool from `WHALE`.

To add mock data to the Blend protocol in a the "network_name" test network, run:
```bash
node --es-module-specifier-resolution=node ./lib/scripts/mock.js network_name
```