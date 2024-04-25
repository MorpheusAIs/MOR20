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
        //////
        address wrappedToken;
        address tokenReceiver;
    }

    event Mor20Deployed(string name, address distribution, address l1Sender);

    function _addPool(PoolType poolType_, string memory poolName_, address pool_) internal {
        _addPool(tx.origin, uint8(poolType_), poolName_, pool_);
    }

    function _deploy2(PoolType poolType_, string memory name_) internal returns (address) {
        return _deploy2(uint8(poolType_), name_);
    }
}
