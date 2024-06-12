// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Distribution} from "./Distribution.sol";

import {IDistributionToBase} from "../interfaces/L1/IDistributionToBase.sol";
import {IL1BaseSender} from "../interfaces/L1/IL1BaseSender.sol";

contract DistributionToBase is IDistributionToBase, Distribution {
    function bridgeOverplus(uint24 gasLimit_, bytes memory data_) external onlyOwner {
        uint256 overplus_ = _bridgeOverplus();

        IL1BaseSender(l1Sender).sendDepositToken(gasLimit_, data_);

        emit OverplusBridgedToBase(overplus_, data_);
    }
}
