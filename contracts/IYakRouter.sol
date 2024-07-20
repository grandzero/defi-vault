// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
pragma abicoder v2;

interface IYakRouter {
    struct FormattedOffer {
        uint256[] amounts;
        address[] adapters;
        address[] path;
        uint256 gasEstimate;
    }
    struct Trade {
        uint amountIn;
        uint amountOut;
        address[] path;
        address[] adapters;
    }

    function findBestPath(
        uint256 _amountIn,
        address _tokenIn,
        address _tokenOut,
        uint256 _maxSteps
    ) external view returns (FormattedOffer memory);

    function findBestPathWithGas(
        uint256 _amountIn,
        address _tokenIn,
        address _tokenOut,
        uint _maxSteps,
        uint _gasPrice
    )
        external
        view
        returns (
            uint[] memory amounts,
            address[] memory adapters,
            address[] memory path,
            uint gasEstimate
        );

    function swapNoSplit(
        Trade calldata _trade,
        address _to,
        uint _fee
    ) external;

    function swapNoSplitFromAVAX(
        Trade calldata _trade,
        address _to,
        uint256 _fee
    ) external payable;
}
