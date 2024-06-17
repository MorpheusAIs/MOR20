// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract PoolMockV1 is OwnableUpgradeable {
    function PoolMockV1_init() external initializer {
        __Ownable_init();
    }

    function version() external pure returns (uint256) {
        return 1;
    }
}
