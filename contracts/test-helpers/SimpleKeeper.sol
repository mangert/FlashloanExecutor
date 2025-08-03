// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";

/**
 * @notice образец автоматизированного контракта 
 * для экспериментов с автоматизацией chainlink
 * 0x1165988B9d7176Ad55a652cBBc66e9BDf816Ec3C  адрес в Sepolia
 */

contract SimpleKeeper is AutomationCompatibleInterface {
    uint256 public counter;
    uint256 public lastTimeStamp;
    uint256 public interval;

    constructor(uint256 updateInterval) {
        interval = updateInterval; // интервал, например, 600 секунд
        lastTimeStamp = block.timestamp;
        counter = 0;
    }

    // Эта функция вызывается Chainlink-нодой off-chain
    function checkUpkeep(bytes calldata) external view override returns (bool upkeepNeeded, bytes memory) {
        upkeepNeeded = (block.timestamp - lastTimeStamp) > interval;
    }

    // Если checkUpkeep вернул true, вызывается эта функция
    function performUpkeep(bytes calldata) external override {
        if ((block.timestamp - lastTimeStamp) > interval) {
            lastTimeStamp = block.timestamp;
            counter = counter + 1;
        }
    }
}
