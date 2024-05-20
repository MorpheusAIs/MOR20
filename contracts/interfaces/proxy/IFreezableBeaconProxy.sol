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
    function freeze() external;

    /**
     * The function to unfreeze the implementation.
     */
    function unfreeze() external;

    /**
     * The function to check if the implementation is frozen.
     * @return The boolean value to indicating if the implementation is frozen.
     */
    function isFrozen() external view returns (bool);

    /**
     * The function to get the implementation.
     * @return The implementation address.
     */
    function implementation() external view returns (address);
}
