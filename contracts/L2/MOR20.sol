// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {OFT} from "../@layerzerolabs/lz-evm-oapp-v2/contracts/oft/OFT.sol";

import {IMOR20, IERC20, IERC165, IOAppCore} from "../interfaces/L2/IMOR20.sol";

contract MOR20 is IMOR20, OFT {
    mapping(address => bool) public isMinter;

    constructor(
        string memory name_,
        string memory symbol_,
        address layerZeroEndpoint_,
        address delegate_,
        address minter_
    ) OFT(name_, symbol_, layerZeroEndpoint_, delegate_) {
        require(minter_ != address(0), "MOR20: invalid minter");

        isMinter[minter_] = true;

        transferOwnership(delegate_);
    }

    /**
     * @dev Returns true if this contract implements the interface defined by
     * `interfaceId`. See the corresponding
     * https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified[EIP section]
     * to learn more about how these ids are created.
     *
     * This function call must use less than 30 000 gas.
     */
    function supportsInterface(bytes4 interfaceId_) external pure returns (bool) {
        return
            interfaceId_ == type(IMOR20).interfaceId ||
            interfaceId_ == type(IERC20).interfaceId ||
            interfaceId_ == type(IOAppCore).interfaceId ||
            interfaceId_ == type(IERC165).interfaceId;
    }

    /**
     * @notice The function update `minter` addresses.
     * @param minter_ The upadted minter address.
     * @param status_ The new status. True or false.
     */
    function updateMinter(address minter_, bool status_) external onlyOwner {
        isMinter[minter_] = status_;
    }

    /**
     * @notice The function to mint tokens.
     * @param account_ The address of the account to mint tokens to.
     * @param amount_ The amount of tokens to mint.
     */
    function mint(address account_, uint256 amount_) public {
        require(isMinter[_msgSender()], "MOR20: invalid caller");

        _mint(account_, amount_);
    }

    /**
     * @notice The function to destroys `amount` tokens from the caller.
     * See {ERC20-_burn}.
     * @param amount_ The amount of tokens to burn.
     */
    function burn(uint256 amount_) public {
        _burn(_msgSender(), amount_);
    }

    /**
     * @notice The function to destroys `amount` tokens from `account`, deducting from the caller's
     * allowance.
     *
     * See {ERC20-_burn} and {ERC20-allowance}.
     *
     * Requirements:
     *
     * - the caller must have allowance for ``accounts``'s tokens of at least
     * `amount`.
     *
     * @param account_ The address of the account to burn tokens from.
     * @param amount_ The amount of tokens to burn.
     */
    function burnFrom(address account_, uint256 amount_) public {
        _spendAllowance(account_, _msgSender(), amount_);
        _burn(account_, amount_);
    }
}
