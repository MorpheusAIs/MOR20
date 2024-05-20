// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IDistribution} from "../interfaces/L1/IDistribution.sol";
import {IL1Factory} from "../interfaces/factories/IL1Factory.sol";
import {IL1Sender} from "../interfaces/L1/IL1Sender.sol";
import {IOwnable} from "../interfaces/utils/IOwnable.sol";
import {IFreezableBeaconProxy} from "../interfaces/proxy/IFreezableBeaconProxy.sol";

import {Factory} from "./Factory.sol";

contract L1Factory is IL1Factory, Factory {
    address public feeConfig;

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

    function setLzExternalDeps(LzExternalDeps calldata lzExternalDeps_) external onlyOwner {
        require(lzExternalDeps_.endpoint != address(0), "L1F: invalid LZ endpoint");
        require(lzExternalDeps_.destinationChainId != 0, "L1F: invalid chain ID");

        lzExternalDeps = lzExternalDeps_;
    }

    function setArbExternalDeps(ArbExternalDeps calldata arbExternalDeps_) external onlyOwner {
        require(arbExternalDeps_.endpoint != address(0), "L1F: invalid ARB endpoint");

        arbExternalDeps = arbExternalDeps_;
    }

    function setFeeConfig(address feeConfig_) external onlyOwner {
        require(feeConfig_ != address(0), "L1F: invalid fee config");

        feeConfig = feeConfig_;
    }

    function deploy(L1Params calldata l1Params_) external whenNotPaused {
        address distributionProxy_ = _deploy2(l1Params_.protocolName, uint8(PoolType.DISTRIBUTION));
        address l1SenderProxy_ = _deploy2(l1Params_.protocolName, uint8(PoolType.L1_SENDER));

        IDistribution(distributionProxy_).Distribution_init(
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

        IL1Sender.DepositTokenConfig memory arbConfig_ = IL1Sender.DepositTokenConfig(
            depositTokenExternalDeps.wToken,
            arbExternalDeps.endpoint,
            l1Params_.l2TokenReceiver
        );

        IL1Sender(l1SenderProxy_).L1Sender__init(distributionProxy_, lzConfig_, arbConfig_);

        if (!l1Params_.isUpgradeable) {
            IFreezableBeaconProxy(distributionProxy_).freeze();
            IFreezableBeaconProxy(l1SenderProxy_).freeze();
        }

        IOwnable(distributionProxy_).transferOwnership(_msgSender());
        IOwnable(l1SenderProxy_).transferOwnership(_msgSender());
    }

    function predictAddresses(
        address deployer_,
        string calldata protocol_
    ) external view returns (address distribution_, address l1Sender_) {
        distribution_ = _predictPoolAddress(deployer_, protocol_, uint8(PoolType.DISTRIBUTION));
        l1Sender_ = _predictPoolAddress(deployer_, protocol_, uint8(PoolType.L1_SENDER));
    }
}
