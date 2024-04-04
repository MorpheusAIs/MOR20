// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Create2} from "@openzeppelin/contracts/utils/Create2.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import {Paginator} from "@solarity/solidity-lib/libs/arrays/Paginator.sol";
import {ProxyBeacon} from "@solarity/solidity-lib/proxy/beacon/ProxyBeacon.sol";
import {PublicBeaconProxy} from "@solarity/solidity-lib/proxy/beacon/PublicBeaconProxy.sol";

import {ERC20MOR} from "./ERC20MOR.sol";

import {RewardTokenDeployer} from "../libs/RewardTokenDeployer.sol";

abstract contract BaseFactoryL2 {
    using EnumerableSet for EnumerableSet.AddressSet;
    using Paginator for EnumerableSet.AddressSet;

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
    mapping(bytes32 => bool) private _usedSalts;

    mapping(PoolType => ProxyBeacon) private _beacons;
    mapping(PoolType => EnumerableSet.AddressSet) private _pools;

    function predictMor20Address(
        address deployer,
        string calldata mor20Name
    ) external view returns (Mor20PredictedAddressesL2 memory predictedAddresses) {
        if (bytes(mor20Name).length == 0) {
            return predictedAddresses;
        }

        bytes32 poolSalt = _calculatePoolSalt(deployer, mor20Name);

        return
            Mor20PredictedAddressesL2(
                _predictPoolAddress(PoolType.L2_MESSAGE_RECEIVER, poolSalt),
                _predictPoolAddress(PoolType.L2_TOKEN_RECEIVER, poolSalt),
                _predictPoolAddress(PoolType.REWARD_TOKEN, poolSalt)
            );
    }

    /**
     * @notice The function to get implementation of the specific pools
     * @param poolType_ the type of the pools
     * @return address_ the implementation these pools point to
     */
    function getImplementation(PoolType poolType_) public view returns (address) {
        require(address(_beacons[poolType_]) != address(0), "BaseFactory: this mapping doesn't exist");

        return _beacons[poolType_].implementation();
    }

    /**
     * @notice The function to get the BeaconProxy of the specific pools (mostly needed in the factories)
     * @param poolType_ type name of the pools
     * @return address the BeaconProxy address
     */
    function getBeaconProxy(PoolType poolType_) public view returns (address) {
        address beacon_ = address(_beacons[poolType_]);

        require(beacon_ != address(0), "BaseFactory: bad PublicBeaconProxy");

        return beacon_;
    }

    /**
     * @notice The function to count pools
     * @param poolType_ the type of the pools
     * @return the number of pools
     */
    function countPools(PoolType poolType_) public view returns (uint256) {
        return _pools[poolType_].length();
    }

    /**
     * @notice The paginated function to list pools (call `countPools()` to account for pagination)
     * @param poolType_ the type of the pools
     * @param offset_ the starting index in the address array
     * @param limit_ the number of address
     * @return pools_ the array of address proxies
     */
    function listPools(
        PoolType poolType_,
        uint256 offset_,
        uint256 limit_
    ) public view returns (address[] memory pools_) {
        return _pools[poolType_].part(offset_, limit_);
    }

    function _addPool(PoolType poolType_, address pool_) internal {
        _pools[poolType_].add(pool_);
    }

    function _deploy2(PoolType poolType_, string memory poolName_) internal returns (address) {
        bytes32 salt_ = _calculatePoolSalt(tx.origin, poolName_);

        require(bytes(poolName_).length != 0, "BaseFactory: pool name cannot be empty");
        require(!_usedSalts[salt_], "BaseFactory: pool name is already taken");

        return address(new PublicBeaconProxy{salt: salt_}(getBeaconProxy(poolType_), bytes("")));
    }

    function _updateSalt(string memory poolName) internal {
        _usedSalts[_calculatePoolSalt(tx.origin, poolName)] = true;
    }

    /**
     * @notice The function that sets pools' implementations. Deploys ProxyBeacons on the first set.
     * This function is also used to upgrade pools
     * @param poolTypes_ the types that are associated with the pools implementations
     * @param newImplementations_ the new implementations of the pools (ProxyBeacons will point to these)
     */

    function _setNewImplementations(PoolType[] memory poolTypes_, address[] memory newImplementations_) internal {
        for (uint256 i = 0; i < poolTypes_.length; i++) {
            if (address(_beacons[poolTypes_[i]]) == address(0)) {
                _beacons[poolTypes_[i]] = new ProxyBeacon();
            }

            if (_beacons[poolTypes_[i]].implementation() != newImplementations_[i]) {
                _beacons[poolTypes_[i]].upgradeTo(newImplementations_[i]);
            }
        }
    }

    function _predictPoolAddress(PoolType poolType_, bytes32 salt) internal view returns (address) {
        bytes32 bytecodeHash = keccak256(
            abi.encodePacked(type(PublicBeaconProxy).creationCode, abi.encode(getBeaconProxy(poolType_), bytes("")))
        );

        return Create2.computeAddress(salt, bytecodeHash);
    }

    function _calculatePoolSalt(address deployer, string memory poolName) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(deployer, poolName));
    }
}
