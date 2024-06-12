// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * The FreezableBeaconProxy is a contract is a beacon proxy with freeze/unfreeze features.
 * When the FreezableBeaconProxy is being frozen, the actual implementation is stored in the storage slot.
 */
interface IFreezableBeaconProxy {
    /**
     * The function to freeze the implementation.
     */
    function freezeProxy_() external;

    /**
     * The function to unfreeze the implementation.
     */
    function unfreezeProxy_() external;

    /**
     * The function to check if the implementation is frozen.
     * @return The boolean value to indicating if the implementation is frozen.
     */
    function isProxyFrozen_() external view returns (bool);

    /**
     * The function to get the implementation.
     * @return The implementation address.
     */
    function implementation() external view returns (address);
}
