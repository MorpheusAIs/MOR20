// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {DistributionV5} from "./DistributionV5.sol";

import {IDistributionToArbV5} from "../../interfaces/L1/V5/IDistributionToArbV5.sol";
import {IL1ArbSender} from "../../interfaces/L1/IL1ArbSender.sol";

contract DistributionToArbV5 is IDistributionToArbV5, DistributionV5 {
    constructor() {
        _disableInitializers();
    }

    function DistributionToArbV5_init(
        address depositToken_,
        address l1Sender_,
        address feeConfig_,
        Pool[] calldata poolsInfo_
    ) external initializer {
        __DistributionV5_init(depositToken_, l1Sender_, feeConfig_, poolsInfo_);
    }

    function bridgeOverplus(
        uint256 gasLimit_,
        uint256 maxFeePerGas_,
        uint256 maxSubmissionCost_
    ) external payable onlyOwner returns (bytes memory) {
        uint256 overplus_ = _bridgeOverplus();

        bytes memory bridgeMessageId_ = IL1ArbSender(l1Sender).sendDepositToken{value: msg.value}(
            gasLimit_,
            maxFeePerGas_,
            maxSubmissionCost_
        );

        emit OverplusBridgedToArb(overplus_, bridgeMessageId_);

        return bridgeMessageId_;
    }
}
