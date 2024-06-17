// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IDistribution} from "../interfaces/L1/IDistribution.sol";
import {IL1Factory} from "../interfaces/factories/IL1Factory.sol";
import {IL1Sender} from "../interfaces/L1/IL1Sender.sol";
import {IOwnable} from "../interfaces/utils/IOwnable.sol";
import {IFreezableBeaconProxy} from "../interfaces/proxy/IFreezableBeaconProxy.sol";

import {Factory} from "./Factory.sol";

contract L1Factory is IL1Factory, Factory {
    string public constant DISTRIBUTION_POOL = "DISTRIBUTION";
    string public constant L1_SENDER_POOL = "L1_SENDER";

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
        _registerProtocol(l1Params_.protocolName);

        address distributionProxy_ = _deploy2(l1Params_.protocolName, DISTRIBUTION_POOL);
        address l1SenderProxy_ = _deploy2(l1Params_.protocolName, L1_SENDER_POOL);

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
            IFreezableBeaconProxy(distributionProxy_).freezeProxy_();
            IFreezableBeaconProxy(l1SenderProxy_).freezeProxy_();
        }

        IOwnable(distributionProxy_).transferOwnership(l1Params_.owner);
        IOwnable(l1SenderProxy_).transferOwnership(l1Params_.owner);
    }

    function predictAddresses(
        address deployer_,
        string calldata protocol_
    ) external view returns (address distribution_, address l1Sender_) {
        distribution_ = _predictPoolAddress(deployer_, protocol_, DISTRIBUTION_POOL);
        l1Sender_ = _predictPoolAddress(deployer_, protocol_, L1_SENDER_POOL);
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
                l1Sender: getProxyPool(deployer_, protocol_, L1_SENDER_POOL)
            });
        }
    }
}
