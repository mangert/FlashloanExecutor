import { createPublicClient, createWalletClient, http, defineChain, getContract, formatUnits, parseUnits, parseAbiItem } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import dotenv from 'dotenv';
import { CONTRACT_ADDRESS, USDC, WETH9, AAVE_USDC, DAI, erc20ABI } from './setup';
import { CONTRACT_ABI } from './contractABI';
import path from 'path';

// .env в корне проекта на два уровня выше
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

//вспомогательные функции
//утилита для ожидаения подтверждений 
async function waitForConfirmations(hash: `0x${string}`, confirmations: number = 2) {
  console.log(`Waiting for ${confirmations} confirmation(s)...`);
  
  const receipt = await publicClient.waitForTransactionReceipt({
    hash,
    confirmations,
    timeout: 180_000
  });
  
  if (receipt.status === "success") {
    console.log(`✅ Transaction confirmed after ${confirmations} confirmation(s)`);
  } else {
    console.error(`❌ Transaction failed after ${confirmations} confirmation(s)`);
  }
  
  return receipt;
}

//-----------------------------------------------//
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
  
  //---------------------- Работа с контрактом и токенами ---------------------------
  console.log("---------------------- Работа с контрактом и токенами ---------------------------");

  //Получим контракт в объект и будем к нему обращаться через объект
  const myContract = getContract({
    abi: CONTRACT_ABI,
    address: CONTRACT_ADDRESS,
    client: {
      public: publicClient,
      wallet: walletClient,
    }
  });
  
  //5. попробуем вызвать функцию обмена USDC на eth на юнисвап
  // для этого сначала дадим контраку апрув на 10 баксов  
  const amountUSDC = 10000000n;
  const txApprove = await walletClient.writeContract({    
    address: USDC,
    abi: erc20ABI,
    functionName: 'approve',
    args: [CONTRACT_ADDRESS, amountUSDC] // ETH address
  });

  //проверим allowance
  const allowance = await publicClient.readContract({
    address: USDC,
    abi: erc20ABI,
    functionName: 'allowance',
    args: [account.address, CONTRACT_ADDRESS]
  });  

  console.log(`USDC allowance: ${allowance.toString()}`);   

  //проверим баланс кошелька
  const balanceUSDC = await publicClient.readContract({    
    address: USDC,
    abi: erc20ABI,
    functionName: 'balanceOf',
    args: [account.address]
  });

  console.log(`USDC balance: ${balanceUSDC.toString()}`);   

  
  //пробуем сделать обмен на  uniswap через нашу фунцию контракта
  //сначала сделаем симуляцию
  /*
  try {
    const swapRequest = await publicClient.simulateContract({
      account: account, //вызываем от имени нашего кошелька
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: "swapUSDCToETH",
      args: [amountUSDC, 0n]
    }); 
  
    console.log("✅ Simulation successful! Transaction would succeed");    
    // ну раз симуляция получилась, сделаем реальный свап
    const txHash = await myContract.write.swapUSDCToETH(
      [amountUSDC, 0n],
      {account: account}      
    );

  } catch (error) {
    console.error("❌ Simulation failed:");   
    
    // Извлекаем причину ошибки
    if (error instanceof Error) {
      console.error("Error message:", error.message);
    };    
  };
  // еще раз проверим баланс
  const balanceUSDCNew = await publicClient.readContract({    
    address: USDC,
    abi: erc20ABI,
    functionName: 'balanceOf',
    args: [account.address]
  });
  
  console.log(`New USDC balance: ${balanceUSDCNew.toString()}`);   */

  console.log("\n---------------------- Flashloan ---------------------------");

  //6. Запрос flashloan на AAVE
  
  //сначала закинем неможно DAI на контракт, чтобы было чем оплатить комиссию    
  // получим decimals, чтобы красиво было
  const decimals = await publicClient.readContract({    
    address: DAI,
    abi: erc20ABI,
    functionName: 'decimals'    
  });
  
  const daiForPremium = parseUnits('10', decimals);  
  //на всякий случай проверим баланс на кошельке
  const walletDaiBalance = await publicClient.readContract({    
    address: DAI,
    abi: erc20ABI,
    functionName: 'balanceOf',
    args: [account.address]
  });
  console.log("DAI wallet balance: ", formatUnits(walletDaiBalance, decimals));
  
  //теперь переведем деньги на контракт
  /*const txDaiTransfer = await walletClient.writeContract({    
    address: DAI,
    abi: erc20ABI,
    functionName: 'transfer',
    args: [CONTRACT_ADDRESS, daiForPremium]
  });
  //ждем 2 подтверждения
  const receipt = await waitForConfirmations(txDaiTransfer, 2); */

  //проверим баланс контракта
  const contractDaiBalance = await myContract.read.getBalance([DAI]);
  console.log("DAI contract balance: ", formatUnits(contractDaiBalance, decimals));

  //теперь у нас есть DAI на оплату комиссии - попробуем запросить flashloan
  // запрашивать будем в DAI
  const flashAmount = BigInt(10e10);  
  console.log('Requesting flash loan...');  
  
  try {
      const txHash = await myContract.write.requestFlashLoan(
        [DAI, flashAmount],
        { 
          account: account,
          gas: 3000000n // Увеличиваем газ для безопасности - транза очень прожорливая
        }
      );     
  
    console.log(`Transaction hash: ${txHash}`);
    
    // Ждем подтверждения с таймаутом
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
      confirmations: 2,
      timeout: 60000 // 60 секунд таймаут
    });
    
    // Проверяем статус транзакции
    if (receipt.status === "success") {
      console.log(`✅ Transaction successful in block ${receipt.blockNumber}`);
      
      // Проверяем события
      const logs = await publicClient.getLogs({
        address: CONTRACT_ADDRESS,
        event: parseAbiItem('event FlashLoanExecuted(address indexed asset, uint256 amount, uint256 premium)'),
        fromBlock: receipt.blockNumber,
        toBlock: receipt.blockNumber
      });
      
      if (logs.length > 0) {
        console.log(`💰 FlashLoanExecuted event found. Premium: ${formatUnits(logs[0].args.premium!, 18)}`);        
      } else {
        console.log("⚠️  No FlashLoanExecuted event found");
        
      }
    } else {       
      console.log("❌ Transaction reverted");
      console.log("Check the transaction in Etherscan for detailed revert reason");
      console.log("Common reasons: Outdated Chainlink data, insufficient balance for premium");      
    }          
    
    } catch (error) {
        console.error("❌ Error sending transaction:", error); 
        
  }     

  console.log("\n---------------------- Transfer ---------------------------");
    
  // 7. Отправка ETH на другой адрес (пример)
  const txHash = await walletClient.sendTransaction({
    to: '0x558860598923AbD7b391d4557DE6E9C03c2e47E2', // Пример адреса (мой второй кошелек)
    value: BigInt(1000000000000000) // 0.001 ETH
  });
  console.log(`ETH sent, transaction hash: ${txHash}`);
}

main().catch(console.error)

