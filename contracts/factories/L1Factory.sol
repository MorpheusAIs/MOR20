// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IDistribution} from "../interfaces/L1/IDistribution.sol";
import {IL1Factory} from "../interfaces/factories/IL1Factory.sol";
import {IL1Sender} from "../interfaces/L1/IL1Sender.sol";
import {IL1ArbSender} from "../interfaces/L1/IL1ArbSender.sol";
import {IL1BaseSender} from "../interfaces/L1/IL1BaseSender.sol";
import {IOwnable} from "../interfaces/utils/IOwnable.sol";
import {IFreezableBeaconProxy} from "../interfaces/proxy/IFreezableBeaconProxy.sol";

import {Factory} from "./Factory.sol";

contract L1Factory is IL1Factory, Factory {
    string public constant DISTRIBUTION_POOL = "DISTRIBUTION";
    string public constant L1_ARB_SENDER_POOL = "L1_ARB_SENDER";
    string public constant L1_BASE_SENDER_POOL = "L1_BASE_SENDER";

    address public feeConfig;

    DepositTokenExternalDeps public depositTokenExternalDeps;

    ArbExternalDeps public arbExternalDeps;
    LzExternalDeps public lzToArbExternalDeps;

    BaseExternalDeps public baseExternalDeps;
    LzExternalDeps public lzToBaseExternalDeps;

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

    function setLzToArbExternalDeps(LzExternalDeps calldata lzExternalDeps_) external onlyOwner {
        _validateLzExternalDeps(lzExternalDeps_);

        lzToArbExternalDeps = lzExternalDeps_;
    }

    function setLzToBaseExternalDeps(LzExternalDeps calldata lzExternalDeps_) external onlyOwner {
        _validateLzExternalDeps(lzExternalDeps_);

        lzToBaseExternalDeps = lzExternalDeps_;
    }

    function setArbExternalDeps(ArbExternalDeps calldata externalDeps_) external onlyOwner {
        require(externalDeps_.endpoint != address(0), "L1F: invalid ARB endpoint");

        arbExternalDeps = externalDeps_;
    }

    function setBaseExternalDeps(BaseExternalDeps calldata externalDeps_) external onlyOwner {
        require(externalDeps_.endpoint != address(0), "L1F: invalid Base endpoint");
        require(externalDeps_.wTokenL2 != address(0), "L1F: invalid wToken address");

        baseExternalDeps = externalDeps_;
    }

    function setFeeConfig(address feeConfig_) external onlyOwner {
        require(feeConfig_ != address(0), "L1F: invalid fee config");

        feeConfig = feeConfig_;
    }

    function deployArb(L1Params calldata l1Params_) external whenNotPaused {
        _registerProtocol(l1Params_.protocolName);

        address distributionProxy_ = _deploy2(l1Params_.protocolName, DISTRIBUTION_POOL);
        address l1ArbSenderProxy_ = _deploy2(l1Params_.protocolName, L1_ARB_SENDER_POOL);

        _setupDistribution(l1Params_, distributionProxy_, l1ArbSenderProxy_);
        _setupL1ArbSender(l1Params_, lzToArbExternalDeps, distributionProxy_, l1ArbSenderProxy_);
        _freezeProxy(l1Params_.isUpgradeable, distributionProxy_, l1ArbSenderProxy_);
        _transferProxyOwnership(l1Params_.owner, distributionProxy_, l1ArbSenderProxy_);
    }

    function deployBase(L1Params calldata l1Params_) external whenNotPaused {
        _registerProtocol(l1Params_.protocolName);

        address distributionProxy_ = _deploy2(l1Params_.protocolName, DISTRIBUTION_POOL);
        address l1BaseSenderProxy_ = _deploy2(l1Params_.protocolName, L1_BASE_SENDER_POOL);

        _setupDistribution(l1Params_, distributionProxy_, l1BaseSenderProxy_);
        _setupL1BaseSender(l1Params_, lzToBaseExternalDeps, distributionProxy_, l1BaseSenderProxy_);
        _freezeProxy(l1Params_.isUpgradeable, distributionProxy_, l1BaseSenderProxy_);
        _transferProxyOwnership(l1Params_.owner, distributionProxy_, l1BaseSenderProxy_);
    }

    function predictAddresses(
        address deployer_,
        string calldata protocol_
    ) external view returns (address distribution_, address l1ArbSender_, address l1BaseSender_) {
        distribution_ = _predictPoolAddress(deployer_, protocol_, DISTRIBUTION_POOL);
        l1ArbSender_ = _predictPoolAddress(deployer_, protocol_, L1_ARB_SENDER_POOL);
        l1BaseSender_ = _predictPoolAddress(deployer_, protocol_, L1_BASE_SENDER_POOL);
    }

    function getDeployedPools(
        address deployer_,
        uint256 offset_,
        uint256 limit_
    ) external view returns (PoolView[] memory pools_) {
        string[] memory protocols_ = listProtocols(deployer_, offset_, limit_);

        pools_ = new PoolView[](protocols_.length);

        for (uint256 i = 0; i < protocols_.length; i++) {
            string memory protocol_ = protocols_[i];

            pools_[i] = PoolView({
                protocol: protocol_,
                distribution: getProxyPool(deployer_, protocol_, DISTRIBUTION_POOL),
                l1ArbSender: getProxyPool(deployer_, protocol_, L1_ARB_SENDER_POOL),
                l1BaseSender: getProxyPool(deployer_, protocol_, L1_BASE_SENDER_POOL)
            });
        }
    }

    function _validateLzExternalDeps(LzExternalDeps calldata lzExternalDeps_) private pure {
        require(lzExternalDeps_.endpoint != address(0), "L1F: invalid LZ endpoint");
        require(lzExternalDeps_.destinationChainId != 0, "L1F: invalid chain ID");
    }

    function _setupDistribution(
        L1Params calldata l1Params_,
        address distributionProxy_,
        address l1SenderProxy
    ) private {
        IDistribution(distributionProxy_).Distribution_init(
            depositTokenExternalDeps.token,
            l1SenderProxy,
            feeConfig,
            l1Params_.poolsInfo
        );
    }

    function _setupL1ArbSender(
        L1Params calldata l1Params_,
        LzExternalDeps storage lzExtrenalDeps,
        address distributionProxy_,
        address l1ArbSenderProxy_
    ) private {
        IL1Sender.RewardTokenConfig memory lzConfig_ = IL1Sender.RewardTokenConfig(
            lzExtrenalDeps.endpoint,
            l1Params_.l2MessageReceiver,
            lzExtrenalDeps.destinationChainId,
            lzExtrenalDeps.zroPaymentAddress,
            lzExtrenalDeps.adapterParams
        );

        IL1ArbSender.DepositTokenConfig memory arbConfig_ = IL1ArbSender.DepositTokenConfig(
            depositTokenExternalDeps.wToken,
            arbExternalDeps.endpoint,
            l1Params_.l2TokenReceiver
        );

        IL1ArbSender(l1ArbSenderProxy_).L1ArbSender__init(distributionProxy_, lzConfig_, arbConfig_);
    }

    function _setupL1BaseSender(
        L1Params calldata l1Params_,
        LzExternalDeps storage lzExtrenalDeps,
        address distributionProxy_,
        address l1BaseSenderProxy_
    ) private {
        IL1Sender.RewardTokenConfig memory lzConfig_ = IL1Sender.RewardTokenConfig(
            lzExtrenalDeps.endpoint,
            l1Params_.l2MessageReceiver,
            lzExtrenalDeps.destinationChainId,
            lzExtrenalDeps.zroPaymentAddress,
            lzExtrenalDeps.adapterParams
        );

        IL1BaseSender.DepositTokenConfig memory baseConfig_ = IL1BaseSender.DepositTokenConfig(
            baseExternalDeps.endpoint,
            depositTokenExternalDeps.wToken,
            baseExternalDeps.wTokenL2,
            l1Params_.l2TokenReceiver
        );

        IL1BaseSender(l1BaseSenderProxy_).L1BaseSender__init(distributionProxy_, lzConfig_, baseConfig_);
    }

    function _freezeProxy(bool isUpgradeable_, address distributionProxy_, address l1XSenderProxy_) private {
        if (isUpgradeable_) {
            return;
        }

        IFreezableBeaconProxy(distributionProxy_).freeze();
        IFreezableBeaconProxy(l1XSenderProxy_).freeze();
    }

    function _transferProxyOwnership(address owner_, address distributionProxy_, address l1XSenderProxy_) private {
        IOwnable(distributionProxy_).transferOwnership(owner_);
        IOwnable(l1XSenderProxy_).transferOwnership(owner_);
    }
}
