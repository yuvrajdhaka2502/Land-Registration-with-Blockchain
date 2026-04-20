require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY || "0x" + "0".repeat(64);
const ORACLE_KEY   = process.env.ORACLE_PRIVATE_KEY   || "0x" + "0".repeat(64);
const SEPOLIA_RPC  = process.env.SEPOLIA_RPC_URL       || "https://rpc.sepolia.org";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      viaIR: true,
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    // Local development — run `npm run node` first, then `npm run deploy`
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    hardhat: {
      chainId: 31337,
    },
    // Sepolia testnet — run `npm run deploy:sepolia` (no local node needed)
    sepolia: {
      url: SEPOLIA_RPC,
      chainId: 11155111,
      accounts: [DEPLOYER_KEY, ORACLE_KEY],
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
