// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "./interfaces/IExecutorErrors.sol"; //интерфейс для ошибок
import "./interfaces/IWETH9.sol"; //интерфейс для работы с обернутым эфиром;

import { IERC20Metadata } from "@openzeppelin/contracts/interfaces/IERC20Metadata.sol";
import { IERC20 } from "@openzeppelin/contracts/interfaces/IERC20.sol";
import { FullMath } from  "./libs/FullMath.sol";  // вместо "@uniswap/v3-core/contracts/libraries/FullMath.sol";
import { TickMath } from  "./libs/TickMath.sol";  // вместо "@uniswap/v3-core/contracts/libraries/TickMath.sol.sol";
//import { TransferHelper } from  "./libs/TransferHelper.sol";  //

/*
import "@aave/core-v3/contracts/flashloan/base/FlashLoanSimpleReceiverBase.sol";
import "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import "@aave/core-v3/contracts/interfaces/IPool.sol";*/
import { AggregatorV3Interface } from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import { IUniswapV3Pool } from "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import '@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol';
//import "@uniswap/v3-core/contracts/libraries/TickMath.sol";
import { SafeCast } from "@openzeppelin/contracts/utils/math/SafeCast.sol";


import "./interfaces/ICustomSwapRouter.sol"; //используем вместо @uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol


interface IUniswapV3SwapCallback {
    function uniswapV3SwapCallback(
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata data
    ) external;
}



/// @notice демонстрационный контракт
contract FlashloanExecutor is IExecutorErrors { /*FlashLoanSimpleReceiverBase {*/
    
    // источник:
    // https://docs.uniswap.org/contracts/v3/reference/deployments/ethereum-deployments?utm_source=chatgpt.com    
    address public constant SWAP_ROUTER = 0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E; 

    address public constant USDC = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;
    //address public constant WETH = 0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6;        
    
    //address public constant WETH9 = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address public constant WETH9 = 0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14; //поправила    

    /// @notice  событие индицирует получение ценовой информации от фида Chainlink
    /// @param  pairPrice полученное значение цены
    /// @param  pair обозначение валютной пары
    event OracleChecked(uint256 pairPrice, bytes8 pair);

    /// @notice событие индицирует факт вывода средств с контракта (ETH)
    /// @param  value сумма вывода
    /// @param  recipient адрес вывода
    event FundsWithdrawn(uint256 value, address indexed recipient);    
    
    //отладочное
    event SwapDebug(string, uint256 amountOut);

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


    // Модифицированная функция
    function swapExactETHForUSDC(uint256 amountOutMin) external payable {
        require(msg.value > 0, "No ETH sent");
        emit SwapDebug("ETH received", msg.value);       
    
        // Конвертируем ETH в WETH
        IWETH9(WETH9).deposit{value: msg.value}();
        uint256 wethBalance = IWETH9(WETH9).balanceOf(address(this));
    
        // Переводим WETH на роутер
        TransferHelper.safeTransfer(WETH9, SWAP_ROUTER, wethBalance);
        emit SwapDebug("WETH transferred via TransferHelper", wethBalance);
        // Используем TransferHelper.safeApprove вместо стандартного approve
        TransferHelper.safeApprove(WETH9, SWAP_ROUTER, wethBalance);
        emit SwapDebug("WETH approved via TransferHelper", wethBalance);

        // Формируем параметры для exactInputSingle
        ICustomSwapRouter.ExactInputSingleParams memory params = ICustomSwapRouter.ExactInputSingleParams({
            tokenIn: WETH9,
            tokenOut: USDC,
            fee: 500,
            recipient: msg.sender,
            amountIn: wethBalance,
            amountOutMinimum: amountOutMin,
            sqrtPriceLimitX96: 0
        });

        try ICustomSwapRouter(SWAP_ROUTER).exactInputSingle(params) returns (uint256 amountOut) {
            emit SwapDebug("Swap executed, amountOut", amountOut);
        } catch Error(string memory reason) {
            emit SwapDebug("Swap failed with reason", 0);
            emit SwapDebug(reason, 0);
        } catch (bytes memory lowLevelData) {
            emit SwapDebug("Swap failed with low level data", 0);
            if (lowLevelData.length > 0) {
                // Пытаемся декодировать ошибку
                if (lowLevelData.length < 68) {
                    emit SwapDebug("Low level error (short)", 0);
                } else {
                    string memory errorMessage = abi.decode(lowLevelData, (string));
                    emit SwapDebug(errorMessage, 0);
                }
            }
        }
    }

    function swapExactUSDCForETH(uint256 amountIn) external returns (uint256 amountOut) {
        // msg.sender must approve this contract

        // Transfer the specified amount of DAI to this contract.
        TransferHelper.safeTransferFrom(USDC, msg.sender, address(this), amountIn);

        // Approve the router to spend DAI.
        TransferHelper.safeApprove(USDC, SWAP_ROUTER, amountIn);

        // Naively set amountOutMinimum to 0. In production, use an oracle or other data source to choose a safer value for amountOutMinimum.
        // We also set the sqrtPriceLimitx96 to be 0 to ensure we swap our exact input amount.
        ICustomSwapRouter.ExactInputSingleParams memory params =
            ICustomSwapRouter.ExactInputSingleParams({
                tokenIn: USDC,
                tokenOut: WETH9,
                fee: 500,
                recipient: msg.sender,                
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            });

        // The call to `exactInputSingle` executes the swap.
        amountOut = ICustomSwapRouter(SWAP_ROUTER).exactInputSingle(params);
    }

    function uniswapV3SwapCallback(
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata data
    ) external {
        // Проверяем, что вызов пришел от доверенного пула
        address expectedPool = uniswapPools["USDCETH"];
        require(msg.sender == expectedPool, "Invalid callback caller");
        
        // Декодируем данные, переданные при вызове swap
        (address tokenIn, address tokenOut, uint24 fee) = abi.decode(data, (address, address, uint24));
        
        // Определяем, сколько токенов мы должны отправить в пул
        uint256 amountToPay = amount0Delta > 0 ? uint256(amount0Delta) : uint256(amount1Delta);
        
        // Отправляем токены в пул
        TransferHelper.safeTransfer(tokenIn, msg.sender, amountToPay);
    }

    // Прямое обращение к пулу
    function swapDirectInPool(uint256 amountOutMin) external payable {
        require(msg.value > 0, "No ETH sent");
        
        // Конвертируем ETH в WETH
        IWETH9(WETH9).deposit{value: msg.value}();
        uint256 wethBalance = IWETH9(WETH9).balanceOf(address(this));
        
        // Получаем адрес пула
        address poolAddress = uniswapPools["USDCETH"];
        IUniswapV3Pool pool = IUniswapV3Pool(poolAddress);
        
        // Определяем направление обмена
        (address token0, address token1) = (pool.token0(), pool.token1());
        bool zeroForOne = (WETH9 == token0);
        
        // Параметры для вызова swap
        int256 amountSpecified = int256(wethBalance);
        uint160 sqrtPriceLimitX96 = zeroForOne 
            ? TickMath.MIN_SQRT_RATIO + 1 
            : TickMath.MAX_SQRT_RATIO - 1;
        
        // Вызываем swap с передачей данных для callback
        (int256 amount0, int256 amount1) = pool.swap(
            msg.sender, // recipient
            zeroForOne,
            amountSpecified,
            sqrtPriceLimitX96,
            abi.encode(WETH9, USDC, pool.fee()) // данные для callback
        );
        
        // Проверяем результат
        uint256 amountOut = zeroForOne ? uint256(-amount1) : uint256(-amount0);
        require(amountOut >= amountOutMin, "Insufficient output amount");
        emit SwapDebug("Direct swap executed, amountOut", amountOut);
    }
    /*
    /// @notice функция произодит обмен эфров на UCDS
    function swapExactETHForToken(
        address tokenOut,
        uint24 fee,
        uint256 amountOutMinimum
    ) external payable {
        require(msg.value > 0, "No ETH sent");

        // 1. Оборачиваем ETH в WETH
        IWETH9(WETH).deposit{value: msg.value}();

        // 2. Апрувим роутер на использование WETH
        IWETH9(WETH).approve(SWAP_ROUTER, msg.value);

        // 3. Формируем параметры свапа
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: WETH,
            tokenOut: tokenOut,
            fee: fee,
            recipient: msg.sender,
            deadline: block.timestamp + 300,
            amountIn: msg.value,
            amountOutMinimum: amountOutMinimum,
            sqrtPriceLimitX96: 0
        });

        // 4. Запускаем свап
        ISwapRouter(SWAP_ROUTER).exactInputSingle(params);
    }*/
/*
    function swapExactTokenForETH(
        address tokenIn,
        uint24 fee,
        uint256 amountIn,
        uint256 amountOutMin
    ) external {
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(SWAP_ROUTER, amountIn);

        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: WETH,
            fee: fee,
            recipient: address(this), // сначала в контракт
            deadline: block.timestamp + 300,
            amountIn: amountIn,
            amountOutMinimum: amountOutMin,
            sqrtPriceLimitX96: 0
        });

        uint256 wethReceived = ISwapRouter(SWAP_ROUTER).exactInputSingle(params);

        // разворачиваем в ETH и отправляем юзеру
        IWETH9(WETH).withdraw(wethReceived);
        payable(msg.sender).transfer(wethReceived);
    }

*/

    /// @notice функция позволяет расширить список используемых пар
    /// @param pair наименование пары (без пробелов и слэшей)
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

   
    /*-------------- Функции для владельца -----------------*/
   
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

    ///@notice чтобы рефанды не отваливались
    receive() payable external {
    }
}
