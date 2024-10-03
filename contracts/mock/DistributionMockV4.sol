// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {DistributionV4} from "../L1/V4/DistributionV4.sol";

import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {LZEndpointMock} from "@layerzerolabs/solidity-examples/contracts/lzApp/mocks/LZEndpointMock.sol";

contract DistributionMockV4 is DistributionV4 {
    function mockInitV4(
        address depositToken_,
        address l1Sender_,
        address feeConfig_,
        Pool[] calldata poolsInfo_
    ) external {
        __DistributionV4_init(depositToken_, l1Sender_, feeConfig_, poolsInfo_);
    }

    function createMockPool(Pool calldata pool_) public {
        pools.push(pool_);
    }
}
