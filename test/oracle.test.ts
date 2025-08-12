import { loadFixture, ethers, expect } from "./setup";
import { toBytes8 } from"./test-helpers";

//тесты используют контракт-заглушку. На форке не запускать - отвалятся, так как время блока ра
describe("Chainlink Oracle", function() {
    async function deploy() {                
        const [user0, user1, user2] = await ethers.getSigners();
        
        const now = Math.floor(Date.now() / 1000);

        // Валидный фид: цена положительная, время актуальное, ID ок
        const validFeed = await (await ethers.getContractFactory("MockAggregatorV3"))
            .deploy(1000n, now, 1, 1);

        // Устаревший фид: время более часа назад
        const outdatedFeed = await (await ethers.getContractFactory("MockAggregatorV3"))
            .deploy(1000n, now - 7200, 1, 1);

        // Некорректная цена (отрицательная)
        const invalidFeed = await (await ethers.getContractFactory("MockAggregatorV3"))
            .deploy(-500n, now, 1, 1);

        // Нулевая цена
        const zeroPriceFeed = await (await ethers.getContractFactory("MockAggregatorV3"))
            .deploy(0n, now, 1, 1);

        // Деплой основного контракта
        const Executor = await ethers.getContractFactory("FlashloanExecutor");
        const executor = await Executor.deploy();

        // Подключаем пары        
        await executor.addNewFeed(toBytes8("VALID"), validFeed.getAddress());        
        await executor.addNewFeed(toBytes8("OLD"), outdatedFeed.getAddress());
        await executor.addNewFeed(toBytes8("NEG"), invalidFeed.getAddress());
        await executor.addNewFeed(toBytes8("ZERO"), zeroPriceFeed.getAddress());

        return {user0, user1, user2, executor, validFeed, outdatedFeed, invalidFeed, zeroPriceFeed}

    }    
        
    //сначала проверим, как срабатывает валидный фид
    it("should return valid price", async function() {
        const {user0, executor} 
            = await loadFixture(deploy);            
        //выбираем пару - фактически выбираем фид - валидный            
        const price : bigint = await executor.connect(user0).getPriceFromChainlink(toBytes8("VALID"));
        expect(price).to.equal(1000n);
    });
    //проверим, что при получении устаревших данных вылетает ошибка        
    it("should revert on outdated feed", async function() {
        const {user0, executor} 
            = await loadFixture(deploy);                
        await expect(
            executor.connect(user0).getPriceFromChainlink(toBytes8("OLD"))
        ).to.be.revertedWithCustomError(executor, "OutdatedPriceData");
    });
    //проверим, что при получении некорретной (отрицательной) цены вылетает ошибка
    it("should revert on negative price", async function()  {
        const {user0, executor} 
            = await loadFixture(deploy);   
        await expect(
            executor.connect(user0).getPriceFromChainlink(toBytes8("NEG"))
        ).to.be.revertedWithCustomError(executor, "InvalidPriceReceipt");
        });

        //проверим, что при получении некорретной (нулевой) цены вылетает ошибка
        it("should revert on zero price", async function()  {
            const {user0, executor } 
                = await loadFixture(deploy);   
            await expect(
                executor.getPriceFromChainlink(toBytes8("ZERO"))
            ).to.be.revertedWithCustomError(executor, "InvalidPriceReceipt");
        });

        //проверим, что при обращении к неподдерживаемой паре вылетает ошибка
        it("should revert on unknown pair", async function() {
            const {user0, executor } 
                = await loadFixture(deploy);   
            await expect(
                executor.getPriceFromChainlink(toBytes8("XXX"))
            ).to.be.revertedWithCustomError(executor, "FeedNotFound");
        });
});
