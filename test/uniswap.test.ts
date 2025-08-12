import { loadFixture, ethers, expect } from "./setup";

// тест сделан под форк. Без форка не сработает!!!
describe("Uniswap Pool Price Test", function () {
    // проверим, что наша функция корректно получит данные из пула USDC / WETH (0.05%)
    // и правильно их интерпретирует 
    it("Should match contract pool prices with manual calculation", async function () {
    // 0. Адрес тестового пула USDC / WETH (0.05%) на Sepolia
    const poolAddress = "0x3289680dD4d6C10bb19b899729cda5eEF58AEfF1";

    // 1. Деплой контракта
    const ExecutorFactory = await ethers.getContractFactory("FlashloanExecutor");
    const executor = await ExecutorFactory.deploy();
    await executor.waitForDeployment();
    const executorAddress = await executor.getAddress();

    console.log("Executor deployed at:", executorAddress);

    // 2. ABI для пула и токенов    
    // (из задеплоенного контракта пула uniswap / интерфейса IUniswapV3Pool.sol)
    const poolAbi = [      
      "function slot0() external view returns (uint160 sqrtPriceX96,int24,uint16,uint16,uint16,uint8,bool)",    
      "function token0() external view returns (address)",
      "function token1() external view returns (address)",
    ];
    const erc20Abi = [
      "function decimals() external view returns (uint8)",
    ];

    // Подключаемся к пулу
    const pool = await ethers.getContractAt(poolAbi, poolAddress);

    // Достаем сырую цену
    const [sqrtPriceX96] = await pool.slot0();
    // достаем адреса токенов
    const token0 = await pool.token0();
    const token1 = await pool.token1();

    // Достаем decimals для каждого токена
    const token0Contract = await ethers.getContractAt(erc20Abi, token0);
    const token1Contract = await ethers.getContractAt(erc20Abi, token1);
    const dec0 = await token0Contract.decimals();
    const dec1 = await token1Contract.decimals();
    
    // Считаем "сырую" цену
    const priceRaw = (BigInt(sqrtPriceX96) * BigInt(sqrtPriceX96)) / (1n << 192n);

    // преобразуем цену price(token1/token0) с учетом decimals
    const exp1per0 = 18n + BigInt(dec0) - BigInt(dec1);
    const price1per0_1e18 =
      exp1per0 >= 0n
        ? priceRaw * 10n ** exp1per0
        : priceRaw / 10n ** (-exp1per0);

    // пересчитываем обратную цену price(token0/token1) = 1 / price(token1/token0)
    const price0per1_1e18 = (10n ** 36n) / price1per0_1e18;
    
    // Теперь берём цену из контракта    
    const [c_price1per0, c_price0per1] = await executor.getPoolPrices(poolAddress);

    // Допустимая погрешность
    const tolerance = 10n ** 6n; // 0.000001
    expect(c_price1per0).to.be.closeTo(price1per0_1e18, tolerance);
    expect(c_price0per1).to.be.closeTo(price0per1_1e18, tolerance);
  });
});

