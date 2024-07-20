// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

interface IJacksAVAXGateway {
    function mintBoth(
        address[] memory path,
        uint256[] memory amounts,
        address[] memory adapters,
        uint256 _minaTokenMinted,
        uint256 _minxTokenMinted,
        bool isAVAX,
        address _recipient
    ) external payable returns (uint256 _aTokenMinted, uint256 _xTokenMinted);
}
