// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {L1Factory, IL1Factory} from "./L1Factory.sol";

import {IDistributionToBase} from "../interfaces/L1/IDistributionToBase.sol";
import {IL1FactoryToBase} from "../interfaces/factories/IL1FactoryToBase.sol";
import {IL1Sender} from "../interfaces/L1/IL1Sender.sol";
import {IL1BaseSender} from "../interfaces/L1/IL1BaseSender.sol";

contract L1FactoryToBase is IL1FactoryToBase, L1Factory {
    BaseExternalDeps public baseExternalDeps;

    constructor() {
        _disableInitializers();
    }

    function L1FactoryToBase_init() external initializer {
        __L1Factory_init();
    }

    function setBaseExternalDeps(BaseExternalDeps calldata externalDeps_) external onlyOwner {
        require(externalDeps_.endpoint != address(0), "L1FTB: invalid Base endpoint");
        require(externalDeps_.wTokenL2 != address(0), "L1FTB: invalid wToken address");

        baseExternalDeps = externalDeps_;
    }

    function deploy(L1Params calldata l1Params_) external whenNotPaused {
        _registerProtocol(l1Params_.protocolName);

        address distributionProxy_ = _deploy2(l1Params_.protocolName, DISTRIBUTION_POOL);
        address l1SenderProxy_ = _deploy2(l1Params_.protocolName, L1_SENDER_POOL);

        IDistributionToBase(distributionProxy_).DistributionToBase_init(
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

        IL1BaseSender.DepositTokenConfig memory baseConfig_ = IL1BaseSender.DepositTokenConfig(
            baseExternalDeps.endpoint,
            depositTokenExternalDeps.wToken,
            baseExternalDeps.wTokenL2,
            l1Params_.l2TokenReceiver
        );

        IL1BaseSender(l1SenderProxy_).L1BaseSender__init(distributionProxy_, lzConfig_, baseConfig_);

        _freezeProxy(l1Params_.isUpgradeable, distributionProxy_, l1SenderProxy_);
        _transferProxyOwnership(l1Params_.owner, distributionProxy_, l1SenderProxy_);
    }

    function getL2Network() public pure override returns (string memory) {
        return "BASE";
    }
}
