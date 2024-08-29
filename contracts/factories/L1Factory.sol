// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Factory} from "./Factory.sol";

import {IL1Factory} from "../interfaces/factories/IL1Factory.sol";
import {IOwnable} from "../interfaces/utils/IOwnable.sol";
import {IFreezableBeaconProxy} from "../interfaces/proxy/IFreezableBeaconProxy.sol";

abstract contract L1Factory is IL1Factory, Factory {
    string public constant DISTRIBUTION_POOL = "DISTRIBUTION";
    string public constant L1_SENDER_POOL = "L1_SENDER";

    address public feeConfig;

    DepositTokenExternalDeps public depositTokenExternalDeps;
    LzExternalDeps public lzExternalDeps;

    constructor() {
        _disableInitializers();
    }

    function __L1Factory_init() internal onlyInitializing {
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

    function setFeeConfig(address feeConfig_) external onlyOwner {
        require(feeConfig_ != address(0), "L1F: invalid fee config");

        feeConfig = feeConfig_;
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

    function _freezeProxy(bool isUpgradeable_, address distributionProxy_, address l1SenderProxy_) internal {
        if (isUpgradeable_) {
            return;
        }

        IFreezableBeaconProxy(distributionProxy_).freezeProxy_();
        IFreezableBeaconProxy(l1SenderProxy_).freezeProxy_();
    }

    function _transferProxyOwnership(address owner_, address distributionProxy_, address l1SenderProxy_) internal {
        IOwnable(distributionProxy_).transferOwnership(owner_);
        IOwnable(l1SenderProxy_).transferOwnership(owner_);
    }

    uint256[45] private __gap;
}
