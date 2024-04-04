// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {OFT} from "../@layerzerolabs/lz-evm-oapp-v2/contracts/oft/OFT.sol";

import {IERC20MOR, IERC20, IERC165, IOAppCore} from "../interfaces/IERC20MOR.sol";

contract ERC20MOR is IERC20MOR, OFT {
    address private immutable _minter;

    constructor(
        string memory name_,
        string memory symbol_,
        address layerZeroEndpoint_,
        address delegate_,
        address minter_
    ) OFT(name_, symbol_, layerZeroEndpoint_, delegate_) {
        _minter = minter_;

        transferOwnership(delegate_);
    }

    function supportsInterface(bytes4 interfaceId_) external pure returns (bool) {
        return
            interfaceId_ == type(IERC20MOR).interfaceId ||
            interfaceId_ == type(IERC20).interfaceId ||
            interfaceId_ == type(IOAppCore).interfaceId ||
            interfaceId_ == type(IERC165).interfaceId;
    }

    function minter() public view returns (address) {
        return _minter;
    }

    function mint(address account_, uint256 amount_) public {
        require(_msgSender() == minter(), "ERC20MOR: invalid caller");

        _mint(account_, amount_);
    }

    function burn(uint256 amount_) public {
        _burn(_msgSender(), amount_);
    }

    function burnFrom(address account_, uint256 amount_) public {
        _spendAllowance(account_, _msgSender(), amount_);
        _burn(account_, amount_);
    }
}
