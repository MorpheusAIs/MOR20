// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Distribution} from "./Distribution.sol";

import {IDistributionToArb} from "../interfaces/L1/IDistributionToArb.sol";
import {IL1ArbSender} from "../interfaces/L1/IL1ArbSender.sol";

contract DistributionToArb is IDistributionToArb, Distribution {
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