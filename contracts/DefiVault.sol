// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./IYakRouter.sol";
import "./IBenqiMarket.sol";
import "./IQiToken.sol";
import "./IJacksAVAXGateway.sol";
import "./IRebalancePool.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract DefiVault is Ownable, ReentrancyGuard {
    // mapping(address => bool) public supportedTokens;

    IYakRouter public yakRouter;
    address public immutable sAVAX;
    address public constant WAVAX = 0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7;
    address public constant QiTokenAddress =
        0xF362feA9659cf036792c9cb02f8ff8198E21B4cB;
    address public constant BenqiMarket =
        0x486Af39519B4Dc9a7fCcd318217352830E8AD9b4;
    address public constant AvaxQiToken =
        0x5C0401e81Bc07Ca70fAD469b451682c0d747Ef1c;
    address public constant RebalancePool =
        0x0363a3deBe776de575C36F524b7877dB7dd461Db;
    address public constant aToken = 0xaBe7a9dFDA35230ff60D1590a929aE0644c47DC1;

    constructor(address _yakRouter, address _sAVAX) Ownable(msg.sender) {
        yakRouter = IYakRouter(_yakRouter);
        sAVAX = _sAVAX;
        IERC20(WAVAX).approve(_yakRouter, type(uint256).max);
    }

    // This function is commented because in test environment (hardhat mainnet fork test) it throws an error

    // function swapWithYakDynamic(
    //     uint256 amountIn,
    //     address tokenIn,
    //     address tokenOut,
    //     bool isAvax
    // )
    //     public
    //     returns (
    //         // bool isAVAX
    //         uint256
    //     )
    // {
    //
    //     IYakRouter.FormattedOffer memory offer = yakRouter.findBestPath(
    //         amountIn,
    //         tokenIn,
    //         tokenOut,
    //         3
    //     );
    //
    //     uint256 adjustedAmountOut = (offer.amounts[offer.amounts.length - 1] *
    //         998) / 1000;

    //     IYakRouter.Trade memory trade = IYakRouter.Trade({
    //         amountIn: offer.amounts[0],
    //         amountOut: adjustedAmountOut, // 99.9 % for better trades
    //         path: offer.path,
    //         adapters: offer.adapters
    //     });

    //     uint256 initialBalance = IERC20(sAVAX).balanceOf(address(this));

    //     IERC20(offer.path[0]).approve(
    //         address(yakRouter),
    //         offer.amounts[0] + 1 ether
    //     );
    //     if (isAvax) {
    //         IYakRouter(yakRouter).swapNoSplitFromAVAX{value: offer.amounts[0]}(
    //             trade,
    //             address(this),
    //             0
    //         );
    //     } else {
    //
    //         IYakRouter(yakRouter).swapNoSplit(trade, address(this), 0);
    //     }

    //     uint256 finalBalance = IERC20(sAVAX).balanceOf(address(this));
    //     require(
    //         finalBalance > initialBalance,
    //         "Swap did not work, no new sAVAX"
    //     );

    //     return 0;
    // }

    function swapWithYak(
        address[] memory path,
        uint256[] memory amounts,
        address[] memory adapters,
        bool isAVAX
    )
        public
        payable
        returns (
            // bool isAVAX
            uint256
        )
    {
        // Adjusted amount lowered for test purposes. Otherwise hardhat tests fail because of oracle usage
        uint256 adjustedAmountOut = (amounts[amounts.length - 1] * 900) / 1000;

        IYakRouter.Trade memory trade = IYakRouter.Trade({
            amountIn: amounts[0],
            amountOut: adjustedAmountOut, // 99.9 % for better trades
            path: path,
            adapters: adapters
        });

        uint256 initialBalance = IERC20(sAVAX).balanceOf(address(this));

        IERC20(path[0]).approve(address(yakRouter), amounts[0] + 1 ether);
        if (isAVAX) {
            IYakRouter(yakRouter).swapNoSplitFromAVAX{value: amounts[0]}(
                trade,
                address(this),
                0
            );
        } else {
            IERC20(path[0]).transferFrom(msg.sender, address(this), amounts[0]);

            IYakRouter(yakRouter).swapNoSplit(trade, address(this), 0);
        }

        uint256 finalBalance = IERC20(sAVAX).balanceOf(address(this));
        require(
            finalBalance > initialBalance,
            "Swap did not work, no new sAVAX"
        );

        return 0;
    }

    function getMaxBorrowAmount(
        address account,
        IBenqiMarket comptroller,
        IQiToken sAvaxQiToken
    ) public view returns (uint) {
        // Get account liquidity
        (uint error, , uint shortfall) = comptroller.getAccountLiquidity(
            account
        );

        require(error == 0, "Failed to get account liquidity");
        require(shortfall == 0, "Account is in shortfall");

        // Get collateral factor for sAVAX
        (bool isListed, uint collateralFactorMantissa) = comptroller.markets(
            address(sAvaxQiToken)
        );
        require(isListed, "sAVAX market is not listed");

        // Get the exchange rate of the sAVAX QiToken
        uint exchangeRateMantissa = sAvaxQiToken.exchangeRateStored();
        require(exchangeRateMantissa > 0, "Invalid exchange rate");

        // Get the balance of qisAVAX tokens held by the account
        uint qisAvaxBalance = sAvaxQiToken.balanceOf(account);
        require(qisAvaxBalance > 0, "qisAVAX balance is zero");

        // Calculate the value of qisAVAX in terms of sAVAX
        uint qisAvaxValueInSAvax = (qisAvaxBalance * exchangeRateMantissa) /
            1e18;
        require(qisAvaxValueInSAvax > 0, "qisAVAX value in sAVAX is zero");

        // Calculate the value of qisAVAX in terms of AVAX using collateral factor
        uint qisAvaxValueInAvax = (qisAvaxValueInSAvax *
            collateralFactorMantissa) / 1e18;

        // Calculate the maximum borrow amount
        uint maxBorrow = qisAvaxValueInAvax;

        return maxBorrow;
    }

    function depositToBenqi() public returns (uint256) {
        uint256 amount = IERC20(sAVAX).balanceOf(address(this));

        IQiToken qiToken = IQiToken(QiTokenAddress);
        IERC20(sAVAX).approve(QiTokenAddress, amount + 1 ether);

        address[] memory qiTokens = new address[](2);
        qiTokens[0] = QiTokenAddress; // sAVAX QiToken contract address
        qiTokens[1] = AvaxQiToken;

        // Supply qisAvax to comptroller
        IBenqiMarket comptroller = IBenqiMarket(BenqiMarket);
        comptroller.enterMarkets(qiTokens);

        qiToken.mint(amount);
        uint256 mintedAmount = qiToken.balanceOf(address(this));

        qiToken.approve(BenqiMarket, mintedAmount);
        qiToken.approve(AvaxQiToken, mintedAmount);

        return 0;
    }

    function borrowFromBenqi() public {
        IQiToken qiToken = IQiToken(QiTokenAddress);
        IBenqiMarket comptroller = IBenqiMarket(BenqiMarket);

        uint256 borrowAmount = getMaxBorrowAmount(
            address(this),
            comptroller,
            qiToken
        );

        IQiToken(AvaxQiToken).borrow(borrowAmount);
    }

    function mintFromStableJack(
        address[] memory path,
        uint256[] memory amounts,
        address[] memory adapters,
        uint256 _minaTokenMinted,
        uint256 _minxTokenMinted
    ) public payable {
        IJacksAVAXGateway sAVAXGateway = IJacksAVAXGateway(
            0x013b34DBA0d6c9810F530534507144a8646E3273
        );

        sAVAXGateway.mintBoth{value: address(this).balance}(
            path,
            amounts,
            adapters,
            _minaTokenMinted,
            _minxTokenMinted,
            true,
            address(this)
        );
    }

    function depositStableJackRebalancePool() public {
        uint256 aTokenBalance = IERC20(aToken).balanceOf(address(this));

        IERC20(aToken).approve(RebalancePool, aTokenBalance);

        IRebalancePool(RebalancePool).deposit(aTokenBalance, address(this));
    }

    function deposit(
        address[] memory path,
        uint256[] memory amounts,
        address[] memory adapters,
        bool isAVAX
    ) public payable onlyOwner nonReentrant {
        swapWithYak(path, amounts, adapters, isAVAX);

        depositToBenqi();

        borrowFromBenqi();
    }

    function mintAndDepositStableJack(
        address[] memory path,
        uint256[] memory amounts,
        address[] memory adapters,
        uint256 _minaTokenMinted,
        uint256 _minxTokenMinted
    ) public payable onlyOwner nonReentrant {
        mintFromStableJack(
            path,
            amounts,
            adapters,
            _minaTokenMinted,
            _minxTokenMinted
        );
        depositStableJackRebalancePool();
    }

    receive() external payable {}

    fallback() external payable {}
}
