// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IL2TokenReceiver} from "../L2/IL2TokenReceiver.sol";

interface IL2Factory {
    /**
     * The struct that represents the parameters for
     * deploying specific L2 contracts.
     * @param isUpgradeable The flag indicating whether the deployed pools are upgradeable.
     * @param owner The owner address.
     * @param protocolName The protocol name.
     * @param mor20Name The MOR20 name.
     * @param mor20Symbol The MOR20 symbol.
     * @param l1Sender The L1 sender address.
     * @param firstSwapParams_ The first swap parameters.
     * @param secondSwapFee The second swap fee.
     */
    struct L2Params {
        bool isUpgradeable;
        address owner;
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
     * The struct that represents deployed pools.
     * @param protocol The protocol name.
     * @param l2MessageReceiver The L2 message receiver address.
     * @param l2TokenReceiver The L2 token receiver address.
     * @param mor20 The MOR20 address.
     */
    struct PoolView {
        string protocol;
        address l2MessageReceiver;
        address l2TokenReceiver;
        address mor20;
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

    /**
     * The function that predicts the pool addresses.
     * @param deployer_ The deployer address.
     * @param protocol_ The protocol name.
     * @return l2MessageReceiver_ The L2 message receiver address.
     * @return l2TokenReceiver_ The L2 token receiver address.
     */
    function predictAddresses(
        address deployer_,
        string calldata protocol_
    ) external view returns (address l2MessageReceiver_, address l2TokenReceiver_);

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

    /**
     * The function to get the MOR20 address.
     * @param deployer_ The deployer address.
     * @param protocol_ The protocol name.
     * @return mor20 The MOR20 address.
     */
    function getMor20(address deployer_, string calldata protocol_) external view returns (address);
}
