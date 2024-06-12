// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IL1Factory} from "./IL1Factory.sol";

/**
 * This is IL1FactoryToBase contract that deploys the L1 contracts for the bridge for the Base.
 */
interface IL1FactoryToBase is IL1Factory {
    /**
     * The struct that represents the external dependencies for the Base contract.
     * @param endpoint The endpoint address.
     * @param wTokenL2 The wstETH address on the Base network.
     */
    struct BaseExternalDeps {
        address endpoint;
        address wTokenL2;
    }

    /**
     * The function that initializes the contract.
     */
    function L1FactoryToBase_init() external;

    /**
     * The function that sets the Arbitrum external dependencies.
     * @param externalDeps_ The Arbitrum external dependencies.
     */
    function setBaseExternalDeps(BaseExternalDeps calldata externalDeps_) external;

    /**
     * The function that deploys the L1 contracts.
     * @param l1Params_ The L1 parameters.
     */
    function deploy(L1Params calldata l1Params_) external;
}
