// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract L1ERC20TokenBridgeMock {
    function depositERC20To(
        address _l1Token,
        address _l2Token,
        address _to,
        uint256 _amount,
        uint32 _l2Gas,
        bytes calldata data_
    ) external returns (bytes memory) {
        IERC20(_l1Token).transferFrom(msg.sender, _to, _amount);

        return abi.encode(_l2Token, _l2Gas, data_);
    }
}
