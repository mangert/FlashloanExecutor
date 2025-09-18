import { loadFixture, ethers, expect } from "./setup";

// тест сделан под форк. Без форка не сработает!!!
describe("Uniswap Exchange tests", function() {
    async function deploy() {                
        const [owner] = await ethers.getSigners();
        
        // Деплой основного контракта
        const Executor = await ethers.getContractFactory("FlashloanExecutor");
        const executor = await Executor.deploy();
        await executor.waitForDeployment(); 
        
        const USDC_ADDRESS = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
        const WETH9_ADDRESS = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";
        const usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);
        
        return {owner, executor, usdc, WETH9_ADDRESS}
    }    
        
    // тест проверяет возможность обмена ETH на USDC
    it("should swap ETH to USDC", async function () {
        
        const {owner, executor, usdc, WETH9_ADDRESS } = await loadFixture(deploy);   
        
        const amountOutMin = 0;
        const ethValue = ethers.parseEther("0.001");
        
        // Получаем начальный баланс USDC
        
        const initialBalance = await usdc.balanceOf(owner.address);
        
        // Выполняем обмен
        const tx = await executor.swapETHToUSDC(amountOutMin, { value: ethValue });
        await tx.wait();
        
        // Проверяем результат        
        const finalBalance = await usdc.balanceOf(owner.address);        
        const amountOut = finalBalance - initialBalance;

        //балансы
        expect(finalBalance).to.be.gt(initialBalance);        
        expect(tx).changeEtherBalance(owner, -ethValue);
        expect(tx).changeTokenBalance(usdc, owner, amountOut);

        //события
        expect(tx).to.emit(executor, "TokensSwapped").withArgs(
                WETH9_ADDRESS, ethValue, usdc.getAddress(), amountOut
            );
        
    });

    // а теперь проверяем обратный обмен
    it("should swap USDC to ETH", async function () {
        const {owner, executor, usdc, WETH9_ADDRESS } = await loadFixture(deploy);   
        
        const amountIn = ethers.parseUnits("10", 6); // 10 USDC
        const amountOutMin = 0;
        
        // Даем аппрув контракту на использование USDC
        await usdc.approve(await executor.getAddress(), amountIn);
        
        // Получаем начальный баланс ETH
        const initialEthBalance = await ethers.provider.getBalance(owner.address);
        
        // Выполняем обмен
        const tx = await executor.swapUSDCToETH(amountIn, amountOutMin);
        await tx.wait();
        
        // Проверяем, что баланс ETH изменился
        const finalEthBalance = await ethers.provider.getBalance(owner.address);
        const amountOut = finalEthBalance - initialEthBalance;

        //балансы
        
        expect(finalEthBalance).to.gt(initialEthBalance);
        expect(tx).changeEtherBalance(owner, amountOut);
        expect(tx).changeTokenBalance(usdc, owner, -amountIn);       
        
        expect(tx).to.emit(executor, "TokensSwapped").withArgs(
                usdc.getAddress(), amountIn, WETH9_ADDRESS, amountOut
            );
    });
    
    //негативный тест - проверяем, что обмен USDC отвалится с нашей ошибкой, если не дали апрув
    it("should reverted insufficient allowance", async function () {        
        
        const {executor} = await loadFixture(deploy);   
        
        const amountIn = ethers.parseUnits("10", 6);
        const amountOutMin = 0;
        
        // Не даем аппрув намеренно
        await expect(executor.swapUSDCToETH(amountIn, amountOutMin))
            .to.be.revertedWithCustomError(executor, "InsufficientAllowance");
  });

  //негативный тест - проверяем, что обмен отвалистя при недостатке баланса
  it("should reverted with insufficient balance", async function () {
    
    const {executor, usdc} = await loadFixture(deploy);   
    
    const amountIn = ethers.parseUnits("1000000", 6); // Очень большое количество
    const amountOutMin = 0;
    
    // Даем аппрув, но баланса недостаточно    
    await usdc.approve(await executor.getAddress(), amountIn);
    
    await expect(executor.swapUSDCToETH(amountIn, amountOutMin))
        .to.be.revertedWithCustomError(executor, "InsufficientUSDCBalance");
  });

  // негативный тест проверяем, что отвалится, если не удастся получить заданные условия (amountMin)
    it("should swap ETH to USDC", async function () {
        
        const { executor } = await loadFixture(deploy);   
        
        const amountOutMin = 500000000; //намеренно завышенная сумма - 500 баксов
        const ethValue = ethers.parseEther("0.001"); // а здесь где-то в районе 10 баксов       
        
        // Выполняем обмен
        const tx = executor.swapETHToUSDC(amountOutMin, { value: ethValue });
        
        //ожидаем, что отвалится
        await expect(tx).revertedWithCustomError(executor, "InsufficientOutputAmount");
        
    });

});
