// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {DistributionV2} from "../L1/V2/DistributionV2.sol";

import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {LZEndpointMock} from "@layerzerolabs/solidity-examples/contracts/lzApp/mocks/LZEndpointMock.sol";

contract DistributionMockV2 is DistributionV2 {
    function mockInitV2(
        address depositToken_,
        address l1Sender_,
        address feeConfig_,
        Pool[] calldata poolsInfo_
    ) external {
        __DistributionV2_init(depositToken_, l1Sender_, feeConfig_, poolsInfo_);
    }

    function createMockPool(Pool calldata pool_) public {
        pools.push(pool_);
    }
}
