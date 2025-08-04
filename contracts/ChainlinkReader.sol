// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

//черновик
//Образец контракта по получению данных о ценах c Chainlink


contract ChainlinkReader {
    AggregatorV3Interface public priceFeed;

    constructor(address feedAddress) {
        priceFeed = AggregatorV3Interface(feedAddress);
    }

    function getDetails()
        external
        view
        returns (
            string memory desc,
            uint8 decimals,
            uint256 version
        )
    {
        return (
            priceFeed.description(),
            priceFeed.decimals(),
            priceFeed.version()
        );
    }

    function getLatestPrice() external view returns (int256 price, uint256 updatedAt) {
        (
            ,
            int256 answer,
            ,
            uint256 timeStamp,
        ) = priceFeed.latestRoundData();
        return (answer, timeStamp);
    }
}
