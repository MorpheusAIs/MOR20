// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {DistributionV2} from "./DistributionV2.sol";

import {IDistributionToBaseV2} from "../../interfaces/L1/V2/IDistributionToBaseV2.sol";
import {IL1BaseSender} from "../../interfaces/L1/IL1BaseSender.sol";

contract DistributionToBaseV2 is IDistributionToBaseV2, DistributionV2 {
    constructor() {
        _disableInitializers();
    }

    function DistributionToBaseV2_init(
        address depositToken_,
        address l1Sender_,
        address feeConfig_,
        Pool[] calldata poolsInfo_
    ) external initializer {
        __DistributionV2_init(depositToken_, l1Sender_, feeConfig_, poolsInfo_);
    }

    function bridgeOverplus(uint24 gasLimit_, bytes memory data_) external onlyOwner {
        uint256 overplus_ = _bridgeOverplus();

        IL1BaseSender(l1Sender).sendDepositToken(gasLimit_, data_);

        emit OverplusBridgedToBase(overplus_, data_);
    }
}
