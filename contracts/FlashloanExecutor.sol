// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "./IExecutorErrors.sol"; //интерфейс для ошибок

import { IERC20Metadata } from "@openzeppelin/contracts/interfaces/IERC20Metadata.sol";
import { FullMath } from  "./libs/FullMath.sol";  // вместо "@uniswap/v3-core/contracts/libraries/FullMath.sol";
/*
import "@aave/core-v3/contracts/flashloan/base/FlashLoanSimpleReceiverBase.sol";
import "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import "@aave/core-v3/contracts/interfaces/IPool.sol";*/
import { AggregatorV3Interface } from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import { IUniswapV3Pool } from "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import { ISwapRouter } from "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";


/// @notice демонстрационный контракт
contract FlashloanExecutor is IExecutorErrors { /*FlashLoanSimpleReceiverBase {*/
    
    address public constant SWAP_ROUTER = 0xE592427A0AEce92De3Edee1F18E0157C05861564;
    address public constant USDC = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;
    address public constant WETH = 0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6;

    /// @notice  событие индицирует получение ценовой информации от фида Chainlink
    /// @param  pairPrice полученное значение цены
    /// @param  pair обозначение валютной пары
    event OracleChecked(uint256 pairPrice, bytes8 pair);

    /// @notice событие индицирует факт вывода средств с контракта (ETH)
    /// @param  value сумма вывода
    /// @param  recipient адрес вывода
    event FundsWithdrawn(uint256 value, address indexed recipient);    

    /// @notice  событие индицирует добавление новой поддерживаемой пары в список фидов
    /// @param pair наименование пары
    event NewFeedAdded(bytes8 pair);

    /// @notice  событие индицирует добавление новой поддерживаемой пары в список пулов
    /// @param pair наименование пары
    event NewPoolAdded(bytes8 pair);
    
    
    /// @notice адрес владельца
    address public owner;
    
    /// @notice хранилище адресов фидов chainlink для валютных пар
    /// имя пары => адрес фида
    mapping (
        bytes8  pair =>
        address priceFeedAddress
    ) chainlinkPriceFeeds;   

    /// @notice хранилище адресов токенов для Uniswap
    /// тикер токена => адрес контракта токена
    mapping (
        bytes8  tokenName =>
        address tokenAddress
    ) tokenAddresses;  
    
    /// @notice хранилище адресов uniswap пулов для валютных пар
    /// имя пары => адрес пула
    mapping (
        bytes8  pair =>
        address uniswapPool
    ) uniswapPools;   

    //модификатор проверяет права на выполнение функций только для владельца
    modifier onlyOwner() {
        require(msg.sender == owner, NotAnOwner(msg.sender));
        _;
    }
    
    constructor() {
        
        owner = msg.sender;        
        //начальные установки: добавим в справочник фиды Chainlink для двух пар 
        //потом можно будет добавлять через функцию
        chainlinkPriceFeeds[bytes8 ("ETHUSD")] = 0x694AA1769357215DE4FAC081bf1f309aDC325306;
        chainlinkPriceFeeds[bytes8 ("DAIUSD")] = 0x14866185B1962B63C3Ea9E03Bc1da838bab34C19;    

        //начальные установки: добавим в справочник адрес пула uniswap в Sepolia
        uniswapPools["USDCETH"] = 0x3289680dD4d6C10bb19b899729cda5eEF58AEfF1;

    }

    /*------------ CHAINLINK -----------------*/
    /// @notice функция возвращает цену анализируемой пары
    /// @param pair имя пары    
    function getPriceFromChainlink(bytes8 pair) public view returns (uint256) {
        
        address feedAddr = chainlinkPriceFeeds[pair];
        //проверяем, что наша пара есть в справочнике
        require(feedAddr != address(0), FeedNotFound(pair));
        //проверяем, что на полученном адресс вообще есть код
        require(feedAddr.code.length > 0, FeedIsNotContract(pair));        
        
        AggregatorV3Interface priceFeed = AggregatorV3Interface(feedAddr);
        
        //запрашиваем цену в chainlink
        //(второй возвращаемый параметр)
        (
            uint80 roundId,
            int256 price,
            ,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = priceFeed.latestRoundData();
        
        //цена должна быть положительная
        require(price > 0, InvalidPriceReceipt()); 
        // Проверка, что ответ не устарел и данные получены недавно
        require(answeredInRound >= roundId &&
                (block.timestamp - updatedAt < 3600) //меньше часа
                , OutdatedPriceData());
        return uint256(price);
    }
        
    /// @notice функция позволяет расширить список используемых пар
    /// @param pair наименование пары (без пробелов и слэшей)
    /// @param feedAddress адрес фида из документации chainlink
        function addNewFeed(bytes8 pair, address feedAddress) onlyOwner() external {
        
        chainlinkPriceFeeds[pair] = feedAddress;
        emit NewFeedAdded(pair);
    }

    /*-------------- UNISWAP -----------------*/

    /// @notice функция позволяет получить цену из заданного пула
    /// @notice возвращает цены и адреса токенов и их параметр децималс
    /// @notice цена token0 относительно token1
    /// @notice Получаем цену из пула, сразу в двух вариантах:
    /// priceToken1perToken0 и priceToken0perToken1 (оба × 1e18)
    function getPoolPrices(address pool)
        public
        view
        returns (
            uint256 price1per0_1e18,
            uint256 price0per1_1e18,
            address token0,
            address token1,
            uint8 dec0,
            uint8 dec1
        ) {
        
        //получаем из пула "сырую" цену (вызываем функцию пула uniswap)
        (uint160 sqrtPriceX96,, , , , ,) = IUniswapV3Pool(pool).slot0();

        // получаем адреса токенов из пула
        token0 = IUniswapV3Pool(pool).token0();
        token1 = IUniswapV3Pool(pool).token1();

        // получаем decimals каждого токена для масшабирования цены
        dec0 = _safeDecimals(token0);
        dec1 = _safeDecimals(token1);

        //переводим "сырую" цену в нормальный вид через формулу цены пула
        //используем безопасное умножение из библиотеки uniswap, чтобы избежать переполнения
        uint256 priceRaw = FullMath.mulDiv(uint256(sqrtPriceX96), uint256(sqrtPriceX96), 1 << 192);

        //масшабируем цены к 10^18 токенов
        // price(token1/token0) с учётом decimals
        int256 exp1per0 = int256(18) + int256(uint256(dec0)) - int256(uint256(dec1));
        price1per0_1e18 = _scalePrice(priceRaw, exp1per0);

        // price(token0/token1) = 1 / price(token1/token0)
        int256 exp0per1 = int256(18) + int256(uint256(dec1)) - int256(uint256(dec0));
        price0per1_1e18 = _scalePrice(FullMath.mulDiv(1e36, 1, price1per0_1e18), 0);
    }
        

    /// @notice функция произодит обмен эфров на UCDS
    function swapExactETHForUSDC() external payable {
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: address(0), // ETH
            tokenOut: USDC,
            fee: 500, // 0.05%
            recipient: msg.sender,
            deadline: block.timestamp + 300,
            amountIn: msg.value,
            amountOutMinimum: 0,
            sqrtPriceLimitX96: 0
        });

        ISwapRouter(SWAP_ROUTER).exactInputSingle{ value: msg.value }(params);
    }

    /// @notice параметризованная функция обмена
    function simpleSwapTokens(address token0, address token1, uint24 _fee) external payable {
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: token0,
            tokenOut: token1,
            fee: _fee, // 0.05%
            recipient: msg.sender,
            deadline: block.timestamp + 300,
            amountIn: msg.value,
            amountOutMinimum: 0,
            sqrtPriceLimitX96: 0
        });

        ISwapRouter(SWAP_ROUTER).exactInputSingle{ value: msg.value }(params);
    }

    /// @notice функция позволяет расширить список используемых пар
    /// @param pair наимнеование пары (без пробелов и слэшей)
    /// @param poolAddress адрес пула Uniswap
        function addNewPool(bytes8 pair, address poolAddress) onlyOwner() external {
        
        uniswapPools[pair] = poolAddress;
        emit NewPoolAdded(pair);
    }
        
    /*-------------- AAVE -----------------*/
    
    //uint256 public priceThreshold;

    //event FlashloanExecuted(address asset, uint256 amount);
    /*
    constructor(
        address _addressProvider,
        address _priceFeed,
        uint256 _threshold
    ) FlashLoanSimpleReceiverBase(IPoolAddressesProvider(_addressProvider)) {
        priceFeed = AggregatorV3Interface(_priceFeed);
        owner = msg.sender;
        priceThreshold = _threshold;
    }*/

    /*
    function executeIfProfitable(address asset, uint256 amount) external onlyOwner {
        uint256 price = getPriceFromChainlink();
        emit OracleChecked(price);

        require(price > priceThreshold, "Price condition not met");

        POOL.flashLoanSimple(
            address(this),
            asset,
            amount,
            bytes(""), // можно зашить параметры
            0
        );
    }

    /// Callback, вызываемый Aave после выдачи флэшлона
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override returns (bool) {
        require(msg.sender == address(POOL), "Untrusted lender");
        require(initiator == address(this), "Untrusted initiator");

        // TODO: Здесь должен быть swap на DEX (Uniswap или 1inch)
        // Например: обмен части `amount` на другой токен, вывод прибыли

        emit FlashloanExecuted(asset, amount);

        // Возвращаем долг
        uint256 amountOwing = amount + premium;
        IERC20(asset).approve(address(POOL), amountOwing);
        return true;
    }

    // Управление
    function setThreshold(uint256 newThreshold) external onlyOwner {
        priceThreshold = newThreshold;
    }*/

   
    /*-------------- Функци для владельца -----------------*/
   
    /// @notice функция позволяет вывести средства с контракта
    /// @param amount сумма вывода
    /// @param recipient адрес вывода    
   function withrawFunds (uint256 amount, address payable recipient) external onlyOwner() {
        
        require(amount <= address(this).balance, InsufficientFunds (amount, address(this).balance));

        (bool success, ) = recipient.call{value: amount}("");
        require(success, MoneyTransferFailed(amount, recipient));
    }

    /*-------------- Служебные функции -----------------*/
    
    /// @notice служебная функция, позволяющая безопасно определить параметр decimals токена по его адресу    
    /// @dev используется в запросах цен из пулов Uniswap
    function _safeDecimals(address token) internal view returns (uint8) {
        try IERC20Metadata(token).decimals() returns (uint8 d) {
            return d;
        } catch {
            return 18;
        }
    }
    /// @notice служебная функция, применяющая поправочный множитель, чтобы цена была в формате × 1e18
    function _scalePrice(uint256 priceRaw, int256 exp) internal pure returns (uint256) {
        if (exp >= 0) {
            return priceRaw * (10 ** uint256(exp));
        } else {
            return priceRaw / (10 ** uint256(-exp));
        }
    }    
}
