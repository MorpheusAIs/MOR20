// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Create2} from "@openzeppelin/contracts/utils/Create2.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import {UpgradeableBeacon} from "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";

import {DynamicSet} from "@solarity/solidity-lib/libs/data-structures/DynamicSet.sol";
import {Paginator} from "@solarity/solidity-lib/libs/arrays/Paginator.sol";

import {IFactory} from "../interfaces/factories/IFactory.sol";
import {IFreezableBeaconProxy, FreezableBeaconProxy} from "../proxy/FreezableBeaconProxy.sol";

abstract contract Factory is IFactory, OwnableUpgradeable, PausableUpgradeable, UUPSUpgradeable {
    using DynamicSet for DynamicSet.BytesSet;
    using Paginator for DynamicSet.BytesSet;

    mapping(string poolType => UpgradeableBeacon) internal _beacons;
    mapping(bytes32 => bool) private _usedSalts;

    /**
     * @dev It is used exclusively for storing information about the detached proxies.
     */
    mapping(address deployer => mapping(string protocol => mapping(string poolType => address))) private _proxyPools;
    mapping(address deployer => DynamicSet.BytesSet) private _protocols;

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
     * @notice The function to freeze the specific pool.
     * @param protocol_ the name of the protocol.
     * @param poolType_ the type of the pool.
     */
    function freezePool(string memory protocol_, string memory poolType_) public {
        address proxy_ = _proxyPools[_msgSender()][protocol_][poolType_];

        require(proxy_ != address(0), "F: pool not found");

        IFreezableBeaconProxy(proxy_).freeze();
    }

    /**
     * @notice The function to unfreeze the specific pool.
     * @param protocol_ the name of the protocol.
     * @param poolType_ the type of the pool.
     */
    function unfreezePool(string memory protocol_, string memory poolType_) public {
        address proxy_ = _proxyPools[_msgSender()][protocol_][poolType_];

        require(proxy_ != address(0), "F: pool not found");

        IFreezableBeaconProxy(proxy_).unfreeze();
    }

    /**
     * The function to set the implementation for the specific pool.
     *
     * @param poolTypes_ The types of the pools.
     * @param implementations_ The new implementations pools will point to.
     */
    function setImplementations(string[] memory poolTypes_, address[] memory implementations_) public onlyOwner {
        for (uint256 i = 0; i < poolTypes_.length; i++) {
            string memory poolType_ = poolTypes_[i];
            address implementation_ = implementations_[i];

            if (address(_beacons[poolType_]) == address(0)) {
                _beacons[poolType_] = new UpgradeableBeacon(implementation_);
            } else if (_beacons[poolType_].implementation() != implementation_) {
                _beacons[poolType_].upgradeTo(implementation_);
            }
        }
    }

    /**
     * @notice The function to get the number of protocols.
     *
     * @param deployer_ the address of the deployer.
     * @return protocolsCount the number of protocols.
     */
    function countProtocols(address deployer_) public view returns (uint256) {
        return _protocols[deployer_].length();
    }

    /**
     * @notice The function to get the list of protocols.
     *
     * @param deployer_ the address of the deployer.
     * @param offset_ the offset of the list.
     * @param limit_ the limit of the list.
     * @return protocols_ the list of the protocols.
     */
    function listProtocols(
        address deployer_,
        uint256 offset_,
        uint256 limit_
    ) public view returns (string[] memory protocols_) {
        bytes[] memory bytesProtocols_ = _protocols[deployer_].part(offset_, limit_);

        assembly {
            protocols_ := bytesProtocols_
        }
    }

    /**
     * @notice The function to get the deployed proxy pool.
     *
     * @param deployer_ the deployer address.
     * @param protocol_ the name of the protocol.
     * @param poolType_ the type of the pool.
     * @return pool the deployed proxy pool.
     */
    function getProxyPool(
        address deployer_,
        string memory protocol_,
        string memory poolType_
    ) public view returns (address) {
        return _proxyPools[deployer_][protocol_][poolType_];
    }

    /**
     * @notice The function to get implementation of the specific pools.
     *
     * @param poolType_ the type of the pools.
     * @return implementation the implementation which the pool points to.
     */
    function getImplementation(string memory poolType_) public view returns (address) {
        return UpgradeableBeacon(getBeacon(poolType_)).implementation();
    }

    /**
     * @notice The function to get beacon of the specific pools.
     *
     * @param poolType_ the type of the pools.
     * @return beacon the beacon which the pool points to.
     */
    function getBeacon(string memory poolType_) public view returns (address) {
        address beacon_ = address(_beacons[poolType_]);

        require(beacon_ != address(0), "F: beacon not found");

        return beacon_;
    }

    /**
     * @notice The function to deploy new `ERC1967Proxy`.
     *
     * @param protocol_ the name of the protocol.
     * @param poolType_ the type of the pool.
     * @return proxy the proxy address for the `poolType_`.
     */
    function _deploy2(string memory protocol_, string memory poolType_) internal returns (address) {
        require(bytes(protocol_).length != 0, "F: protocol is empty");

        bytes32 salt_ = _calculatePoolSalt(_msgSender(), protocol_, poolType_);

        address beacon_ = getBeacon(poolType_);

        require(!_usedSalts[salt_], "F: salt used");
        _usedSalts[salt_] = true;

        address proxy_ = address(new FreezableBeaconProxy{salt: salt_}(beacon_, bytes("")));
        _proxyPools[_msgSender()][protocol_][poolType_] = proxy_;

        emit ProxyDeployed(proxy_, UpgradeableBeacon(beacon_).implementation(), protocol_, poolType_);

        return proxy_;
    }

    /**
     * @notice The function to register the protocol.
     *
     * @param protocol_ the name of the protocol.
     */
    function _registerProtocol(string memory protocol_) internal {
        _protocols[_msgSender()].add(bytes(protocol_));
    }

    function _predictPoolAddress(
        address deployer_,
        string memory protocol_,
        string memory poolType_
    ) internal view returns (address) {
        if (bytes(protocol_).length == 0) {
            return address(0);
        }

        bytes32 salt_ = _calculatePoolSalt(deployer_, protocol_, poolType_);

        bytes32 bytecodeHash_ = keccak256(
            abi.encodePacked(type(FreezableBeaconProxy).creationCode, abi.encode(getBeacon(poolType_), bytes("")))
        );

        return Create2.computeAddress(salt_, bytecodeHash_);
    }

    function _calculatePoolSalt(
        address sender_,
        string memory protocol_,
        string memory poolType_
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(sender_, protocol_, poolType_));
    }

    function _authorizeUpgrade(address) internal view override onlyOwner {}
}
