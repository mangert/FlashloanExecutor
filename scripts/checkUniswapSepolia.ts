// scripts/checkUniswapSepolia.ts
import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_API_URL);
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY || "", provider);

  console.log("Network:", await provider.getNetwork());

  // Адреса контракта роутера и токенов на Sepolia
  const SWAP_ROUTER = "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E";  
  
  const WETH9 = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";
  const USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
  const POOL = "0x3289680dD4d6C10bb19b899729cda5eEF58AEfF1";

  // Проверка контракта роутера
  const routerCode = await provider.getCode(SWAP_ROUTER);
  if (routerCode === "0x") {
    console.error("Router contract not found at:", SWAP_ROUTER);
    return;
  }
  console.log("Router code exists ✅");

  // Проверка токенов
  const ERC20 = [
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function balanceOf(address) view returns (uint256)"
  ];

  const wethContract = new ethers.Contract(WETH9, ERC20, signer);
  const usdcContract = new ethers.Contract(USDC, ERC20, signer);

  try {
    const wethDecimals = await wethContract.decimals();
    const wethSymbol = await wethContract.symbol();
    console.log(`WETH: ${wethSymbol}, decimals: ${wethDecimals}`);

    const usdcDecimals = await usdcContract.decimals();
    const usdcSymbol = await usdcContract.symbol();
    console.log(`USDC: ${usdcSymbol}, decimals: ${usdcDecimals}`);
  } catch (err) {
    console.error("Error reading token info:", err);
    return;
  }

  // Проверка пула
  const IUniswapV3Pool = [
    "function token0() view returns (address)",
    "function token1() view returns (address)",
    "function slot0() view returns (uint160 sqrtPriceX96,uint128,uint,uint,uint,uint,uint)"
  ];
  const poolContract = new ethers.Contract(POOL, IUniswapV3Pool, signer);

  let slot0;

  try {
    const token0 = await poolContract.token0();
    const token1 = await poolContract.token1();
    slot0 = await poolContract.slot0();
    console.log("Pool tokens:", token0, token1);
    console.log("Pool sqrtPriceX96:", slot0[0].toString());
  } catch (err) {
    console.error("Error reading pool info:", err);
    return;
  }

  // Проверка ликвидности (приближённо через slot0)
  const sqrtPriceX96 = Number(slot0[0]);
  if (sqrtPriceX96 === 0) {
    console.warn("Pool price is zero, likely no liquidity ❌");
  } else {
    console.log("Pool seems to have liquidity ✅");
  }
}

main().catch(console.error);
