// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IDistribution} from "./IDistribution.sol";

/**
 * This contract used to bridge overplus to Arbitrum network.
 */
interface IDistributionToBase is IDistribution {
    /**
     * The function to bridge the overplus of the staked deposit tokens to the Base network.
     * @param gasLimit_ The gas limit.
     * @param data_ The additional data for the bridge.
     */
    function bridgeOverplus(uint24 gasLimit_, bytes memory data_) external;
}
