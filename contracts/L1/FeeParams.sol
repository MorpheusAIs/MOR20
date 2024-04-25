// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import {PRECISION} from "@solarity/solidity-lib/utils/Globals.sol";

contract FeeParams is UUPSUpgradeable, OwnableUpgradeable {
    address public treasuryAddress;

    uint256 public baseFee;

    mapping(address => uint256) public fees;

    function __FeeParams_init(address treasuryAddress_, uint256 baseFee_) external initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();

        treasuryAddress = treasuryAddress_;
        baseFee = baseFee_;
    }

    function setFee(address token_, uint256 fee_) external onlyOwner {
        require(fee_ < PRECISION, "FeeParams: invalid fee");

        fees[token_] = fee_;
    }

    function setTreasury(address treasuryAddress_) external onlyOwner {
        treasuryAddress = treasuryAddress_;
    }

    function setBaseFee(uint256 baseFee_) external onlyOwner {
        require(baseFee_ < PRECISION, "FeeParams: invalid fee");

        baseFee = baseFee_;
    }

    function getFeeAndTreasury(address distributionAddress_) external view returns (uint256, address) {
        uint256 fee_ = fees[distributionAddress_];
        if (fee_ == 0) {
            fee_ = baseFee;
        }

        return (fee_, treasuryAddress);
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}
