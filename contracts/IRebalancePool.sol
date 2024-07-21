// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

interface IRebalancePool {
    function deposit(uint256 _amount, address _recipient) external;
}
