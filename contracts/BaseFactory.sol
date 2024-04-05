// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Create2} from "@openzeppelin/contracts/utils/Create2.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import {ProxyBeacon} from "@solarity/solidity-lib/proxy/beacon/ProxyBeacon.sol";
import {PublicBeaconProxy} from "@solarity/solidity-lib/proxy/beacon/PublicBeaconProxy.sol";
import {Paginator} from "@solarity/solidity-lib/libs/arrays/Paginator.sol";

abstract contract BaseFactory {
    using EnumerableSet for EnumerableSet.AddressSet;
    using Paginator for EnumerableSet.AddressSet;

    mapping(bytes32 => bool) private _usedSalts;

    mapping(uint8 => ProxyBeacon) internal _beacons;
    mapping(uint8 => EnumerableSet.AddressSet) internal _pools;

    /**
     * @notice The function to get implementation of the specific pools
     * @param poolType_ the type of the pools
     * @return address_ the implementation these pools point to
     */
    function getImplementation(uint8 poolType_) public view returns (address) {
        require(address(_beacons[poolType_]) != address(0), "BaseFactory: this mapping doesn't exist");

        return _beacons[poolType_].implementation();
    }

    /**
     * @notice The function to get the BeaconProxy of the specific pools (mostly needed in the factories)
     * @param poolType_ type name of the pools
     * @return address the BeaconProxy address
     */
    function getBeaconProxy(uint8 poolType_) public view returns (address) {
        address beacon_ = address(_beacons[poolType_]);

        require(beacon_ != address(0), "BaseFactory: bad PublicBeaconProxy");

        return beacon_;
    }

    /**
     * @notice The function to count pools
     * @param poolType_ the type of the pools
     * @return the number of pools
     */
    function countPools(uint8 poolType_) public view returns (uint256) {
        return _pools[poolType_].length();
    }

    /**
     * @notice The paginated function to list pools (call `countPools()` to account for pagination)
     * @param poolType_ the type of the pools
     * @param offset_ the starting index in the address array
     * @param limit_ the number of address
     * @return pools_ the array of address proxies
     */
    function listPools(uint8 poolType_, uint256 offset_, uint256 limit_) public view returns (address[] memory pools_) {
        return _pools[poolType_].part(offset_, limit_);
    }

    function _addPool(uint8 poolType_, address pool_) internal {
        _pools[poolType_].add(pool_);
    }

    function _deploy2(uint8 poolType_, string memory poolName_) internal returns (address) {
        bytes32 salt_ = _calculatePoolSalt(tx.origin, poolName_);

        require(bytes(poolName_).length != 0, "BaseFactory: pool name cannot be empty");
        require(!_usedSalts[salt_], "BaseFactory: pool name is already taken");

        return address(new PublicBeaconProxy{salt: salt_}(getBeaconProxy(poolType_), bytes("")));
    }

    function _updateSalt(string memory poolName_) internal {
        _usedSalts[_calculatePoolSalt(tx.origin, poolName_)] = true;
    }

    /**
     * @notice The function that sets pools' implementations. Deploys ProxyBeacons on the first set.
     * This function is also used to upgrade pools
     * @param poolTypes_ the types that are associated with the pools implementations
     * @param newImplementations_ the new implementations of the pools (ProxyBeacons will point to these)
     */

    function _setNewImplementations(uint8[] memory poolTypes_, address[] memory newImplementations_) internal {
        for (uint256 i = 0; i < poolTypes_.length; i++) {
            if (address(_beacons[poolTypes_[i]]) == address(0)) {
                _beacons[poolTypes_[i]] = new ProxyBeacon();
            }

            if (_beacons[poolTypes_[i]].implementation() != newImplementations_[i]) {
                _beacons[poolTypes_[i]].upgradeTo(newImplementations_[i]);
            }
        }
    }

    function _predictPoolAddress(uint8 poolType_, bytes32 salt_) internal view returns (address) {
        bytes32 bytecodeHash_ = keccak256(
            abi.encodePacked(type(PublicBeaconProxy).creationCode, abi.encode(getBeaconProxy(poolType_), bytes("")))
        );

        return Create2.computeAddress(salt_, bytecodeHash_);
    }

    function _calculatePoolSalt(address deployer_, string memory poolName_) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(deployer_, poolName_));
    }
}
