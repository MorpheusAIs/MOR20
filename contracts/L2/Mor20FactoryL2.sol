// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {BaseFactoryL2} from "./BaseFactoryL2.sol";
import {CorePropertiesL2} from "./CorePropertiesL2.sol";

import {IL2TokenReceiver} from "../interfaces/IL2TokenReceiver.sol";
import {IL2MessageReceiver} from "../interfaces/IL2MessageReceiver.sol";

import {RewardTokenDeployer} from "../libs/RewardTokenDeployer.sol";

contract Mor20FactoryL2 is BaseFactoryL2, Ownable {
    CorePropertiesL2 public coreProperties;

    constructor(address coreProperties_) {
        coreProperties = CorePropertiesL2(coreProperties_);
    }

    function deployMor20OnL1(Mor20DeployParams calldata parameters_) external onlyOwner {
        (address lZEnpointAddress_, address lZGatewayAddress_, uint16 l1ChainId_) = coreProperties.getDeployParams();

        address l2MessageReceiverAddress_ = _deploy2(PoolType.L2_MESSAGE_RECEIVER, parameters_.name);

        address l2TokenReceiverAddress_ = _deploy2(PoolType.L2_TOKEN_RECEIVER, parameters_.name);

        address rewardTokenAddress_;
        if (parameters_.rewardToken == address(0)) {
            rewardTokenAddress_ = _deployRewardToken(
                parameters_.name,
                parameters_.symbol,
                lZEnpointAddress_,
                parameters_.rewardTokenDelegate,
                l2MessageReceiverAddress_
            );
        } else {
            rewardTokenAddress_ = parameters_.rewardToken;
        }

        IL2MessageReceiver(l2MessageReceiverAddress_).L2MessageReceiver__init(
            rewardTokenAddress_,
            IL2MessageReceiver.Config(lZGatewayAddress_, parameters_.sender, l1ChainId_)
        );

        IL2TokenReceiver(l2TokenReceiverAddress_).L2TokenReceiver__init(
            parameters_.router_,
            parameters_.nonfungiblePositionManager_,
            parameters_.firstSwapParams_,
            parameters_.secondSwapParams
        );

        _addPool(PoolType.L2_MESSAGE_RECEIVER, l2MessageReceiverAddress_);
        _addPool(PoolType.L2_TOKEN_RECEIVER, l2TokenReceiverAddress_);
        _addPool(PoolType.REWARD_TOKEN, rewardTokenAddress_);

        emit Mor20Deployed(parameters_.name, l2MessageReceiverAddress_, l2TokenReceiverAddress_, rewardTokenAddress_);
    }

    function setNewImplementations(
        uint8[] memory poolTypes_,
        address[] calldata newImplementations_
    ) external onlyOwner {
        _setNewImplementations(poolTypes_, newImplementations_);
    }

    function predictMor20Address(
        address deployer_,
        string calldata mor20Name_
    ) external view returns (Mor20PredictedAddressesL2 memory predictedAddresses) {
        if (bytes(mor20Name_).length == 0) {
            return predictedAddresses;
        }

        bytes32 poolSalt_ = _calculatePoolSalt(deployer_, mor20Name_);

        return
            Mor20PredictedAddressesL2(
                _predictPoolAddress(PoolType.L2_MESSAGE_RECEIVER, poolSalt_),
                _predictPoolAddress(PoolType.L2_TOKEN_RECEIVER, poolSalt_),
                _predictPoolAddress(PoolType.REWARD_TOKEN, poolSalt_)
            );
    }

    function _deployRewardToken(
        string memory name_,
        string memory symbol_,
        address layerZeroEndpoint_,
        address delegate_,
        address minter_
    ) internal returns (address) {
        bytes32 poolSalt_ = _calculatePoolSalt(tx.origin, name_);

        return RewardTokenDeployer.deployRewardToken(poolSalt_, name_, symbol_, layerZeroEndpoint_, delegate_, minter_);
    }
}
