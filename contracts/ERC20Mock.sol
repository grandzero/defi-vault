// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ERC20Mock is ERC20 {
    uint8 private _decimals;

    /**
     * @dev Constructor that gives msg.sender all of the existing tokens.
     * @param name The name of the token
     * @param symbol The symbol of the token
     * @param decimals The decimal places of the token
     * @param initialSupply The initial supply of tokens (in smallest unit, considering decimals)
     */
    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals,
        uint256 initialSupply
    ) ERC20(name, symbol) {
        _decimals = decimals;
        _mint(msg.sender, initialSupply);
    }

    /**
     * @dev Returns the number of decimals used to get its user representation.
     */
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
}
