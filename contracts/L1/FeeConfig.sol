// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import {PRECISION} from "@solarity/solidity-lib/utils/Globals.sol";

import {IFeeConfig} from "../interfaces/L1/IFeeConfig.sol";

contract FeeConfig is IFeeConfig, OwnableUpgradeable {
    address public treasury;
    uint256 public baseFee;

    mapping(address => uint256) public fees;

    function __FeeConfig_init(address treasury_, uint256 baseFee_) external initializer {
        __Ownable_init();

        treasury = treasury_;
        baseFee = baseFee_;
    }

    function setFee(address sender_, uint256 fee_) external onlyOwner {
        require(fee_ <= PRECISION, "FC: invalid fee");

        fees[sender_] = fee_;
    }

    function setTreasury(address treasury_) external onlyOwner {
        require(treasury_ != address(0), "FC: invalid treasury");

        treasury = treasury_;
    }

    function setBaseFee(uint256 baseFee_) external onlyOwner {
        require(baseFee_ < PRECISION, "FC: invalid base fee");

        baseFee = baseFee_;
    }

    function getFeeAndTreasury(address sender_) external view returns (uint256, address) {
        uint256 fee_ = fees[sender_];
        if (fee_ == 0) {
            fee_ = baseFee;
        }

        return (fee_, treasury);
    }
}
