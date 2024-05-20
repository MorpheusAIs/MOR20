// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ILayerZeroEndpoint} from "@layerzerolabs/lz-evm-sdk-v1-0.7/contracts/interfaces/ILayerZeroEndpoint.sol";

import {IGatewayRouter} from "@arbitrum/token-bridge-contracts/contracts/tokenbridge/libraries/gateway/IGatewayRouter.sol";

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import {IWStETH} from "../interfaces/tokens/IWStETH.sol";
import {IL1Sender, IERC165} from "../interfaces/L1/IL1Sender.sol";

contract L1Sender is IL1Sender, OwnableUpgradeable {
    address public unwrappedDepositToken;
    address public distribution;

    DepositTokenConfig public depositTokenConfig;
    RewardTokenConfig public rewardTokenConfig;

    modifier onlyDistribution() {
        require(_msgSender() == distribution, "L1S: invalid sender");
        _;
    }

    constructor() {
        _disableInitializers();
    }

    function L1Sender__init(
        address distribution_,
        RewardTokenConfig calldata rewardTokenConfig_,
        DepositTokenConfig calldata depositTokenConfig_
    ) external initializer {
        __Ownable_init();

        distribution = distribution_;
        rewardTokenConfig = rewardTokenConfig_;
        _setDepositTokenConfig(depositTokenConfig_);
    }

    function supportsInterface(bytes4 interfaceId_) external pure returns (bool) {
        return interfaceId_ == type(IL1Sender).interfaceId || interfaceId_ == type(IERC165).interfaceId;
    }

    function setRewardTokenLZParams(address zroPaymentAddress_, bytes calldata adapterParams_) external onlyOwner {
        rewardTokenConfig.zroPaymentAddress = zroPaymentAddress_;
        rewardTokenConfig.adapterParams = adapterParams_;
    }

    function _setDepositTokenConfig(DepositTokenConfig calldata newConfig_) private {
        require(newConfig_.receiver != address(0), "L1S: invalid receiver");

        _setDepositToken(newConfig_.token);
        _setDepositTokenGateway(newConfig_.gateway, newConfig_.token);

        depositTokenConfig = newConfig_;
    }

    function _setDepositToken(address newToken_) private {
        // Get stETH from wstETH
        address unwrappedToken_ = IWStETH(newToken_).stETH();
        // Increase allowance from stETH to wstETH. To exchange stETH for wstETH
        IERC20(unwrappedToken_).approve(newToken_, type(uint256).max);

        unwrappedDepositToken = unwrappedToken_;
    }

    function _setDepositTokenGateway(address newGateway_, address newToken_) private {
        IERC20(newToken_).approve(IGatewayRouter(newGateway_).getGateway(newToken_), type(uint256).max);
    }

    function sendDepositToken(
        uint256 gasLimit_,
        uint256 maxFeePerGas_,
        uint256 maxSubmissionCost_
    ) external payable onlyDistribution returns (bytes memory) {
        DepositTokenConfig storage config = depositTokenConfig;

        // Get current stETH balance
        uint256 amountUnwrappedToken_ = IERC20(unwrappedDepositToken).balanceOf(address(this));
        // Wrap all stETH to wstETH
        uint256 amount_ = IWStETH(config.token).wrap(amountUnwrappedToken_);

        bytes memory data_ = abi.encode(maxSubmissionCost_, "");

        return
            IGatewayRouter(config.gateway).outboundTransfer{value: msg.value}(
                config.token,
                config.receiver,
                amount_,
                gasLimit_,
                maxFeePerGas_,
                data_
            );
    }

    function sendMintMessage(address user_, uint256 amount_, address refundTo_) external payable onlyDistribution {
        RewardTokenConfig storage config = rewardTokenConfig;

        bytes memory receiverAndSenderAddresses_ = abi.encodePacked(config.receiver, address(this));
        bytes memory payload_ = abi.encode(user_, amount_);

        ILayerZeroEndpoint(config.gateway).send{value: msg.value}(
            config.receiverChainId, // communicator LayerZero chainId
            receiverAndSenderAddresses_, // send to this address to the communicator
            payload_, // bytes payload
            payable(refundTo_), // refund address
            config.zroPaymentAddress, // future parameter
            config.adapterParams // adapterParams (see "Advanced Features")
        );
    }
}
