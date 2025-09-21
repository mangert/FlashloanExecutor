import { createPublicClient, createWalletClient, http, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import dotenv from 'dotenv';
import { CONTRACT_ADDRESS } from './setup';
import path from 'path';

// Простой способ - предполагаем, что .env в корне проекта на два уровня выше
const envPath = path.resolve(__dirname, '..', '..', '.env');
console.log('Loading .env from:', envPath);
// Загружаем переменные окружения
dotenv.config({ path: envPath });

// Проверяем, что переменные загрузились
console.log('PRIVATE_KEY from env:', process.env.PRIVATE_KEY ? 'Exists' : 'Missing');
console.log('ALCHEMY_API_URL from env:', process.env.ALCHEMY_API_URL ? 'Exists' : 'Missing');

// Если переменные не загрузились, выходим с ошибкой
if (!process.env.PRIVATE_KEY) {
  throw new Error('PRIVATE_KEY is not defined in environment variables');
}

if (!process.env.ALCHEMY_API_URL) {
  throw new Error('ALCHEMY_API_URL is not defined in environment variables');
}

// Добавляем префикс 0x если его нет
const rawPrivateKey = process.env.PRIVATE_KEY.trim();
const PRIVATE_KEY = rawPrivateKey.startsWith('0x')
  ? (rawPrivateKey as `0x${string}`)
  : (`0x${rawPrivateKey}` as `0x${string}`);

// Проверяем длину приватного ключа
if (PRIVATE_KEY.length !== 66) {
  throw new Error(`Invalid private key length: ${PRIVATE_KEY.length}. Expected 66 characters (0x + 64 hex chars)`);
}

const RPC_URL = process.env.ALCHEMY_API_URL || '';

// ABI контракта (упрощенная версия)
const CONTRACT_ABI = [
  {
    name: 'getBalance',
    type: 'function',
    inputs: [{ name: 'token', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    name: 'requestFlashLoan',
    type: 'function',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    name: 'FlashLoanExecuted',
    type: 'event',
    inputs: [
      { name: 'asset', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'premium', type: 'uint256', indexed: false }
    ]
  }
] as const

// Создание клиентов
const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(RPC_URL)
});

const account = privateKeyToAccount(PRIVATE_KEY);

const walletClient = createWalletClient({
  account,
  chain: sepolia,
  transport: http(RPC_URL)
});

async function main() {
  console.log('Starting interactions');
  
  // 1. Получим номер блока
  const blockNumber = await publicClient.getBlockNumber();
  console.log(`Current block number: ${blockNumber}`);
  
  // 2. Получение цены газа
  const gasPrice = await publicClient.getGasPrice();
  console.log(`Current gas price: ${gasPrice.toString()} wei`);

  
  // Читаем наш контракт
  console.log("Interactions with ", CONTRACT_ADDRESS);
  
  // 3. Проверка баланса контракта в ETH
  const balance = await publicClient.getBalance({
    address: CONTRACT_ADDRESS
  });
  console.log(`Contract ETH balance: ${balance.toString()} wei`);
  
  // 4. Проверка баланса через функцию контракта
  const contractBalance = await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getBalance',
    args: ['0x0000000000000000000000000000000000000000'] // ETH address
  });
  console.log(`Contract balance via function: ${contractBalance.toString()}`);   

  
  
  
  /*
  // 4. Запрос flash loan
  console.log('Requesting flash loan...')
  const hash = await walletClient.writeContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'requestFlashLoan',
    args: [
      '0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357', // DAI address
      BigInt(1000000000000000000) // 1 DAI
    ]
  })
  console.log(`Transaction hash: ${hash}`)
  
  // 5. Ожидание подтверждения
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  console.log(`Transaction confirmed in block: ${receipt.blockNumber}`)
  
  // 6. Отправка ETH на другой адрес (пример)
  const txHash = await walletClient.sendTransaction({
    to: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e', // Пример адреса
    value: BigInt(1000000000000000) // 0.001 ETH
  })
  console.log(`ETH sent, transaction hash: ${txHash}`)*/
}

main().catch(console.error)