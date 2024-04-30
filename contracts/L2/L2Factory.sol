// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Factory} from "../Factory.sol";
import {MOR20} from "./MOR20.sol";

import {IL2MessageReceiver} from "../interfaces/L2/IL2MessageReceiver.sol";
import {IL2TokenReceiverV2} from "../interfaces/L2/IL2TokenReceiverV2.sol";
import {IMOR20} from "../interfaces/L2/IMOR20.sol";
import {IOwnable} from "../interfaces/IOwnable.sol";

contract L2Factory is Factory {
    enum PoolType {
        L2_MESSAGE_RECEIVER,
        L2_TOKEN_RECEIVER
    }

    struct L2Params {
        string protocolName;
        string mor20Name;
        string mor20Symbol;
    }

    struct UniswapExternalDeps {
        address router;
        address nonfungiblePositionManager;
    }

    struct LzExternalDeps {
        address endpoint;
        address oftEndpoint;
        uint16 senderChainId;
    }

    event Mor20Deployed(address token);

    UniswapExternalDeps public uniswapExternalDeps;
    LzExternalDeps public lzExternalDeps;

    constructor() {
        _disableInitializers();
    }

    function L2Factory_init() external initializer {
        __Pausable_init();
        __Ownable_init();
        __UUPSUpgradeable_init();
        __Factory_init();
    }

    function setLzTokenExternalDeps(LzExternalDeps calldata lzExternalDeps_) external onlyOwner {
        require(lzExternalDeps_.endpoint != address(0), "L2F: invalid LZ endpoint");
        require(lzExternalDeps_.oftEndpoint != address(0), "L2F: invalid LZ OFT endpoint");
        require(lzExternalDeps_.senderChainId != 0, "L2F: invalid chain ID");

        lzExternalDeps = lzExternalDeps_;
    }

    function setLzTokenExternalDeps(UniswapExternalDeps calldata uniswapExternalDeps_) external onlyOwner {
        require(uniswapExternalDeps.router != address(0), "L2F: invalid UNI router");
        require(uniswapExternalDeps.nonfungiblePositionManager != address(0), "L2F: invalid NPM");

        uniswapExternalDeps = uniswapExternalDeps_;
    }

    function deploy(L2Params calldata l2Params_) external whenNotPaused {
        address l2MessageReceiver = _deploy2(uint8(PoolType.L2_MESSAGE_RECEIVER), l2Params_.protocolName);
        address l2TokenReceiverProxy = _deploy2(uint8(PoolType.L2_TOKEN_RECEIVER), l2Params_.protocolName);

        address mor20 = address(
            new MOR20(
                l2Params_.mor20Name,
                l2Params_.mor20Symbol,
                lzExternalDeps.oftEndpoint,
                _msgSender(),
                l2MessageReceiver
            )
        );

        emit Mor20Deployed(mor20);

        IL2MessageReceiver(l2MessageReceiver).L2MessageReceiver__init(
            mor20,
            IL2MessageReceiver.Config(lzExternalDeps.endpoint, address(0), lzExternalDeps.senderChainId)
        );

        IL2TokenReceiverV2(l2TokenReceiverProxy).L2TokenReceiver__init(
            uniswapExternalDeps.router,
            uniswapExternalDeps.nonfungiblePositionManager
        );

        IOwnable(l2MessageReceiver).transferOwnership(_msgSender());
        IOwnable(l2TokenReceiverProxy).transferOwnership(_msgSender());
        IOwnable(mor20).transferOwnership(_msgSender());
    }
}
