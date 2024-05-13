// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {MOR20} from "../L2/MOR20.sol";

library MOR20Deployer {
    event Mor20Deployed(address token);

    function deployMOR20(
        string calldata mor20Name_,
        string calldata mor20Symbol,
        address oftEndpoint_,
        address delegate_,
        address l2MessageReceiver_
    ) external returns (address mor20) {
        mor20 = address(new MOR20(mor20Name_, mor20Symbol, oftEndpoint_, delegate_, l2MessageReceiver_));

        emit Mor20Deployed(mor20);
    }
}
