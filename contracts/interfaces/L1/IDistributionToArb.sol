// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IDistribution} from "./IDistribution.sol";

/**
 * This contract used to bridge overplus to Base network.
 */
interface IDistributionToArb is IDistribution {
    /**
     * The function to bridge the overplus of the staked deposit tokens to the Arbitrum network.
     * @param gasLimit_ The gas limit.
     * @param maxFeePerGas_ The max fee per gas.
     * @param maxSubmissionCost_ The max submission cost.
     * @return The unique identifier for withdrawal.
     */
    function bridgeOverplus(
        uint256 gasLimit_,
        uint256 maxFeePerGas_,
        uint256 maxSubmissionCost_
    ) external payable returns (bytes memory);
}
