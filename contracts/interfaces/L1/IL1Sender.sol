// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";

interface IL1Sender is IERC165 {
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
     * The structure that stores the reward token's data.
     * @param gateway The address of token's gateway.
     * @param receiver The address of token's receiver on L2.
     * @param receiverChainId The chain id of receiver.
     * @param zroPaymentAddress The address of ZKSync payment contract.
     * @param adapterParams The parameters for the adapter.
     */
    struct RewardTokenConfig {
        address gateway;
        address receiver;
        uint16 receiverChainId;
        address zroPaymentAddress;
        bytes adapterParams;
    }

    /**
     * The function to initialize the contract.
     * @param distribution_ The address of the distribution contract.
     * @param rewardTokenConfig_ The reward token's config.
     * @param depositTokenConfig_ The deposit token's config.
     */
    function L1Sender__init(
        address distribution_,
        RewardTokenConfig calldata rewardTokenConfig_,
        DepositTokenConfig calldata depositTokenConfig_
    ) external;

    /**
     * The function to get the deposit token's address.
     */
    function unwrappedDepositToken() external view returns (address);

    /**
     * The function to send the message of mint of reward token to the L2.
     * @param user_ The user's address to mint reward tokens.
     * @param amount_ The amount of reward tokens to mint.
     * @param refundTo_ The address to refund the overpaid gas.
     */
    function sendMintMessage(address user_, uint256 amount_, address refundTo_) external payable;

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
