// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {DistributionV4} from "./DistributionV4.sol";

import {IDistributionToBaseV4} from "../../interfaces/L1/V4/IDistributionToBaseV4.sol";
import {IL1BaseSender} from "../../interfaces/L1/IL1BaseSender.sol";

contract DistributionToBaseV4 is IDistributionToBaseV4, DistributionV4 {
    constructor() {
        _disableInitializers();
    }

    function DistributionToBaseV4_init(
        address depositToken_,
        address l1Sender_,
        address feeConfig_,
        Pool[] calldata poolsInfo_
    ) external initializer {
        __DistributionV4_init(depositToken_, l1Sender_, feeConfig_, poolsInfo_);
    }

    function bridgeOverplus(uint24 gasLimit_, bytes memory data_) external onlyOwner {
        uint256 overplus_ = _bridgeOverplus();

        IL1BaseSender(l1Sender).sendDepositToken(gasLimit_, data_);

        emit OverplusBridgedToBase(overplus_, data_);
    }
}