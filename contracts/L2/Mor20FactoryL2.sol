// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {BaseFactoryL2, RewardTokenDeployer, Create2} from "./BaseFactoryL2.sol";

import {IL2MessageReceiver} from "../interfaces/IL2MessageReceiver.sol";
import {IL2TokenReceiver} from "../interfaces/IL2TokenReceiver.sol";

import {CorePropertiesL2} from "./CorePropertiesL2.sol";

contract Mor20FactoryL2 is BaseFactoryL2, Ownable {
    CorePropertiesL2 public coreProperties;

    struct Mor20DeployParams {
        string name;
        string symbol;
        address rewardToken;
        address rewardTokenDelegate;
        //////
        address sender;
        uint16 senderChainId;
        //////
        address router_;
        address nonfungiblePositionManager_;
        IL2TokenReceiver.SwapParams firstSwapParams_;
        IL2TokenReceiver.SwapParams secondSwapParams;
    }

    event Mor20Deployed(string name, address l2MessageReceiver, address l2TokenReceiver, address rewardToken);

    function deployMor20OnL1(Mor20DeployParams calldata parameters) external onlyOwner {
        address l2MessageReceiverAddress = _deploy2(PoolType.L2_MESSAGE_RECEIVER, parameters.name);

        address l2TokenReceiverAddress = _deploy2(PoolType.L2_TOKEN_RECEIVER, parameters.name);

        address rewardTokenAddress;
        if (parameters.rewardToken == address(0)) {
            rewardTokenAddress = _deployRewardToken(
                parameters.name,
                parameters.symbol,
                coreProperties.lZEnpointAddress(),
                parameters.rewardTokenDelegate,
                l2MessageReceiverAddress
            );
        } else {
            rewardTokenAddress = parameters.rewardToken;
        }

        IL2MessageReceiver(l2MessageReceiverAddress).L2MessageReceiver__init(
            rewardTokenAddress,
            IL2MessageReceiver.Config(coreProperties.lZGatewayAddress(), parameters.sender, coreProperties.l1ChainId())
        );

        IL2TokenReceiver(l2TokenReceiverAddress).L2TokenReceiver__init(
            parameters.router_,
            parameters.nonfungiblePositionManager_,
            parameters.firstSwapParams_,
            parameters.secondSwapParams
        );

        _addPool(PoolType.L2_MESSAGE_RECEIVER, l2MessageReceiverAddress);
        _addPool(PoolType.L2_TOKEN_RECEIVER, l2TokenReceiverAddress);
        _addPool(PoolType.REWARD_TOKEN, rewardTokenAddress);

        emit Mor20Deployed(parameters.name, l2MessageReceiverAddress, l2TokenReceiverAddress, rewardTokenAddress);
    }

    function setNewImplementations(
        PoolType[] memory poolTypes_,
        address[] calldata newImplementations_
    ) external onlyOwner {
        _setNewImplementations(poolTypes_, newImplementations_);
    }

    function _deployRewardToken(
        string memory name_,
        string memory symbol_,
        address layerZeroEndpoint_,
        address delegate_,
        address minter_
    ) internal returns (address) {
        bytes32 salt_ = _calculatePoolSalt(tx.origin, name_);

        return RewardTokenDeployer.deployRewardToken(salt_, name_, symbol_, layerZeroEndpoint_, delegate_, minter_);
    }
}
