// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Distribution} from "../L1/Distribution.sol";

contract DistributionMock is Distribution {
    function mockInit(
        address depositToken_,
        address l1Sender_,
        address feeConfig_,
        Pool[] calldata poolsInfo_
    ) external {
        __Distribution_init(depositToken_, l1Sender_, feeConfig_, poolsInfo_);
    }
}
