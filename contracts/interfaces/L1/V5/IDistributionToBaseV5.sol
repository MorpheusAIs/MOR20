// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IDistributionV5} from "./IDistributionV5.sol";

/**
 * This contract used to bridge overplus to Arbitrum network.
 */
interface IDistributionToBaseV5 is IDistributionV5 {
    /**
     * The function to initialize the contract.
     * @param depositToken_ The address of deposit token.
     * @param l1Sender_ The address of bridge contract.
     * @param feeConfig_ The address of fee config contract.
     * @param poolsInfo_ The array of initial pools.
     */
    function DistributionToBaseV5_init(
        address depositToken_,
        address l1Sender_,
        address feeConfig_,
        Pool[] calldata poolsInfo_
    ) external;

    /**
     * The function to bridge the overplus of the staked deposit tokens to the Base network.
     * @param gasLimit_ The gas limit.
     * @param data_ The additional data for the bridge.
     */
    function bridgeOverplus(uint24 gasLimit_, bytes memory data_) external;
}
