import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const contractAddress = "0x9E45DC5B41CDa47DA7930Be9794F3ab237BC794A"; // адрес контракта - следить за актуальностью!
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY || "", ethers.provider);

  const contractAbi = [
    "event SwapDebug(string message, uint256 amountOut)",
    "function swapExactETHForUSDC(uint256 amountOutMin) external payable",
    "function swapDirectInPool(uint256 amountOutMin) external payable",
    "function checkPoolLiquidity() external",
    "function checkAllowances() external"
  ];

  const myContract = new ethers.Contract(contractAddress, contractAbi, signer);

  // Слушаем события
  myContract.on("SwapDebug", (message: string, amountOut: any) => {
    console.log("SwapDebug event:", message, amountOut.toString());
  });

  //делаем чеки
  //const txCheckLiq = await myContract.checkPoolLiquidity();
  //const txCheckAll = await myContract.checkAllowances();

  const amountOutMin = 0;
  const ethValue = ethers.parseEther("0.001");

  console.log(ethValue);

  console.log("Calling swapExactETHForUSDC...");
  const tx = await myContract.swapDirectInPool(amountOutMin, { value: ethValue });
  await tx.wait();

  console.log("Transaction mined:", tx.hash);

  // Через 5 секунд отписываемся (чтобы скрипт завершился)
  setTimeout(() => {
    myContract.removeAllListeners("SwapDebug");
    process.exit(0);
  }, 5000);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
