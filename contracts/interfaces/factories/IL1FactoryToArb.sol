// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IL1Factory} from "./IL1Factory.sol";

/**
 * This is IL1FactoryToArb contract that deploys the L1 contracts for the bridge for the Arbitrum.
 */
interface IL1FactoryToArb is IL1Factory {
    /**
     * The struct that represents the external dependencies for the Arbitrum contract.
     * @param endpoint The endpoint address.
     */
    struct ArbExternalDeps {
        address endpoint;
    }

    /**
     * The function that initializes the contract.
     */
    function L1FactoryToArb_init() external;

    /**
     * The function that sets the Arbitrum external dependencies.
     * @param externalDeps_ The Arbitrum external dependencies.
     */
    function setArbExternalDeps(ArbExternalDeps calldata externalDeps_) external;

    /**
     * The function that deploys the L1 contracts.
     * @param l1Params_ The L1 parameters.
     */
    function deploy(L1Params calldata l1Params_) external;
}
