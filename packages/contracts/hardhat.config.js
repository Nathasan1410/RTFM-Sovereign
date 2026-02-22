import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";
dotenv.config();

const config = {
  solidity: "0.8.19",
  networks: {
    sepolia: {
      url: "https://rpc.ankr.com/eth_sepolia",
      accounts: ["0x14f2045df205ff5ea676c1b8d0c1af01d193b455ea0201658fbf1ca5fc0eb2a0"]
    }
  }
};

export default config;