# 🚀 GDrive 2.0 dApp

<h4 align="center">
  Built on <a href="https://scaffoldeth.io">🏗 Scaffold-ETH 2</a>
</h4>

☁️ A decentralized cloud storage application (dapp) built on the Ethereum blockchain, leveraging the power of Scaffold-ETH 2. GDrive 2.0 allows users to store and manage files on a decentralized network, with features including:

- **Decentralized File Storage**: Securely upload and store files on a decentralized network (like IPFS, although specifics can be added if needed).
- **File Management**: View, download, share, and delete your uploaded files.
- **Folder Organization**: (If implemented) Organize your files into folders.
- **Subscription Tiers**: Manage storage and bandwidth limits through a subscription system.
- **Shared Links**: (If implemented) Create and manage paid or public links to your files.

This dApp is built using Scaffold-ETH 2's robust toolkit, utilizing NextJS, RainbowKit, Hardhat, Wagmi, Viem, and Typescript.

Features inherited from Scaffold-ETH 2:
- ✅ **Contract Hot Reload**: Your frontend auto-adapts to your smart contract as you edit it.
- 🪝 **[Custom hooks](https://docs.scaffoldeth.io/hooks/)**: Collection of React hooks wrapper around [wagmi](https://wagmi.sh/) to simplify interactions with smart contracts with typescript autocompletion.
- 🧱 [**Components**](https://docs.scaffoldeth.io/components/): Collection of common web3 components to quickly build your frontend.
- 🔥 **Burner Wallet & Local Faucet**: Quickly test your application with a burner wallet and local faucet.
- 🔐 **Integration with Wallet Providers**: Connect to different wallet providers and interact with the Ethereum network.


## Requirements

Before you begin, you need to install the following tools:

- [Node (>= v20.18.3)](https://nodejs.org/en/download/)
- Yarn ([v1](https://classic.yarnpkg.com/en/docs/install/) or [v2+](https://yarnpkg.com/getting-started/install))
- [Git](https://git-scm.com/downloads)

## Quickstart

To get started with GDrive 2.0, follow the steps below:

1. Install dependencies if it was skipped in CLI:

```bash
yarn install
```

2. Run a local network in the first terminal:

```bash
yarn chain
```

This command starts a local Ethereum network using Hardhat. The network runs on your local machine and can be used for testing and development. You can customize the network configuration in `packages/hardhat/hardhat.config.ts`.

3. On a second terminal, deploy the GDrive contract:

```bash
yarn deploy
```

This command deploys your smart contracts (including the `GDrive` contract) to the local network. The contracts are located in `packages/hardhat/contracts` and can be modified to suit your needs. The `yarn deploy` command uses the deploy script located in `packages/hardhat/deploy` to deploy the contract to the network. You can also customize the deploy script.

4. On a third terminal, start your NextJS app:

```bash
yarn start
```

Visit your app on: `http://localhost:3000`. You can interact with your smart contracts using the application UI. You can tweak the app config in `packages/nextjs/scaffold.config.ts`.

Run smart contract test with `yarn hardhat:test`

- Edit your smart contracts in `packages/hardhat/contracts`
- Edit your frontend pages and components in `packages/nextjs/app` and `packages/nextjs/components`.
- Edit your deployment scripts in `packages/hardhat/deploy`


## Documentation

Refer to the [Scaffold-ETH 2 docs](https://docs.scaffoldeth.io) to learn more about the framework.

## Contributing to GDrive 2.0

We welcome contributions to GDrive 2.0! Please see [CONTRIBUTING.MD](https://github.com/scaffold-eth/scaffold-eth-2/blob/main/CONTRIBUTING.md) for general contribution guidelines inherited from Scaffold-ETH 2. Specific contribution guidelines for GDrive 2.0 can be added here if needed.