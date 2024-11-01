// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IDistributionV4} from "./IDistributionV4.sol";

/**
 * This contract used to bridge overplus to Base network.
 */
interface IDistributionToArbV4 is IDistributionV4 {
    /**
     * The function to initialize the contract.
     * @param depositToken_ The address of deposit token.
     * @param l1Sender_ The address of bridge contract.
     * @param feeConfig_ The address of fee config contract.
     * @param poolsInfo_ The array of initial pools.
     */
    function DistributionToArbV4_init(
        address depositToken_,
        address l1Sender_,
        address feeConfig_,
        Pool[] calldata poolsInfo_
    ) external;

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
