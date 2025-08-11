// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

interface IUniswapV3Pool {
    function slot0()
        external
        view
        returns (
            uint160 sqrtPriceX96,
            int24 tick,
            uint16 observationIndex,
            uint16 observationCardinality,
            uint16 observationCardinalityNext,
            uint8 feeProtocol,
            bool unlocked
        );

    function token0() external view returns (address);
    function token1() external view returns (address);
}

interface IERC20Minimal {
    function decimals() external view returns (uint8);
}

library FullMath {
    function mulDiv(uint256 a, uint256 b, uint256 denominator) internal pure returns (uint256 result) {
        unchecked {
            uint256 prod0;
            uint256 prod1;
            assembly {
                let mm := mulmod(a, b, not(0))
                prod0 := mul(a, b)
                prod1 := sub(sub(mm, prod0), lt(mm, prod0))
            }
            if (prod1 == 0) {
                return prod0 / denominator;
            }
            require(denominator > prod1, "FullMath: overflow");
            uint256 remainder;
            assembly {
                remainder := mulmod(a, b, denominator)
            }
            assembly {
                prod1 := sub(prod1, gt(remainder, prod0))
                prod0 := sub(prod0, remainder)
            }
            uint256 twos = denominator & (~denominator + 1);
            assembly {
                denominator := div(denominator, twos)
            }
            assembly {
                prod0 := div(prod0, twos)
            }
            assembly {
                twos := add(div(sub(0, twos), twos), 1)
            }
            prod0 |= prod1 * twos;
            uint256 inv = (3 * denominator) ^ 2;
            inv *= 2 - denominator * inv;
            inv *= 2 - denominator * inv;
            inv *= 2 - denominator * inv;
            inv *= 2 - denominator * inv;
            inv *= 2 - denominator * inv;
            inv *= 2 - denominator * inv;
            result = prod0 * inv;
            return result;
        }
    }
}

contract PoolPriceReader {
    using FullMath for uint256;

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
        )
    {
        (uint160 sqrtPriceX96,, , , , ,) = IUniswapV3Pool(pool).slot0();

        token0 = IUniswapV3Pool(pool).token0();
        token1 = IUniswapV3Pool(pool).token1();

        dec0 = _safeDecimals(token0);
        dec1 = _safeDecimals(token1);

        uint256 priceRaw = FullMath.mulDiv(uint256(sqrtPriceX96), uint256(sqrtPriceX96), 1 << 192);

        // price(token1/token0) с учётом decimals
        int256 exp1per0 = int256(18) + int256(uint256(dec0)) - int256(uint256(dec1));
        price1per0_1e18 = _scalePrice(priceRaw, exp1per0);

        // price(token0/token1) = 1 / price(token1/token0)
        int256 exp0per1 = int256(18) + int256(uint256(dec1)) - int256(uint256(dec0));
        price0per1_1e18 = _scalePrice(FullMath.mulDiv(1e36, 1, price1per0_1e18), 0);
    }

    function _safeDecimals(address token) internal view returns (uint8) {
        try IERC20Minimal(token).decimals() returns (uint8 d) {
            return d;
        } catch {
            return 18;
        }
    }

    function _scalePrice(uint256 priceRaw, int256 exp) internal pure returns (uint256) {
        if (exp >= 0) {
            return priceRaw * (10 ** uint256(exp));
        } else {
            return priceRaw / (10 ** uint256(-exp));
        }
    }
}
