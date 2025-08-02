import { ethers } from "hardhat";
//черновик

async function main() {
  // Пример: ETH/USD на Sepolia
  /*const feedAddress = "0x694AA1769357215DE4FAC081bf1f309aDC325306";

  const Reader = await ethers.getContractFactory("ChainlinkReader");
  const reader = await Reader.deploy(feedAddress);
  await reader.waitForDeployment();*/
  const reader = await ethers.getContractAt("ChainlinkReader", '0x63ca5eb5d9822905bc0426ED4435347a68483956');

  const address = await reader.getAddress();
  console.log("ChainlinkReader deployed at:", address);

  const [desc, decimals, version] = await reader.getDetails();
  console.log(`Description: ${desc}`);
  console.log(`Decimals: ${decimals}`);
  console.log(`Version: ${version}`);

  const [price, updatedAt] = await reader.getLatestPrice();
  console.log(`Price: ${Number(price) / 10 ** Number(decimals)} USD`);
  console.log(`Updated At: ${new Date(Number(updatedAt) * 1000).toLocaleString()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
