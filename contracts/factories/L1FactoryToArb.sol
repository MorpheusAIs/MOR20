// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {L1Factory, IL1Factory} from "./L1Factory.sol";

import {IDistributionToArb} from "../interfaces/L1/IDistributionToArb.sol";
import {IL1FactoryToArb} from "../interfaces/factories/IL1FactoryToArb.sol";
import {IL1Sender} from "../interfaces/L1/IL1Sender.sol";
import {IL1ArbSender} from "../interfaces/L1/IL1ArbSender.sol";

contract L1FactoryToArb is IL1FactoryToArb, L1Factory {
    ArbExternalDeps public arbExternalDeps;

    constructor() {
        _disableInitializers();
    }

    function L1FactoryToArb_init() external initializer {
        __L1Factory_init();
    }

    function setArbExternalDeps(ArbExternalDeps calldata externalDeps_) external onlyOwner {
        require(externalDeps_.endpoint != address(0), "L1FTA: invalid ARB endpoint");

        arbExternalDeps = externalDeps_;
    }

    function deploy(L1Params calldata l1Params_) external whenNotPaused {
        _registerProtocol(l1Params_.protocolName);

        address distributionProxy_ = _deploy2(l1Params_.protocolName, DISTRIBUTION_POOL, getL2Network());
        address l1SenderProxy_ = _deploy2(l1Params_.protocolName, L1_SENDER_POOL, getL2Network());

        IDistributionToArb(distributionProxy_).DistributionToArb_init(
            depositTokenExternalDeps.token,
            l1SenderProxy_,
            feeConfig,
            l1Params_.poolsInfo
        );

        IL1Sender.RewardTokenConfig memory lzConfig_ = IL1Sender.RewardTokenConfig(
            lzExternalDeps.endpoint,
            l1Params_.l2MessageReceiver,
            lzExternalDeps.destinationChainId,
            lzExternalDeps.zroPaymentAddress,
            lzExternalDeps.adapterParams
        );

        IL1ArbSender.DepositTokenConfig memory arbConfig_ = IL1ArbSender.DepositTokenConfig(
            depositTokenExternalDeps.wToken,
            arbExternalDeps.endpoint,
            l1Params_.l2TokenReceiver
        );

        IL1ArbSender(l1SenderProxy_).L1ArbSender__init(distributionProxy_, lzConfig_, arbConfig_);

        _freezeProxy(l1Params_.isUpgradeable, distributionProxy_, l1SenderProxy_);
        _transferProxyOwnership(l1Params_.owner, distributionProxy_, l1SenderProxy_);
    }

    function getL2Network() public pure override(IL1Factory, L1Factory) returns (string memory) {
        return "ARB";
    }
}
