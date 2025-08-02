// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "./IExecutorErrors.sol"; //интерфейс для ошибок
/*
import "@aave/core-v3/contracts/flashloan/base/FlashLoanSimpleReceiverBase.sol";
import "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import "@aave/core-v3/contracts/interfaces/IPool.sol";*/
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

/*
interface IUniswapV2Router {
    function swapExactTokensForTokens(...) external returns (...); // заглушка
}*/

/**
 * @notice демонстрационный контракт
 */
contract FlashloanExecutor is IExecutorErrors { /*FlashLoanSimpleReceiverBase {*/
    
    /// @notice  событие индицирует получение 
    event OracleChecked(uint256 pairPrice, bytes6 pair);

    /// @notice  событие индицирует добавление новой поддерживаемой пары
    /// @param pair наименование пары
    event NewPairAdded(bytes6 pair);
    
    /// @notice адрес владельца
    address public owner;
    
    /// @notice хранилище адресов фидов для валютных пар
    /// имя пары => адрес фида
    mapping (
        bytes6  pair =>
        address priceFeedAddress
    ) priceFeeds;
    
    /// @notice адрес Chainlink фида ETH/USD 
    //address private priceFeedETHUSD  = 0x694AA1769357215DE4FAC081bf1f309aDC325306;
    //AggregatorV3Interface public priceFeed;

    //модификатор проверяет права на выполнение функций только для владельца
    modifier onlyOwner() {
        require(msg.sender == owner, NotAnOwner(msg.sender));
        _;
    }
    
    constructor() {
        
        owner = msg.sender;
        
        //начальные установки добавим в справочник фиды для двуз пар 
        //потом можно будет добавлять через функцию
        priceFeeds[bytes6 ("ETHUSD")] = 0x694AA1769357215DE4FAC081bf1f309aDC325306;
        priceFeeds[bytes6 ("DAIUSD")] = 0x14866185B1962B63C3Ea9E03Bc1da838bab34C19;    
    }

    /**
     * @notice функция возвращает цену анализируемой пары
     * @param pair имя пары
     */
    function getPriceFromChainlink(bytes6 pair) public view returns (uint256) {
        
        AggregatorV3Interface priceFeed = AggregatorV3Interface(priceFeeds[pair]);
        //проверяем, что наша пара есть в справочнике
        require(priceFeeds[pair]!= address(0), FeedNotFound(pair)); 
        
        //запрашиваем цену в chainlink
        //второй возрващаемый параметр, остальные не нужны
        (, int256 price, , ,) = priceFeed.latestRoundData(); 
        
        require(price > 0, InvalidPriceReceipt()); //цена должна быть положительная
        
        return uint256(price);
    }

    /**
     * @notice функция позволяет расширить список используемых пар
     * @param pair наимнеование пары (без пробелов и слэшей)
     * @param feedAddress адрес фида из документации chainlink
     */
    function addNewPair(bytes6 pair, address feedAddress) onlyOwner() external {
        
        priceFeeds[pair] = feedAddress;
        emit NewPairAdded(pair);
    }
    
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
}
