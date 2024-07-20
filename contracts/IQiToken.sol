// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
pragma abicoder v2;

interface IQiToken {
    function name() external view returns (string memory);

    function borrowIndex() external view returns (uint);

    function approve(address spender, uint amount) external returns (bool);

    function mint(uint mintAmount) external returns (uint);

    function redeem(uint redeemTokens) external returns (uint);

    function redeemUnderlying(uint redeemAmount) external returns (uint);

    function borrow(uint256 borrowAmount) external returns (uint256);

    function borrowBalanceStored(address account) external view returns (uint);

    function repayBorrow(uint repayAmount) external returns (uint);

    function balanceOf(address owner) external view returns (uint);

    function borrowBalanceCurrent(address account) external returns (uint);

    function repayBorrowBehalf(
        address borrower,
        uint repayAmount
    ) external returns (uint);

    function exchangeRateStored() external view returns (uint);

    function balanceOfUnderlying(address owner) external returns (uint);
}
