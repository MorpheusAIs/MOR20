// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IL2MessageReceiver} from "../interfaces/L2/IL2MessageReceiver.sol";
import {IL2TokenReceiver} from "../interfaces/L2/IL2TokenReceiver.sol";
import {IL2Factory} from "../interfaces/factories/IL2Factory.sol";
import {IOwnable} from "../interfaces/utils/IOwnable.sol";
import {IMOR20} from "../interfaces/L2/IMOR20.sol";
import {IFreezableBeaconProxy} from "../interfaces/proxy/IFreezableBeaconProxy.sol";

import {Factory} from "./Factory.sol";
import {MOR20Deployer} from "../libs/MOR20Deployer.sol";

contract L2Factory is IL2Factory, Factory {
    UniswapExternalDeps public uniswapExternalDeps;
    LzExternalDeps public lzExternalDeps;

    mapping(address deployer => mapping(string protocol => address)) public mor20;

    constructor() {
        _disableInitializers();
    }

    function L2Factory_init() external initializer {
        __Pausable_init();
        __Ownable_init();
        __UUPSUpgradeable_init();
        __Factory_init();
    }

    function setLzExternalDeps(LzExternalDeps calldata lzExternalDeps_) external onlyOwner {
        require(lzExternalDeps_.endpoint != address(0), "L2F: invalid LZ endpoint");
        require(lzExternalDeps_.oftEndpoint != address(0), "L2F: invalid LZ OFT endpoint");
        require(lzExternalDeps_.senderChainId != 0, "L2F: invalid chain ID");

        lzExternalDeps = lzExternalDeps_;
    }

    function setUniswapExternalDeps(UniswapExternalDeps calldata uniswapExternalDeps_) external onlyOwner {
        require(uniswapExternalDeps_.router != address(0), "L2F: invalid UNI router");
        require(uniswapExternalDeps_.nonfungiblePositionManager != address(0), "L2F: invalid NPM");

        uniswapExternalDeps = uniswapExternalDeps_;
    }

    function deploy(L2Params calldata l2Params_) external whenNotPaused {
        address l2MessageReceiver_ = _deploy2(l2Params_.protocolName, uint8(PoolType.L2_MESSAGE_RECEIVER));
        address l2TokenReceiver_ = _deploy2(l2Params_.protocolName, uint8(PoolType.L2_TOKEN_RECEIVER));

        address mor20_ = MOR20Deployer.deployMOR20(
            l2Params_.mor20Name,
            l2Params_.mor20Symbol,
            lzExternalDeps.oftEndpoint,
            _msgSender(),
            l2MessageReceiver_
        );
        mor20[_msgSender()][l2Params_.protocolName] = mor20_;

        IL2MessageReceiver(l2MessageReceiver_).L2MessageReceiver__init(
            mor20_,
            IL2MessageReceiver.Config(lzExternalDeps.endpoint, l2Params_.l1Sender, lzExternalDeps.senderChainId)
        );

        IL2TokenReceiver(l2TokenReceiver_).L2TokenReceiver__init(
            uniswapExternalDeps.router,
            uniswapExternalDeps.nonfungiblePositionManager,
            l2Params_.firstSwapParams_,
            IL2TokenReceiver.SwapParams(l2Params_.firstSwapParams_.tokenOut, mor20_, l2Params_.secondSwapFee)
        );

        if (!l2Params_.isUpgradeable) {
            IFreezableBeaconProxy(l2MessageReceiver_).freeze();
            IFreezableBeaconProxy(l2TokenReceiver_).freeze();
        }

        IOwnable(l2MessageReceiver_).transferOwnership(_msgSender());
        IOwnable(l2TokenReceiver_).transferOwnership(_msgSender());
    }

    function predictAddresses(
        address deployer_,
        string calldata protocol_
    ) external view returns (address l2MessageReceiver_, address l2TokenReceiver_) {
        l2MessageReceiver_ = _predictPoolAddress(deployer_, protocol_, uint8(PoolType.L2_MESSAGE_RECEIVER));
        l2TokenReceiver_ = _predictPoolAddress(deployer_, protocol_, uint8(PoolType.L2_TOKEN_RECEIVER));
    }
}
