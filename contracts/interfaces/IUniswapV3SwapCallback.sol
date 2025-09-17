// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/// @title Интерфейc коллбэка Uniswap
/// @notice нужен для взаимодействия с пулом при swap
interface IUniswapV3SwapCallback {
    
    function uniswapV3SwapCallback(
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata data
    ) external;
}