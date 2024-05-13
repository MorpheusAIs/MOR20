// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";

import {IFactory} from "./interfaces/IFactory.sol";

abstract contract Factory is IFactory, OwnableUpgradeable, PausableUpgradeable, UUPSUpgradeable {
    mapping(uint8 => address) internal _implementations;
    mapping(bytes32 => bool) private _usedSalts;

    /**
     * @dev It is used exclusively for storing information about the detached proxies.
     *
     * `_msgSender()` -> `poolName` -> `poolType` -> `proxy`
     */
    mapping(address => mapping(string => mapping(uint8 => address))) public deployedProxies;

    function __Factory_init() internal onlyInitializing {}

    /**
     * @notice Returns contract to normal state.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Triggers stopped state.
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice The function to set implementation for the specific pool.
     *
     * @param poolType_ the type of the pool.
     * @param implementation_ the implementation the pool will point to.
     */
    function setImplementation(uint8 poolType_, address implementation_) public onlyOwner {
        _implementations[poolType_] = implementation_;
    }

    /**
     * @notice The function to get implementation of the specific pools.
     *
     * @param poolType_ the type of the pools.
     * @return implementation the implementation which the pool points to.
     */
    function getImplementation(uint8 poolType_) public view returns (address) {
        return _implementations[poolType_];
    }

    /**
     * @notice The function to deploy new `ERC1967Proxy`.
     *
     * @param poolType_ the type of the pool.
     * @param poolName_ the name of the pool.
     * @return proxy the proxy address for the `poolType_`.
     */
    function _deploy2(uint8 poolType_, string memory poolName_) internal returns (address) {
        require(bytes(poolName_).length != 0, "F: poolName_ is empty");
        bytes32 salt_ = keccak256(abi.encodePacked(_msgSender(), poolName_, poolType_));

        address implementation_ = _implementations[poolType_];
        require(implementation_ != address(0), "F: implementation not found");

        require(!_usedSalts[salt_], "F: salt used");
        _usedSalts[salt_] = true;

        address proxy_ = address(new ERC1967Proxy{salt: salt_}(getImplementation(poolType_), bytes("")));

        deployedProxies[_msgSender()][poolName_][poolType_] = proxy_;

        emit ProxyDeployed(proxy_, implementation_, poolType_, poolName_);

        return proxy_;
    }

    function _authorizeUpgrade(address) internal view override onlyOwner {}
}
