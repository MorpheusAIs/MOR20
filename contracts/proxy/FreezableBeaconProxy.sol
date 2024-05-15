// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IBeacon, BeaconProxy} from "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import {StorageSlot} from "@openzeppelin/contracts/utils/StorageSlot.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";

import {IFreezableBeaconProxy} from "../interfaces/proxy/IFreezableBeaconProxy.sol";

/**
 * The FreezableBeaconProxy is a beacon proxy contract with freeze/unfreeze features.
 * When the FreezableBeaconProxy is being frozen, the actual implementation is stored in the storage slot.
 */
contract FreezableBeaconProxy is IFreezableBeaconProxy, BeaconProxy, Context {
    modifier onlyFactory() {
        _onlyFactory();
        _;
    }

    bytes32 private constant _FREEZABLE_BEACON_PROXY_SLOT = keccak256("freezable.beacon.proxy.slot");

    address private immutable _FACTORY;

    constructor(address beacon_, bytes memory data_) payable BeaconProxy(beacon_, data_) {
        _FACTORY = _msgSender();
    }

    /**
     * The function to freeze the implementation.
     */
    function freeze() external onlyFactory {
        require(!isFrozen(), "FBP: already frozen");

        StorageSlot.getAddressSlot(_FREEZABLE_BEACON_PROXY_SLOT).value = _implementation();
    }

    /**
     * The function to unfreeze the implementation.
     */
    function unfreeze() external onlyFactory {
        require(isFrozen(), "FBP: not frozen");

        delete StorageSlot.getAddressSlot(_FREEZABLE_BEACON_PROXY_SLOT).value;
    }

    /**
     * The function to check if the implementation is frozen.
     * @return The boolean value to indicating if the implementation is frozen.
     */
    function isFrozen() public view returns (bool) {
        return StorageSlot.getAddressSlot(_FREEZABLE_BEACON_PROXY_SLOT).value != address(0);
    }

    /**
     * The function to get the implementation.
     * @return The implementation address.
     */
    function implementation() external view returns (address) {
        return _implementation();
    }

    function _implementation() internal view override returns (address) {
        if (isFrozen()) {
            return StorageSlot.getAddressSlot(_FREEZABLE_BEACON_PROXY_SLOT).value;
        }

        return IBeacon(_getBeacon()).implementation();
    }

    function _onlyFactory() internal view {
        require(_msgSender() == _FACTORY, "FBP: not factory");
    }
}
