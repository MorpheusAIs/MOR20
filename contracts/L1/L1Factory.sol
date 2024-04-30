// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Factory} from "../Factory.sol";

import {IDistribution} from "../interfaces/L1/IDistribution.sol";
import {IL1Sender} from "../interfaces/L1/IL1Sender.sol";
import {IOwnable} from "../interfaces/IOwnable.sol";

contract L1Factory is Factory {
    enum PoolType {
        DISTRIBUTION,
        L1_SENDER
    }

    struct L1Params {
        string protocolName;
        IDistribution.Pool[] poolsInfo;
        address l2TokenReceiver;
        address l2MessageReceiver;
    }

    struct DepositTokenExternalDeps {
        address token;
        address wToken;
    }

    struct LzExternalDeps {
        address endpoint;
        address zroPaymentAddress;
        bytes adapterParams;
        uint16 destinationChainId;
    }

    struct ArbExternalDeps {
        address endpoint;
    }

    DepositTokenExternalDeps public depositTokenExternalDeps;
    ArbExternalDeps public arbExternalDeps;
    LzExternalDeps public lzExternalDeps;

    constructor() {
        _disableInitializers();
    }

    function L1Factory_init() external initializer {
        __Pausable_init();
        __Ownable_init();
        __UUPSUpgradeable_init();
        __Factory_init();
    }

    function setDepositTokenExternalDeps(
        DepositTokenExternalDeps calldata depositTokenExternalDeps_
    ) external onlyOwner {
        require(depositTokenExternalDeps_.token != address(0), "L1F: invalid token");
        require(depositTokenExternalDeps_.wToken != address(0), "L1F: invalid wtoken");

        depositTokenExternalDeps = depositTokenExternalDeps_;
    }

    function setLzTokenExternalDeps(LzExternalDeps calldata lzExternalDeps_) external onlyOwner {
        require(lzExternalDeps_.endpoint != address(0), "L1F: invalid LZ endpoint");
        require(lzExternalDeps_.destinationChainId != 0, "L1F: invalid chain ID");

        lzExternalDeps = lzExternalDeps_;
    }

    function setArbTokenExternalDeps(ArbExternalDeps calldata arbExternalDeps_) external onlyOwner {
        require(arbExternalDeps_.endpoint != address(0), "L1F: invalid ARB endpoint");

        arbExternalDeps = arbExternalDeps_;
    }

    function deploy(L1Params calldata l1Params_) external whenNotPaused {
        address distributionProxy_ = _deploy2(uint8(PoolType.DISTRIBUTION), l1Params_.protocolName);
        address l1SenderProxy_ = _deploy2(uint8(PoolType.L1_SENDER), l1Params_.protocolName);

        IDistribution(distributionProxy_).Distribution_init(
            depositTokenExternalDeps.token,
            l1SenderProxy_,
            l1Params_.poolsInfo
        );

        IL1Sender.RewardTokenConfig memory lzConfig_ = IL1Sender.RewardTokenConfig(
            lzExternalDeps.endpoint,
            l1Params_.l2MessageReceiver,
            lzExternalDeps.destinationChainId,
            lzExternalDeps.zroPaymentAddress,
            lzExternalDeps.adapterParams
        );

        IL1Sender.DepositTokenConfig memory arbConfig = IL1Sender.DepositTokenConfig(
            depositTokenExternalDeps.wToken,
            arbExternalDeps.endpoint,
            l1Params_.l2TokenReceiver
        );

        IL1Sender(l1SenderProxy_).L1Sender__init(distributionProxy_, lzConfig_, arbConfig);

        IOwnable(distributionProxy_).transferOwnership(_msgSender());
        IOwnable(l1SenderProxy_).transferOwnership(_msgSender());
    }
}
