// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import {BaseFactory} from "../BaseFactory.sol";

import {IL2TokenReceiver} from "../interfaces/IL2TokenReceiver.sol";

abstract contract BaseFactoryL2 is BaseFactory {
    using EnumerableSet for EnumerableSet.AddressSet;

    enum PoolType {
        L2_MESSAGE_RECEIVER,
        L2_TOKEN_RECEIVER,
        REWARD_TOKEN
    }

    struct Mor20PredictedAddressesL2 {
        address l2MessageReceiver;
        address l2TokenReceiver;
        address rewardToken;
    }

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

    function _predictPoolAddress(PoolType poolType_, bytes32 poolSalt_) internal view returns (address) {
        return _predictPoolAddress(uint8(poolType_), poolSalt_);
    }

    function _addPool(PoolType poolType_, address pool_) internal {
        _pools[uint8(poolType_)].add(pool_);
    }

    function _setNewImplementation(uint8 poolType_, address newImplementation_) internal {
        _setNewImplementation(poolType_, newImplementation_);
    }

    function _deploy2(PoolType poolType_, string memory name_) internal returns (address) {
        return _deploy2(uint8(poolType_), name_);
    }
}
