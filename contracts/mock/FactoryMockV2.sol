// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {FactoryMock} from "./FactoryMock.sol";

contract FactoryMockV2 is FactoryMock {
    function FactoryMockV2_init() external initializer {
        __Pausable_init();
        __Ownable_init();
        __UUPSUpgradeable_init();
        __Factory_init();
    }

    function version() external pure returns (uint256) {
        return 2;
    }
}
