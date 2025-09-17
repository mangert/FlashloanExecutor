import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const contractAddress = "0x8AA6208FfC57bA8DeBE0ec1406ebbCAF318F3F7b"; // твой контракт
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY || "", ethers.provider);

  // ABI только для события SwapDebug
  const contractAbi = [
    "event SwapDebug(string message, uint256 value)",
    "function swapExactETHForUSDC(uint256 amountOutMin) external payable"
  ];

  const myContract = new ethers.Contract(contractAddress, contractAbi, signer);

  // Слушаем события SwapDebug
  myContract.on("SwapDebug", (message: string, value: any, event) => {
    console.log(`SwapDebug event: ${message}, value: ${ethers.formatUnits(value, 18)}`);
  });

  // Пример вызова функции swap
  const amountOutMin = 0;
  const ethValue = ethers.parseEther("0.001"); 
  

  console.log("Calling swapExactETHForUSDC...");
  const tx = await myContract.swapExactETHForUSDC(amountOutMin, { value: ethValue, gasLimit: 500_000 });
  console.log("Transaction mined:", tx.hash);

  await tx.wait();
}

main().catch(console.error);
