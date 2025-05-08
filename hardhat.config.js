require("@nomicfoundation/hardhat-toolbox");
require("hardhat-deploy");
// add access to env
require("dotenv").config();

module.exports = {
  solidity: "0.8.22", // Matches the pragma in your contract
  // If you want additional networks or config, add them here
  networks: {
    polygon: {
      url: process.env.RPC_URL_137 || "",
      accounts: [process.env.PRIVATE_KEY || ""],
    },
    amoy: {
      url: process.env.RPC_URL_8217 || "",
      accounts: [process.env.PRIVATE_KEY || ""],
    },
    baseSepolia: {
      url: process.env.RPC_URL_BASE_SEPOLIA || "",
      accounts: [process.env.PRIVATE_KEY || ""],
    },
    base: {
      url: process.env.RPC_URL_BASE || "",
      accounts: [process.env.PRIVATE_KEY || ""],
    },
  },
  etherscan: {
    apiKey: {
      amoy: process.env.ETHERSCAN_API_KEY,
      baseSepolia: process.env.BASESCAN_API_KEY,
      base: process.env.BASESCAN_API_KEY,
    },
    customChains: [
      {
        network: "amoy",
        chainId: 80002,
        urls: {
          apiURL: process.env.POLYGONSCAN_AMOY_URL,
          browserURL: "https://amoy.polygonscan.com",
        },
      },
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: process.env.BASESCAN_SEPOLIA_URL,
          browserURL: "https://sepolia.basescan.org",
        },
      },
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL: process.env.BASESCAN_BASE_URL,
        },
      },
    ],
  },
};
