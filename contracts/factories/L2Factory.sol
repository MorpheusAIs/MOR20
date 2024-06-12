// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IL2MessageReceiver} from "../interfaces/L2/IL2MessageReceiver.sol";
import {IL2TokenReceiver} from "../interfaces/L2/IL2TokenReceiver.sol";
import {IL2Factory} from "../interfaces/factories/IL2Factory.sol";
import {IOwnable} from "../interfaces/utils/IOwnable.sol";
import {IFreezableBeaconProxy} from "../interfaces/proxy/IFreezableBeaconProxy.sol";

import {Factory} from "./Factory.sol";
import {MOR20Deployer} from "../libs/MOR20Deployer.sol";

contract L2Factory is IL2Factory, Factory {
    string public constant L2_MESSAGE_RECEIVER_POOL = "L2_MESSAGE_RECEIVER";
    string public constant L2_TOKEN_RECEIVER_POOL = "L2_TOKEN_RECEIVER";

    UniswapExternalDeps public uniswapExternalDeps;
    LzExternalDeps public lzExternalDeps;

    mapping(address deployer => mapping(string protocol => address)) private _mor20;

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
        _registerProtocol(l2Params_.protocolName);

        address l2MessageReceiver_ = _deploy2(l2Params_.protocolName, L2_MESSAGE_RECEIVER_POOL, getL2Network());
        address l2TokenReceiver_ = _deploy2(l2Params_.protocolName, L2_TOKEN_RECEIVER_POOL, getL2Network());

        address mor20_ = MOR20Deployer.deployMOR20(
            l2Params_.mor20Name,
            l2Params_.mor20Symbol,
            lzExternalDeps.oftEndpoint,
            l2Params_.owner,
            l2MessageReceiver_
        );
        _mor20[_msgSender()][l2Params_.protocolName] = mor20_;

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

        IOwnable(l2MessageReceiver_).transferOwnership(l2Params_.owner);
        IOwnable(l2TokenReceiver_).transferOwnership(l2Params_.owner);
    }

    function predictAddresses(
        address deployer_,
        string calldata protocol_
    ) external view returns (address l2MessageReceiver_, address l2TokenReceiver_) {
        l2MessageReceiver_ = _predictPoolAddress(deployer_, protocol_, L2_MESSAGE_RECEIVER_POOL, getL2Network());
        l2TokenReceiver_ = _predictPoolAddress(deployer_, protocol_, L2_TOKEN_RECEIVER_POOL, getL2Network());
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
                l2MessageReceiver: getProxyPool(deployer_, protocol_, L2_MESSAGE_RECEIVER_POOL),
                l2TokenReceiver: getProxyPool(deployer_, protocol_, L2_TOKEN_RECEIVER_POOL),
                mor20: _mor20[deployer_][protocol_]
            });
        }
    }

    function getMor20(address deployer_, string calldata protocol_) external view returns (address) {
        return _mor20[deployer_][protocol_];
    }

    function getL2Network() public pure virtual returns (string memory) {
        return "";
    }
}
