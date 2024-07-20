// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

// Uncomment this line to use console.log
import "hardhat/console.sol";
// DONE: Import the IERC20 interface
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// DONE: Import the YakRouter interface
import "./IYakRouter.sol";
import "./IBenqiMarket.sol";
import "./IQiToken.sol";
import "./IJacksAVAXGateway.sol";

contract DefiVault {
    mapping(address => bool) public supportedTokens;
    address public owner;
    IYakRouter public yakRouter;
    address public immutable sAVAX;
    address public constant WAVAX = 0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7;
    address public constant QiTokenAddress =
        0xF362feA9659cf036792c9cb02f8ff8198E21B4cB;
    address public constant BenqiMarket =
        0x486Af39519B4Dc9a7fCcd318217352830E8AD9b4;
    address public constant AvaxQiToken =
        0x5C0401e81Bc07Ca70fAD469b451682c0d747Ef1c;

    constructor(address _yakRouter, address _sAVAX) {
        owner = msg.sender;
        yakRouter = IYakRouter(_yakRouter);
        sAVAX = _sAVAX;
        IERC20(WAVAX).approve(_yakRouter, type(uint256).max);
    }

    // TODO: Remove or make internal this function, it only exists for testing purposes
    /**
     * @dev Throws if called by any account other than the owner.
     * @notice User can deposit token or native currency
     * @param token Address of the token to deposit
     * @param amount Amount of the token to deposit (will be used only for ERC20 tokens)
     */
    function depositAsset(
        address token,
        uint256 amount
    ) public payable returns (uint256) {
        // require(supportedTokens[token], "Token not supported");
        // DONE: Check if deposit currency is native or ERC20 token
        if (msg.value > 0) {
            return address(this).balance;
        } else {
            // DONE: If asset is token, complete the transfer with safeTransferFrom
            IERC20(token).transferFrom(msg.sender, address(this), amount);
            return IERC20(token).balanceOf(address(this));
        }

        // DONE: return balance

        // return 0;
    }

    function swapWithYak(
        address[] memory path,
        uint256[] memory amounts,
        address[] memory adapters
    )
        public
        returns (
            // bool isAVAX
            uint256
        )
    {
        uint256 adjustedAmountOut = (amounts[amounts.length - 1] * 998) / 1000;

        IYakRouter.Trade memory trade = IYakRouter.Trade({
            amountIn: amounts[0],
            amountOut: adjustedAmountOut, // 99.9 % for better trades
            path: path,
            adapters: adapters
        });

        uint256 initialBalance = IERC20(sAVAX).balanceOf(address(this));

        IERC20(path[0]).approve(address(yakRouter), amounts[0] + 1 ether);
        // if (isAVAX) {
        //     IYakRouter(yakRouter).swapNoSplitFromAVAX{value: amounts[0]}(
        //         trade,
        //         address(this),
        //         0
        //     );
        // } else {
        console.log("Approval success");
        IYakRouter(yakRouter).swapNoSplit(trade, address(this), 0);
        // }

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
    ) public returns (uint) {
        // Get account liquidity
        (uint error, uint liquidity, uint shortfall) = comptroller
            .getAccountLiquidity(account);
        console.log("Account liquidity: ");
        console.log(liquidity);
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
        console.log("Amount sAVAX: %s", amount);
        IQiToken qiToken = IQiToken(QiTokenAddress);
        IERC20(sAVAX).approve(QiTokenAddress, amount + 1 ether);
        address[] memory qiTokens = new address[](2);
        qiTokens[0] = QiTokenAddress; // sAVAX QiToken contract address
        qiTokens[1] = AvaxQiToken;
        // Supply qisAvax to comptroller
        IBenqiMarket comptroller = IBenqiMarket(BenqiMarket);
        console.log("Before calling comptroller enter market");
        comptroller.enterMarkets(qiTokens);
        console.log("After calling comptroller enter market");

        console.log("Calling mint");
        qiToken.mint(amount);
        uint256 mintedAmount = qiToken.balanceOf(address(this));
        console.log("Minted amount: %s", mintedAmount);

        console.log("Balance of qisAvax: %s", qiToken.balanceOf(address(this)));

        qiToken.approve(BenqiMarket, mintedAmount);
        qiToken.approve(AvaxQiToken, mintedAmount);
        console.log("Balance stored");
        uint256 borrowAmount = getMaxBorrowAmount(
            address(this),
            comptroller,
            qiToken
        );
        console.log("Borrow Amount : ");
        console.log(borrowAmount);

        IQiToken(AvaxQiToken).borrow(borrowAmount);

        console.log("Completed borrow");
        return 0;
    }

    function testFlow(
        address[] memory path,
        uint256[] memory amounts,
        address[] memory adapters
    ) public payable {
        swapWithYak(path, amounts, adapters);
        depositToBenqi();
        mintFromStableJack(path, amounts, adapters, 1 ether, 1 ether);
    }

    function mintFromStableJack(
        address[] memory path,
        uint256[] memory amounts,
        address[] memory adapters,
        uint256 _minaTokenMinted,
        uint256 _minxTokenMinted
    ) public returns (uint256, uint256) {
        IJacksAVAXGateway sAVAXGateway = IJacksAVAXGateway(
            0x013b34DBA0d6c9810F530534507144a8646E3273
        );
        sAVAXGateway.mintBoth{value: 10 ether}(
            path,
            amounts,
            adapters,
            _minaTokenMinted,
            _minxTokenMinted,
            true,
            address(this)
        );
    }

    receive() external payable {
        console.log("Receive called");
    }

    fallback() external payable {
        console.log("Fallback called");
    }
}
