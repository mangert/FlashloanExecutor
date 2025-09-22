// константы для скрипта - чтобы не замусоривать код
import { parseAbi } from "viem";

//адрес задеплоенного контракта
export const CONTRACT_ADDRESS = "0xda6E15B721e0Fd4861b9f930Bf19347Fd4f7cd87" as `0x${string}`;
//адреса токенов
// uniswap
export const USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" as `0x${string}`; // USDC в Uniswap Sepolia        
export const WETH9 = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14" as `0x${string}`; 

//AAVE
export const AAVE_USDC = "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8" as `0x${string}`; // USDC в AAVE Sepolia                                        
export const DAI = "0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357" as `0x${string}`;

//ABI для ERC20
export const erc20ABI = parseAbi([
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function balanceOf(address) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function transfer(address, uint256) external returns (bool)"
  ]

)
