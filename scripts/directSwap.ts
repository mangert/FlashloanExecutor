//экспериментальный скрипт - прямой вызов роутера юнисвап
import { ethers } from "hardhat";
import { BigNumberish } from "ethers";

async function main() {
  // Настройки подключения
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  if (!PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY is not set in .env file");
  }

  // Адреса контрактов в Sepolia
  const SWAP_ROUTER = "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E";
  const WETH9 = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";
  const USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

  // Получаем провайдер и подписанта из Hardhat
  const provider = ethers.provider;
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log("Using account:", signer.address);
  console.log("Account balance:", (await provider.getBalance(signer.address)).toString());

  // Получаем контракты
  const wethContract = new ethers.Contract(
    WETH9,
    [
      "function deposit() payable",
      "function approve(address spender, uint256 amount) returns (bool)",
      "function balanceOf(address account) view returns (uint256)",
      "function allowance(address owner, address spender) view returns (uint256)"
    ],
    signer
  );

  const routerContract = new ethers.Contract(
    SWAP_ROUTER,
    [
      "function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) external payable returns (uint256 amountOut)"
    ],
    signer
  );

  // Параметры свапа
  const amountIn = ethers.parseEther("0.001"); // 0.001 ETH
  const amountOutMin = 0; // Минимальное количество USDC для получения

  console.log("Step 1: Converting ETH to WETH");
  
  // Конвертируем ETH в WETH
  const depositTx = await wethContract.deposit({ value: amountIn });
  await depositTx.wait();
  console.log("WETH deposited");

  // Проверяем баланс WETH
  const wethBalance = await wethContract.balanceOf(signer.address);
  console.log("WETH balance:", wethBalance.toString());

  console.log("Step 2: Approving router to spend WETH");
  
  // Апрувим роутеру использовать наши WETH
  const approveTx = await wethContract.approve(SWAP_ROUTER, wethBalance);
  await approveTx.wait();
  console.log("WETH approved");

  // Проверяем allowance
  const allowance = await wethContract.allowance(signer.address, SWAP_ROUTER);
  console.log("Allowance:", allowance.toString());

  console.log("Step 3: Executing swap");
  
  // Параметры для exactInputSingle
  const params = {
    tokenIn: WETH9,
    tokenOut: USDC,
    fee: 500,
    recipient: signer.address,
    amountIn: wethBalance,
    amountOutMinimum: amountOutMin,
    sqrtPriceLimitX96: 0
  };

  try {
    // Вызываем exactInputSingle
    const swapTx = await routerContract.exactInputSingle(params);
    const receipt = await swapTx.wait();
    
    console.log("Swap successful!");
    console.log("Transaction hash:", receipt.transactionHash);
    
    // Проверяем баланс USDC после свапа
    const usdcContract = new ethers.Contract(
      USDC,
      ["function balanceOf(address account) view returns (uint256)"],
      signer
    );
    
    const usdcBalance = await usdcContract.balanceOf(signer.address);
    console.log("USDC balance after swap:", usdcBalance.toString());
  } catch (error : any) {
    console.error("Swap failed:");
    console.error(error);
    
    // Пытаемся извлечь более детальную информацию об ошибке
    if (error.data) {
      console.error("Error data:", error.data);
    }
    if (error.reason) {
      console.error("Error reason:", error.reason);
    }
    if (error.transaction) {
      console.error("Transaction:", error.transaction);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });