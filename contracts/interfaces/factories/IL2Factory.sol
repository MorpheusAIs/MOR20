// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IL2TokenReceiver} from "../L2/IL2TokenReceiver.sol";

interface IL2Factory {
    /**
     * The enum that represents the deployed L2 contract.
     */
    enum PoolType {
        L2_MESSAGE_RECEIVER,
        L2_TOKEN_RECEIVER
    }

    /**
     * The struct that represents the parameters for
     * deploying specific L2 contracts.
     * @param isUpgradeable The flag indicating whether the deployed pools are upgradeable.
     * @param protocolName The protocol name.
     * @param mor20Name The MOR20 name.
     * @param mor20Symbol The MOR20 symbol.
     * @param l1Sender The L1 sender address.
     * @param firstSwapParams_ The first swap parameters.
     * @param secondSwapFee The second swap fee.
     */
    struct L2Params {
        bool isUpgradeable;
        string protocolName;
        string mor20Name;
        string mor20Symbol;
        address l1Sender;
        IL2TokenReceiver.SwapParams firstSwapParams_;
        uint24 secondSwapFee;
    }

    /**
     * The struct that represents the external dependencies for the Uniswap contract.
     * @param router The router address.
     * @param nonfungiblePositionManager The nonfungible position manager address.
     */
    struct UniswapExternalDeps {
        address router;
        address nonfungiblePositionManager;
    }

    /**
     * The struct that represents the external dependencies for the LZ contract.
     * @param endpoint The endpoint address.
     * @param oftEndpoint The OFT endpoint address.
     * @param senderChainId The sender chain ID.
     */
    struct LzExternalDeps {
        address endpoint;
        address oftEndpoint;
        uint16 senderChainId;
    }

    /**
     * The function that initializes the contract.
     */
    function L2Factory_init() external;

    /**
     * The function that sets the LZ external dependencies.
     * @param lzExternalDeps_ The LZ external dependencies.
     */
    function setLzExternalDeps(LzExternalDeps calldata lzExternalDeps_) external;

    /**
     * The function that sets the Uniswap external dependencies.
     * @param uniswapExternalDeps_ The Uniswap external dependencies.
     */
    function setUniswapExternalDeps(UniswapExternalDeps calldata uniswapExternalDeps_) external;

    /**
     * The function that deploys the L2 contracts.
     * @param l2Params_ The L2 parameters.
     */
    function deploy(L2Params calldata l2Params_) external;
}
