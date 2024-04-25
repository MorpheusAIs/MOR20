// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Create2} from "@openzeppelin/contracts/utils/Create2.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import {Paginator} from "@solarity/solidity-lib/libs/arrays/Paginator.sol";

abstract contract BaseFactory {
    using EnumerableSet for EnumerableSet.AddressSet;
    using Paginator for EnumerableSet.AddressSet;

    mapping(bytes32 => bool) private _usedSalts;
    mapping(address => mapping(string => mapping(uint8 => address))) public pools;
    mapping(uint8 => address) internal _implementations;

    /**
     * @notice The function to get implementation of the specific pools
     * @param poolType_ the type of the pools
     * @return address_ the implementation these pools point to
     */
    function getImplementation(uint8 poolType_) public view returns (address) {
        require(_implementations[poolType_] != address(0), "BaseFactory: this mapping doesn't exist");

        return _implementations[poolType_];
    }

    function _addPool(address deployer_, uint8 poolType_, string memory poolName_, address pool_) internal {
        pools[deployer_][poolName_][poolType_] = pool_;
    }

    function _deploy2(uint8 poolType_, string memory poolName_) internal returns (address) {
        bytes32 salt_ = _calculatePoolSalt(tx.origin, poolName_);

        require(bytes(poolName_).length != 0, "BaseFactory: pool name cannot be empty");
        require(!_usedSalts[salt_], "BaseFactory: pool name is already taken");

        return address(new ERC1967Proxy{salt: salt_}(getImplementation(poolType_), bytes("")));
    }

    function _updateSalt(string memory poolName_) internal {
        _usedSalts[_calculatePoolSalt(tx.origin, poolName_)] = true;
    }

    function _getImplementation(uint8 poolType_) internal view returns (address) {
        return _implementations[poolType_];
    }

    function _calculatePoolSalt(address deployer_, string memory poolName_) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(deployer_, poolName_));
    }
}
