// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";

import {IL1Sender} from "./IL1Sender.sol";

interface IL1BaseSender is IL1Sender {
    /**
     * The structure that stores the deposit token's data (stETH).
     * @param gateway The address of bridge gateway.
     * @param l1Token The address of wrapped deposit token on the L1.
     * @param l2Token The address of wrapped deposit token on the L2.
     * @param receiver The address of wrapped token's receiver on L2.
     */
    struct DepositTokenConfig {
        address gateway;
        address l1Token;
        address l2Token;
        address receiver;
    }

    /**
     * The function to initialize the contract.
     * @param distribution_ The address of the distribution contract.
     * @param rewardTokenConfig_ The reward token's config.
     * @param depositTokenConfig_ The deposit token's config.
     */
    function L1BaseSender__init(
        address distribution_,
        RewardTokenConfig calldata rewardTokenConfig_,
        DepositTokenConfig calldata depositTokenConfig_
    ) external;

    /**
     * The function to set the deposit token to the L2.
     * @param gasLimit_ The gas limit for the transaction on the L2.
     * @param data_ The additional data for the bridge.
     */
    function sendDepositToken(uint32 gasLimit_, bytes calldata data_) external;
}
