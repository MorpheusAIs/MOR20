// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {DistributionV5} from "./DistributionV5.sol";

import {IDistributionToBaseV5} from "../../interfaces/L1/V5/IDistributionToBaseV5.sol";
import {IL1BaseSender} from "../../interfaces/L1/IL1BaseSender.sol";

contract DistributionToBaseV5 is IDistributionToBaseV5, DistributionV5 {
    constructor() {
        _disableInitializers();
    }

    function DistributionToBaseV5_init(
        address depositToken_,
        address l1Sender_,
        address feeConfig_,
        Pool[] calldata poolsInfo_
    ) external initializer {
        __DistributionV5_init(depositToken_, l1Sender_, feeConfig_, poolsInfo_);
    }

    function bridgeOverplus(uint24 gasLimit_, bytes memory data_) external onlyOwner {
        uint256 overplus_ = _bridgeOverplus();

        IL1BaseSender(l1Sender).sendDepositToken(gasLimit_, data_);

        emit OverplusBridgedToBase(overplus_, data_);
    }
}
