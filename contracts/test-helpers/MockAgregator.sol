// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import { AggregatorV3Interface } from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

/**
  * @notice контракт-мок для тестов функциональности ChainLink
 */
contract MockAggregatorV3 is AggregatorV3Interface {
    int256 public mockPrice;
    uint256 public mockUpdatedAt;
    uint80 public mockRoundId;
    uint80 public mockAnsweredInRound;

    //конструктор нужен чтобы моделировать поведение оракула для разных сценариев тестов
    constructor(
        int256 _price,
        uint256 _updatedAt,
        uint80 _roundId,
        uint80 _answeredInRound
    ) {
        mockPrice = _price;
        mockUpdatedAt = _updatedAt;
        mockRoundId = _roundId;
        mockAnsweredInRound = _answeredInRound;
    }

    function latestRoundData()
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (
            mockRoundId,
            mockPrice,
            0,
            mockUpdatedAt,
            mockAnsweredInRound
        );
    }

    function decimals() external view override returns (uint8) {
        return 8;
    }

    function description() external view override returns (string memory) {
        return "MockAggregatorV3";
    }

    function version() external view override returns (uint256) {
        return 1;
    }

    function getRoundData(uint80) external view override returns (
        uint80, int256, uint256, uint256, uint80
    ) {
        return (0, 0, 0, 0, 0);
    }
}
