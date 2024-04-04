// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/Create2.sol";

import "../L2/ERC20MOR.sol";

library RewardTokenDeployer {
    function deployRewardToken(
        bytes32 salt,
        string memory name_,
        string memory symbol_,
        address layerZeroEndpoint_,
        address delegate_,
        address minter_
    ) external returns (address) {
        ERC20MOR rewardToken = new ERC20MOR{salt: salt}(name_, symbol_, layerZeroEndpoint_, delegate_, minter_);

        return address(rewardToken);
    }

    function predictRewardTokenAddress(
        bytes32 salt,
        string memory name_,
        string memory symbol_,
        address layerZeroEndpoint_,
        address delegate_,
        address minter_
    ) external view returns (address) {
        bytes32 bytecodeHash = keccak256(
            abi.encodePacked(
                type(ERC20MOR).creationCode,
                abi.encode(name_, symbol_, layerZeroEndpoint_, delegate_, minter_)
            )
        );

        return Create2.computeAddress(salt, bytecodeHash);
    }
}
