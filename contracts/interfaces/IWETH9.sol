// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/// @title интерфейс работы с "обернутым" эфиром
/// @notice содержит сигнатуры функций для работы с обернутым эфиром для использования в контрактах с переводом средств

interface IWETH9 {
    function deposit() external payable;
    function withdraw(uint256) external;
    function transfer(address to, uint256 value) external returns (bool);
    function approve(address spender, uint256 value) external returns (bool);    
    function allowance (address, address) external view returns (uint256);
    function balanceOf(address owner) external view returns (uint256);
}
