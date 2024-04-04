// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {MultiOwnable} from "@solarity/solidity-lib/access/MultiOwnable.sol";

contract CorePropertiesL2 is MultiOwnable {
    address public arbitrumGateway;
    address public treasuryAddress;

    address public lZEnpointAddress;
    address public lZGatewayAddress;
    uint16 public l1ChainId;

    uint256 public destinationChainId; // arbitrum

    constructor() {
        __MultiOwnable_init();
    }
}
