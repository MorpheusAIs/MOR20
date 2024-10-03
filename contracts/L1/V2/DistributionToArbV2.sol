// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {DistributionV2} from "./DistributionV2.sol";

import {IDistributionToArbV2} from "../../interfaces/L1/V2/IDistributionToArbV2.sol";
import {IL1ArbSender} from "../../interfaces/L1/IL1ArbSender.sol";

contract DistributionToArbV2 is IDistributionToArbV2, DistributionV2 {
    constructor() {
        _disableInitializers();
    }

    function DistributionToArbV2_init(
        address depositToken_,
        address l1Sender_,
        address feeConfig_,
        Pool[] calldata poolsInfo_
    ) external initializer {
        __DistributionV2_init(depositToken_, l1Sender_, feeConfig_, poolsInfo_);
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
