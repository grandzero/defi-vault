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

/**
 * @title DefiVault
 * @dev This contract implements various DeFi strategies including swaps, deposits, and borrowings
 *      using different protocols like YakRouter, Benqi, and JacksAVAXGateway.
 */
contract DefiVault is Ownable, ReentrancyGuard {
    // Interfaces and addresses for the external contracts used by this vault
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

    /**
     * @dev Initializes the contract by setting the YakRouter and sAVAX addresses and approving the router.
     * @param _yakRouter The address of the YakRouter contract.
     * @param _sAVAX The address of the sAVAX token.
     */
    constructor(address _yakRouter, address _sAVAX) Ownable(msg.sender) {
        yakRouter = IYakRouter(_yakRouter);
        sAVAX = _sAVAX;
        IERC20(WAVAX).approve(_yakRouter, type(uint256).max);
    }

    /**
     * @notice Swaps tokens using YakRouter.
     * @param path The path of tokens to be swapped.
     * @param amounts The amounts corresponding to each token in the path.
     * @param adapters The adapters for each token in the path.
     * @param isAVAX Indicates if the input token is AVAX.
     * @return Returns 0 if the swap is successful.
     */
    function swapWithYak(
        address[] memory path,
        uint256[] memory amounts,
        address[] memory adapters,
        bool isAVAX
    ) public payable returns (uint256) {
        uint256 adjustedAmountOut = (amounts[amounts.length - 1] * 900) / 1000;

        IYakRouter.Trade memory trade = IYakRouter.Trade({
            amountIn: amounts[0],
            amountOut: adjustedAmountOut,
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

    /**
     * @notice Calculates the maximum amount that can be borrowed from Benqi.
     * @param account The address of the account to check liquidity.
     * @param comptroller The address of the Benqi comptroller contract.
     * @param sAvaxQiToken The address of the sAVAX QiToken contract.
     * @return The maximum borrow amount.
     */
    function getMaxBorrowAmount(
        address account,
        IBenqiMarket comptroller,
        IQiToken sAvaxQiToken
    ) public view returns (uint) {
        (uint error, , uint shortfall) = comptroller.getAccountLiquidity(
            account
        );
        require(error == 0, "Failed to get account liquidity");
        require(shortfall == 0, "Account is in shortfall");

        (bool isListed, uint collateralFactorMantissa) = comptroller.markets(
            address(sAvaxQiToken)
        );
        require(isListed, "sAVAX market is not listed");

        uint exchangeRateMantissa = sAvaxQiToken.exchangeRateStored();
        require(exchangeRateMantissa > 0, "Invalid exchange rate");

        uint qisAvaxBalance = sAvaxQiToken.balanceOf(account);
        require(qisAvaxBalance > 0, "qisAVAX balance is zero");

        uint qisAvaxValueInSAvax = (qisAvaxBalance * exchangeRateMantissa) /
            1e18;
        require(qisAvaxValueInSAvax > 0, "qisAVAX value in sAVAX is zero");

        uint qisAvaxValueInAvax = (qisAvaxValueInSAvax *
            collateralFactorMantissa) / 1e18;

        uint maxBorrow = qisAvaxValueInAvax;

        return maxBorrow;
    }

    /**
     * @notice Deposits sAVAX tokens into Benqi.
     */
    function depositToBenqi() public {
        uint256 amount = IERC20(sAVAX).balanceOf(address(this));

        IQiToken qiToken = IQiToken(QiTokenAddress);
        IERC20(sAVAX).approve(QiTokenAddress, amount + 1 ether);

        address[] memory qiTokens = new address[](2);
        qiTokens[0] = QiTokenAddress;
        qiTokens[1] = AvaxQiToken;

        IBenqiMarket comptroller = IBenqiMarket(BenqiMarket);
        comptroller.enterMarkets(qiTokens);

        qiToken.mint(amount);
        uint256 mintedAmount = qiToken.balanceOf(address(this));

        qiToken.approve(BenqiMarket, mintedAmount);
        qiToken.approve(AvaxQiToken, mintedAmount);
    }

    /**
     * @notice Borrows AVAX tokens from Benqi using deposited sAVAX as collateral.
     */
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

    /**
     * @notice Mints tokens using the JacksAVAXGateway.
     * @param path The path of tokens to be swapped.
     * @param amounts The amounts corresponding to each token in the path.
     * @param adapters The adapters for each token in the path.
     * @param _minaTokenMinted The minimum amount of aToken to be minted.
     * @param _minxTokenMinted The minimum amount of xToken to be minted.
     */
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

    /**
     * @notice Deposits aTokens into the RebalancePool.
     */
    function depositStableJackRebalancePool() public {
        uint256 aTokenBalance = IERC20(aToken).balanceOf(address(this));

        IERC20(aToken).approve(RebalancePool, aTokenBalance);

        IRebalancePool(RebalancePool).deposit(aTokenBalance, address(this));
    }

    /**
     * @notice Executes a complete deposit workflow including swap, deposit, and borrowing.
     * @param path The path of tokens to be swapped.
     * @param amounts The amounts corresponding to each token in the path.
     * @param adapters The adapters for each token in the path.
     * @param isAVAX Indicates if the input token is AVAX.
     */
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

    /**
     * @notice Executes minting and depositing tokens using the StableJack gateway.
     * @param path The path of tokens to be swapped.
     * @param amounts The amounts corresponding to each token in the path.
     * @param adapters The adapters for each token in the path.
     * @param _minaTokenMinted The minimum amount of aToken to be minted.
     * @param _minxTokenMinted The minimum amount of xToken to be minted.
     */
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

    /**
     * @dev Fallback function to receive AVAX.
     */
    receive() external payable {}

    /**
     * @dev Fallback function for handling any other calls.
     */
    fallback() external payable {}
}
