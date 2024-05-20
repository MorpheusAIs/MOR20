// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Create2} from "@openzeppelin/contracts/utils/Create2.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import {UpgradeableBeacon} from "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";

import {IFactory} from "../interfaces/factories/IFactory.sol";
import {IFreezableBeaconProxy, FreezableBeaconProxy} from "../proxy/FreezableBeaconProxy.sol";

abstract contract Factory is IFactory, OwnableUpgradeable, PausableUpgradeable, UUPSUpgradeable {
    mapping(uint8 poolType => UpgradeableBeacon) internal _beacons;
    mapping(bytes32 => bool) private _usedSalts;

    /**
     * @dev It is used exclusively for storing information about the detached proxies.
     */
    mapping(address deployer => mapping(string protocol => mapping(uint8 poolType => address proxy)))
        public deployedProxies;

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
    function freezePool(string calldata protocol_, uint8 poolType_) public {
        address proxy_ = deployedProxies[_msgSender()][protocol_][poolType_];

        require(proxy_ != address(0), "F: pool not found");

        IFreezableBeaconProxy(proxy_).freeze();
    }

    /**
     * @notice The function to unfreeze the specific pool.
     * @param protocol_ the name of the protocol.
     * @param poolType_ the type of the pool.
     */
    function unfreezePool(string calldata protocol_, uint8 poolType_) public {
        address proxy_ = deployedProxies[_msgSender()][protocol_][poolType_];

        require(proxy_ != address(0), "F: pool not found");

        IFreezableBeaconProxy(proxy_).unfreeze();
    }

    /**
     * The function to set the implementation for the specific pool.
     *
     * @param poolTypes_ The types of the pools.
     * @param implementations_ The new implementations pools will point to.
     */
    function setImplementations(uint8[] calldata poolTypes_, address[] calldata implementations_) public onlyOwner {
        for (uint256 i = 0; i < poolTypes_.length; i++) {
            uint8 poolType_ = poolTypes_[i];
            address implementation_ = implementations_[i];

            if (address(_beacons[poolType_]) == address(0)) {
                _beacons[poolType_] = new UpgradeableBeacon(implementation_);
            } else if (_beacons[poolType_].implementation() != implementation_) {
                _beacons[poolType_].upgradeTo(implementation_);
            }
        }
    }

    /**
     * @notice The function to get implementation of the specific pools.
     *
     * @param poolType_ the type of the pools.
     * @return implementation the implementation which the pool points to.
     */
    function getImplementation(uint8 poolType_) public view returns (address) {
        return UpgradeableBeacon(getBeacon(poolType_)).implementation();
    }

    /**
     * @notice The function to get beacon of the specific pools.
     *
     * @param poolType_ the type of the pools.
     * @return beacon the beacon which the pool points to.
     */
    function getBeacon(uint8 poolType_) public view returns (address) {
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
    function _deploy2(string calldata protocol_, uint8 poolType_) internal returns (address) {
        require(bytes(protocol_).length != 0, "F: poolName_ is empty");
        bytes32 salt_ = _calculatePoolSalt(_msgSender(), protocol_, poolType_);

        address beacon_ = getBeacon(poolType_);

        require(!_usedSalts[salt_], "F: salt used");
        _usedSalts[salt_] = true;

        address proxy_ = address(new FreezableBeaconProxy{salt: salt_}(beacon_, bytes("")));

        deployedProxies[_msgSender()][protocol_][poolType_] = proxy_;

        emit ProxyDeployed(proxy_, UpgradeableBeacon(beacon_).implementation(), protocol_, poolType_);

        return proxy_;
    }

    function _predictPoolAddress(
        address deployer_,
        string calldata protocol_,
        uint8 poolType_
    ) internal view returns (address) {
        bytes32 salt_ = _calculatePoolSalt(deployer_, protocol_, uint8(poolType_));

        bytes32 bytecodeHash_ = keccak256(
            abi.encodePacked(type(FreezableBeaconProxy).creationCode, abi.encode(getBeacon(poolType_), bytes("")))
        );

        return Create2.computeAddress(salt_, bytecodeHash_);
    }

    function _calculatePoolSalt(
        address sender_,
        string calldata protocol_,
        uint8 poolType_
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(sender_, protocol_, poolType_));
    }

    function _authorizeUpgrade(address) internal view override onlyOwner {}
}
