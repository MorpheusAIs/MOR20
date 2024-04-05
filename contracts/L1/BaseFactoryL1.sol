// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import {BaseFactory} from "../BaseFactory.sol";

import {IDistribution} from "../interfaces/IDistribution.sol";

abstract contract BaseFactoryL1 is BaseFactory {
    using EnumerableSet for EnumerableSet.AddressSet;

    enum PoolType {
        DISTRIBUTION,
        L1_SENDER
    }

    struct Mor20PredictedAddressesL1 {
        address distribution;
        address l1Sender;
    }

    struct Mor20DeployParams {
        string name;
        address depositToken;
        IDistribution.Pool[] poolsInfo;
        //////
        address messageReceiver;
        address zroPaymentAddress;
        uint16 l2EndpointId;
        bytes adapterParams;
        //////
        address wrappedToken;
        address tokenReceiver;
    }

    event Mor20Deployed(string name, address distribution, address l1Sender);

    function _predictPoolAddress(PoolType poolType_, bytes32 poolSalt_) internal view returns (address) {
        return _predictPoolAddress(uint8(poolType_), poolSalt_);
    }

    function _addDistribution(address distribution_) internal {
        _pools[uint8(PoolType.DISTRIBUTION)].add(distribution_);
    }

    function _deploy2(PoolType poolType_, string memory name_) internal returns (address) {
        return _deploy2(uint8(poolType_), name_);
    }
}
