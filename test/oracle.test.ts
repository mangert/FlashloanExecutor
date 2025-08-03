import { loadFixture, ethers, expect } from "./setup";

//техническая функция для перевода строк в 6 байтовые переменные
function toBytes6(str: string): `0x${string}` {
    const bytes = ethers.toUtf8Bytes(str);
    if (bytes.length > 6) {
        throw new Error("String too long for bytes6");
    }
    return ethers.hexlify(ethers.zeroPadValue(bytes, 6)) as `0x${string}`;
}    

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
        await executor.addNewPair(toBytes6("VALID"), validFeed.getAddress());        
        await executor.addNewPair(toBytes6("OLD"), outdatedFeed.getAddress());
        await executor.addNewPair(toBytes6("NEG"), invalidFeed.getAddress());
        await executor.addNewPair(toBytes6("ZERO"), zeroPriceFeed.getAddress());

        return {user0, user1, user2, executor, validFeed, outdatedFeed, invalidFeed, zeroPriceFeed}

    }    
        
    //сначала проверим, как срабатывает валидный фид
    it("should return valid price", async function() {
        const {user0, executor} 
            = await loadFixture(deploy);            
        //выбираем пару - фактически выбираем фид - валидный            
        const price = await executor.connect(user0).getPriceFromChainlink(toBytes6("VALID"));
        expect(price).to.equal(1000n);
    });
    //проверим, что при получении устаревших данных вылетает ошибка        
    it("should revert on outdated feed", async function() {
        const {user0, executor} 
            = await loadFixture(deploy);                
        await expect(
            executor.connect(user0).getPriceFromChainlink(toBytes6("OLD"))
        ).to.be.revertedWithCustomError(executor, "OutdatedPriceData");
    });
    //проверим, что при получении некорретной (отрицательной) цены вылетает ошибка
    it("should revert on negative price", async function()  {
        const {user0, executor} 
            = await loadFixture(deploy);   
        await expect(
            executor.connect(user0).getPriceFromChainlink(toBytes6("NEG"))
        ).to.be.revertedWithCustomError(executor, "InvalidPriceReceipt");
        });

        //проверим, что при получении некорретной (нулевой) цены вылетает ошибка
        it("should revert on zero price", async function()  {
            const {user0, executor } 
                = await loadFixture(deploy);   
            await expect(
                executor.getPriceFromChainlink(toBytes6("ZERO"))
            ).to.be.revertedWithCustomError(executor, "InvalidPriceReceipt");
        });

        //проверим, что при обращении к неподдерживаемой паре вылетает ошибка
        it("should revert on unknown pair", async function() {
            const {user0, executor } 
                = await loadFixture(deploy);   
            await expect(
                executor.getPriceFromChainlink(toBytes6("XXX"))
            ).to.be.revertedWithCustomError(executor, "FeedNotFound");
        });
});
