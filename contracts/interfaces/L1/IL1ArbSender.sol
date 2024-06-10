// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";

import {IL1Sender} from "./IL1Sender.sol";

interface IL1ArbSender is IL1Sender {
    /**
     * The structure that stores the deposit token's data (stETH).
     * @param token The address of wrapped deposit token.
     * @param gateway The address of token's gateway.
     * @param receiver The address of wrapped token's receiver on L2.
     */
    struct DepositTokenConfig {
        address token;
        address gateway;
        address receiver;
    }

    /**
     * The function to initialize the contract.
     * @param distribution_ The address of the distribution contract.
     * @param rewardTokenConfig_ The reward token's config.
     * @param depositTokenConfig_ The deposit token's config.
     */
    function L1ArbSender__init(
        address distribution_,
        RewardTokenConfig calldata rewardTokenConfig_,
        DepositTokenConfig calldata depositTokenConfig_
    ) external;

    /**
     * The function to set the deposit token to the L2.
     * @param gasLimit_ The gas limit for the transaction.
     * @param maxFeePerGas_ The maximum fee per gas for the transaction.
     * @param maxSubmissionCost_ The maximum submission cost for the transaction.
     */
    function sendDepositToken(
        uint256 gasLimit_,
        uint256 maxFeePerGas_,
        uint256 maxSubmissionCost_
    ) external payable returns (bytes memory);
}
