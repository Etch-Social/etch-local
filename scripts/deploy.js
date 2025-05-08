// We require the Hardhat Runtime Environment explicitly here.
const hre = require("hardhat");

async function main() {
  console.log("Deploying EtchV1 contract...");

  // Deploy the EtchV1 contract
  const EtchV1 = await hre.ethers.getContractFactory("EtchV1");
  const etchV1 = await EtchV1.deploy();

  await etchV1.deployed();

  console.log("EtchV1 deployed to:", etchV1.address);
  console.log("Transaction hash:", etchV1.deployTransaction.hash);

  // Wait for a few block confirmations to ensure the contract is mined
  console.log("Waiting for block confirmations...");
  await etchV1.deployTransaction.wait(5);
  console.log("Contract deployment confirmed!");

  // Verify the contract on Etherscan if not on a local network
  const networkName = hre.network.name;
  if (networkName !== "hardhat" && networkName !== "localhost") {
    console.log("Verifying contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: etchV1.address,
        constructorArguments: [],
      });
      console.log("Contract verified on Etherscan!");
    } catch (error) {
      console.error("Error verifying contract:", error);
    }
  }

  return etchV1;
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
