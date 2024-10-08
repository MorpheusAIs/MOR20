// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * This is FeeConfig contract that stores all the fees and treasury data.
 */
interface IFeeConfig {
    /**
     * The function that initializes the contract.
     * @param treasury_ The treasury address.
     * @param baseFee_ The base fee.
     */
    function FeeConfig_init(address treasury_, uint256 baseFee_) external;

    /**
     * The function that returns the treasury address.
     */
    function treasury() external view returns (address);

    /**
     * The function that returns the base fee.
     */
    function baseFee() external view returns (uint256);

    /**
     * The function that returns the fee for the sender.
     * @dev If the fee is 0, the base fee is used.
     */
    function fees(address sender_) external view returns (uint256);

    /**
     * The function that returns the fee and treasury address for the sender.
     */
    function getFeeAndTreasury(address sender_) external view returns (uint256, address);

    /**
     * The function that sets the fee for the sender.
     */
    function setFee(address sender_, uint256 fee_) external;

    /**
     * The function that sets the treasury address.
     */
    function setTreasury(address treasury_) external;

    /**
     * The function that sets the base fee.
     */
    function setBaseFee(uint256 baseFee_) external;
}
