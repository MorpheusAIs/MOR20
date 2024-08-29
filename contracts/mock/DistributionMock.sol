// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Distribution} from "../L1/Distribution.sol";

import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {LZEndpointMock} from "@layerzerolabs/solidity-examples/contracts/lzApp/mocks/LZEndpointMock.sol";

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
