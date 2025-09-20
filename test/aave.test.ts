import { any, bigint } from "hardhat/internal/core/params/argumentTypes";
import { loadFixture, ethers, expect } from "./setup";
import { toBytes8 } from"./test-helpers";
import { BytesLike, getBytes, LogDescription } from "ethers";

// тест сделан под форк. Без форка не сработает!!!
describe("Uniswap Exchange tests", function() {
    async function deploy() {                
        const [owner] = await ethers.getSigners();
        
        // Деплой основного контракта
        const Executor = await ethers.getContractFactory("FlashloanExecutor");
        const executor = await Executor.deploy();
        await executor.waitForDeployment();         
            
        const usdcAddr = "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8"; // USDC в AAVE Sepolia                                        
        const usdc = await ethers.getContractAt("IERC20", usdcAddr);
        const daiAddr = "0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357";
        const dai = await ethers.getContractAt("IERC20", daiAddr);    
        
        return {owner, executor, usdcAddr, usdc, daiAddr, dai}
    }    
        
    // проверяем, что наш флэшлоан нормально берется и возвращается
    it("should get and return flashsloan", async function () {        
        
        const {owner, executor, usdcAddr, usdc, daiAddr, dai } = await loadFixture(deploy);  
        
        // Подготовка
        //сумма для пополнения контракта на оплату комиссий - 1000000 decimals Dai
        const depositAmount : bigint = BigInt(10e10);
        //сначала делаем апрув
        await dai.approve(await executor.getAddress(), depositAmount);
        const txDeposit = await executor.deposit(daiAddr, depositAmount);          
        //проверяем работу функции пополнения
        await expect(txDeposit).changeTokenBalance(dai, executor, depositAmount);        

        // Получаем начальные балансы
        const initialDaiBalance = await dai.balanceOf(await executor.getAddress());
        const initialUsdcBalance = await usdc.balanceOf(await executor.getAddress());       
        
        const loanAmount = BigInt(10e13);
                
        //запускаем транзу по взятию флэшлоан
        const txFlashloan = await executor.requestFlashLoan(daiAddr, loanAmount);             
        
        const receipt = await txFlashloan.wait();
        
        // Получаем и анализируем события
        const events = receipt?.logs.map(log => {
            try {
                return executor.interface.parseLog(log);
            } catch (e) {
                return null;
            }
        }).filter(event => event !== null);       

        //сначала проверим события обменов
        //их 2 штуки
        if(events) {            
            //DAI -> USDC
            const swapDaiEvent = events[0];
            expect(swapDaiEvent.name).equal("FakeTokensSwapped");
            const swapDaiArgs = swapDaiEvent?.args as any;
            expect(swapDaiArgs.tokenIn).equal(daiAddr);
            expect(swapDaiArgs.amountIn).equal(loanAmount);
            expect(swapDaiArgs.tokenOut).equal(usdcAddr);

            const amountOut = swapDaiArgs.amountOut;

            
            //USDC -> DAI 
            const swapUSDCEvent = events[1];
            expect(swapUSDCEvent.name).equal("FakeTokensSwapped");
            const swapUSDCArgs = swapUSDCEvent?.args as any;
            expect(swapUSDCArgs.tokenIn).equal(usdcAddr);
            expect(swapUSDCArgs.amountIn).equal(amountOut);
            expect(swapUSDCArgs.tokenOut).equal(daiAddr);

        }        
        const flashLoanEvent = events?.find(event => event && event.name === "FlashLoanExecuted");
        
        // Проверяем, что событие найдено
        expect(flashLoanEvent).to.not.be.undefined;        
        
        // Приводим тип args к нужному формату
        const eventArgs = flashLoanEvent!.args as any;
        
        // Проверяем событие
        expect(eventArgs.asset).to.equal(daiAddr);
        expect(eventArgs.amount).to.equal(loanAmount);
        expect(eventArgs.premium).to.be.gt(0);        

        //теперь проверим баланс
        const premium = eventArgs.premium;
        
        await expect(txFlashloan).changeTokenBalance(dai, executor, -premium);                
    });
    
    // негативный тест - проверим, что откатится попытка взять займ не в dai
    // просто чтобы проверить, что проверка срабатывает
    it("should reject unsupported active", async function () {
        const {owner, executor, usdcAddr, usdc, daiAddr, dai } = await loadFixture(deploy);          
        
        // Подготовка
        // депонируем средства на комисии, чтобы контракт aave не ревертнул транзу до всех проверок
        //сумма для пополнения контракта на оплату комиссий - 1000000 decimals USDC
        const depositAmount : bigint = BigInt(10e6);
        await usdc.approve(await executor.getAddress(), depositAmount);
        const txDeposit = await executor.deposit(usdcAddr, depositAmount);             
        
        //формируем транзу по взятию флэшлоан (не запускаем пока)
        const loanAmount = BigInt(10e6);
        const txFlashloan = executor.requestFlashLoan(usdcAddr, loanAmount);             
        await expect(txFlashloan).revertedWithCustomError(executor, "NotSupportedAsset");
        
    });
    
    //негативный тест - проверяем, что транза отвалится, если на контракт не может обеспечить возврат займа
    //+ комиссии
    // для этого не положим средства на контракт
    it("should reverted transfer exeeds balance", async function () {        
        const {owner, executor, usdcAddr, usdc, daiAddr, dai } = await loadFixture(deploy);     

        //формируем запускаем транзу по взятию флэшлоан (не запускаем пока)
        const loanAmount = BigInt(10e13);
        const txFlashloan = executor.requestFlashLoan(daiAddr, loanAmount);             
        await expect(txFlashloan).revertedWith("ERC20: transfer amount exceeds balance");
        
  });

  //негативный тест - проверяем, что кто попало не может вызвать executeOperation
  it("should reverted call executeOperaiton from not aave pool", async function () {
    const {owner, executor, usdcAddr, usdc, daiAddr, dai } = await loadFixture(deploy);   
    //формируем параметры
    const asset = daiAddr;
    const amount = 100n;
    const premium = 5;
    const initiator = await executor.getAddress();
    const params = "0x";
    const tx = executor.executeOperation(asset, amount, premium, initiator, params);
    await expect(tx).revertedWithCustomError(executor, "UnauthorizedExecution");   
    
  });
});

