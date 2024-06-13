// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {L1Factory} from "../factories/L1Factory.sol";

contract L1FactoryMock is L1Factory {
    function mockInit() external {
        __L1Factory_init();
    }

    function getL2Network() public pure override returns (string memory) {
        return "TEST";
    }
}
