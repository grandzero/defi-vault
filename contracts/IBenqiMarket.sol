// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
pragma abicoder v2;

interface IBenqiMarket {
    struct Market {
        /// @notice Whether or not this market is listed
        bool isListed;
        /**
         * @notice Multiplier representing the most one can borrow against their collateral in this market.
         *  For instance, 0.9 to allow borrowing 90% of collateral value.
         *  Must be between 0 and 1, and stored as a mantissa.
         */
        uint collateralFactorMantissa;
        /// @notice Per-market mapping of "accounts in this asset"
        mapping(address => bool) accountMembership;
        /// @notice Whether or not this market receives BENQI
        bool isQied;
    }

    /*** Assets You Are In ***/

    function enterMarkets(
        address[] calldata qiTokens
    ) external returns (uint[] memory);

    function exitMarket(address qiToken) external returns (uint);

    /*** Policy Hooks ***/

    function mintAllowed(
        address qiToken,
        address minter,
        uint mintAmount
    ) external returns (uint);

    function mintVerify(
        address qiToken,
        address minter,
        uint mintAmount,
        uint mintTokens
    ) external;

    function redeemAllowed(
        address qiToken,
        address redeemer,
        uint redeemTokens
    ) external returns (uint);

    function redeemVerify(
        address qiToken,
        address redeemer,
        uint redeemAmount,
        uint redeemTokens
    ) external;

    function borrowAllowed(
        address qiToken,
        address borrower,
        uint borrowAmount
    ) external returns (uint);

    function borrowVerify(
        address qiToken,
        address borrower,
        uint borrowAmount
    ) external;

    function getAccountLiquidity(
        address account
    ) external view returns (uint, uint, uint);

    function markets(address qiTokenAddress) external view returns (bool, uint);
}
