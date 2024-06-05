// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import {PRECISION} from "@solarity/solidity-lib/utils/Globals.sol";

import {IFeeConfig} from "../interfaces/L1/IFeeConfig.sol";

contract FeeConfig is IFeeConfig, OwnableUpgradeable {
    /**
     * @notice Address of treasury where fees will be transfered
     */
    address public treasury;

    /**
     * @notice Base fee
     */
    uint256 public baseFee;

    /**
     * @notice Sender => Fee
     */
    mapping(address => uint256) public fees;

    /**
     * @inheritdoc IFeeConfig
     */
    function __FeeConfig_init(address treasury_, uint256 baseFee_) external initializer {
        __Ownable_init();

        treasury = treasury_;
        baseFee = baseFee_;
    }

    /**
     * @inheritdoc IFeeConfig
     */
    function setFee(address sender_, uint256 fee_) external onlyOwner {
        require(fee_ <= PRECISION, "FC: invalid fee");

        fees[sender_] = fee_;
    }

    /**
     * @inheritdoc IFeeConfig
     */
    function setTreasury(address treasury_) external onlyOwner {
        require(treasury_ != address(0), "FC: invalid treasury");

        treasury = treasury_;
    }

    /**
     * @inheritdoc IFeeConfig
     */
    function setBaseFee(uint256 baseFee_) external onlyOwner {
        require(baseFee_ < PRECISION, "FC: invalid base fee");

        baseFee = baseFee_;
    }

    /**
     * @inheritdoc IFeeConfig
     */
    function getFeeAndTreasury(address sender_) external view returns (uint256, address) {
        uint256 fee_ = fees[sender_];
        if (fee_ == 0) {
            fee_ = baseFee;
        }

        return (fee_, treasury);
    }
}
