// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IDistribution} from "../L1/IDistribution.sol";

/**
 * This is L1Factory contract that deploys the L1 contracts.
 */
interface IL1Factory {
    /**
     * The struct that represents the parameters for
     * deploying specific L1 contracts.
     * @param isUpgradeable The flag indicating whether the deployed pools are upgradeable.
     * @param owner The owner address.
     * @param protocolName The protocol name.
     * @param poolsInfo The pools information.
     * @param l2TokenReceiver The L2 token receiver address.
     * @param l2MessageReceiver The L2 message receiver address.
     */
    struct L1Params {
        bool isUpgradeable;
        address owner;
        string protocolName;
        IDistribution.Pool[] poolsInfo;
        address l2TokenReceiver;
        address l2MessageReceiver;
    }

    /**
     * The struct that represents the external dependencies for the deposit token.
     * @param token The token address.
     * @param wToken The wrapped token address.
     */
    struct DepositTokenExternalDeps {
        address token;
        address wToken;
    }

    /**
     * The struct that represents the external dependencies for the LZ contract.
     * @param endpoint The endpoint address.
     * @param zroPaymentAddress The ZRO payment address.
     * @param adapterParams The adapter parameters.
     * @param destinationChainId The destination chain ID.
     */
    struct LzExternalDeps {
        address endpoint;
        address zroPaymentAddress;
        bytes adapterParams;
        uint16 destinationChainId;
    }

    /**
     * The struct that represents the external dependencies for the Arbitrub contract.
     * @param endpoint The endpoint address.
     */
    struct ArbExternalDeps {
        address endpoint;
    }

    /**
     * The struct that represents deployed pools.
     * @param protocol The protocol name.
     * @param distribution The distribution address.
     * @param l1Sender The L1 sender address.
     */
    struct PoolView {
        string protocol;
        address distribution;
        address l1Sender;
    }

    /**
     * The function that initializes the contract.
     */
    function L1Factory_init() external;

    /**
     * The function to get fee config address.
     * @return The fee config address.
     */
    function feeConfig() external view returns (address);

    /**
     * The function that sets the deposit token external dependencies.
     * @param depositTokenExternalDeps_ The deposit token external dependencies.
     */
    function setDepositTokenExternalDeps(
        IL1Factory.DepositTokenExternalDeps calldata depositTokenExternalDeps_
    ) external;

    /**
     * The function that sets the LZ external dependencies.
     * @param lzExternalDeps_ The LZ external dependencies.
     */
    function setLzExternalDeps(IL1Factory.LzExternalDeps calldata lzExternalDeps_) external;

    /**
     * The function that sets the Arbitrum external dependencies.
     * @param arbExternalDeps_ The Arbitrum external dependencies.
     */
    function setArbExternalDeps(IL1Factory.ArbExternalDeps calldata arbExternalDeps_) external;

    /**
     * The function that deploys the L1 contracts.
     * @param l1Params_ The L1 parameters.
     */
    function deploy(IL1Factory.L1Params calldata l1Params_) external;

    /**
     * The function that predicts the pool addresses.
     * @param deployer_ The deployer address.
     * @param protocol_ The protocol name.
     * @return distribution_ The distribution address.
     * @return l1Sender_ The L1 sender address.
     */
    function predictAddresses(
        address deployer_,
        string calldata protocol_
    ) external view returns (address distribution_, address l1Sender_);

    /**
     * The function that gets the deployed pools.
     * @param deployer_ The deployer address.
     * @param offset_ The offset.
     * @param limit_ The limit.
     * @return pools_ The deployed pools.
     */
    function getDeployedPools(
        address deployer_,
        uint256 offset_,
        uint256 limit_
    ) external view returns (PoolView[] memory pools_);
}
