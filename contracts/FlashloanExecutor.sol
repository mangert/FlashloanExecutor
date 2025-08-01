// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@aave/core-v3/contracts/flashloan/base/FlashLoanSimpleReceiverBase.sol";
import "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import "@aave/core-v3/contracts/interfaces/IPool.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

interface IUniswapV2Router {
    function swapExactTokensForTokens(...) external returns (...); // заглушка
}

contract FlashloanExecutor is FlashLoanSimpleReceiverBase {
    AggregatorV3Interface public priceFeed;
    address public owner;
    uint256 public priceThreshold;

    event OracleChecked(uint256 ethPrice);
    event FlashloanExecuted(address asset, uint256 amount);

    constructor(
        address _addressProvider,
        address _priceFeed,
        uint256 _threshold
    ) FlashLoanSimpleReceiverBase(IPoolAddressesProvider(_addressProvider)) {
        priceFeed = AggregatorV3Interface(_priceFeed);
        owner = msg.sender;
        priceThreshold = _threshold;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    function getPriceFromChainlink() public view returns (uint256) {
        (, int256 price,,,) = priceFeed.latestRoundData();
        require(price > 0, "Invalid price");
        return uint256(price);
    }

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
    }
}
