// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Factory} from "../factories/Factory.sol";

contract FactoryMock is Factory {
    function Factory_init() external initializer {
        __Pausable_init();
        __Ownable_init();
        __UUPSUpgradeable_init();
        __Factory_init();
    }

    function mockInit() external {
        __Factory_init();
    }

    function deploy2(string calldata protocol_, string calldata poolType_) external returns (address) {
        return _deploy2(protocol_, poolType_);
    }
}
