// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IOwnable {
    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner_) external;
}
