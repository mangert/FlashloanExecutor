//проверончый скрипт по реальному свапу туда-сюда
import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const contractAddress = "0x2D873aA42728238d8873Cb76A1A51c4eBee6278b"; // адрес контракта - следить за актуальностью!
  const usdcAddress ="0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY || "", ethers.provider);

  const contractAbi = [
    "function swapUSDCToETH(uint256 amountIn, uint256 amountOutMin) external",    
    "function swapETHToUSDC(uint256 amountOutMin) external payable",
    "function checkAndApproveUSDC(uint256 amount) external"    
  ];

  const usdcAbi = [
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)"
  ];

  const usdcContract = new ethers.Contract(usdcAddress, usdcAbi, signer);

  const myContract = new ethers.Contract(contractAddress, contractAbi, signer);    

  const amountOutMin = 0;
  const ethValue = ethers.parseEther("0.001");  

  
  console.log("Calling swap ETH to USDC...");
  const txETH = await myContract.swapETHToUSDC(amountOutMin, { value: ethValue });
  await txETH.wait();

  console.log("Transaction mined:", txETH.hash);

  console.log("Calling swap USDC to ETH...");

  const usdcValue = 10000000;

  const currentAllowance = await usdcContract.allowance(signer.address, contractAddress);
  console.log("Current allowance:", currentAllowance.toString());  
  
  // Если allowance недостаточен, устанавливаем новый
  if (currentAllowance < usdcValue) {
    console.log("Approving USDC...");
    const approveTx = await usdcContract.approve(contractAddress, usdcValue);
    await approveTx.wait();
    console.log("USDC approved");
  }
  
  const txUSDC = await myContract.swapUSDCToETH(usdcValue, amountOutMin);
  console.log("Transaction mined:", txUSDC.hash);
  await txUSDC.wait();  
  
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
