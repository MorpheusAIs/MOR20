// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import {ISwapRouter} from "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import {TransferHelper} from "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";

import {IL2TokenReceiver, IERC165, IERC721Receiver} from "../interfaces/L2/IL2TokenReceiver.sol";
import {INonfungiblePositionManager} from "../interfaces/uniswap-v3/INonfungiblePositionManager.sol";

contract L2TokenReceiver is IL2TokenReceiver, OwnableUpgradeable {
    address public router;
    address public nonfungiblePositionManager;

    SwapParams public firstSwapParams;
    SwapParams public secondSwapParams;

    constructor() {
        _disableInitializers();
    }

    function L2TokenReceiver__init(
        address router_,
        address nonfungiblePositionManager_,
        SwapParams memory firstSwapParams_,
        SwapParams memory secondSwapParams_
    ) external initializer {
        __Ownable_init();

        router = router_;
        nonfungiblePositionManager = nonfungiblePositionManager_;

        _addAllowanceUpdateSwapParams(firstSwapParams_, true);
        _addAllowanceUpdateSwapParams(secondSwapParams_, false);
    }

    function supportsInterface(bytes4 interfaceId_) external pure returns (bool) {
        return
            interfaceId_ == type(IL2TokenReceiver).interfaceId ||
            interfaceId_ == type(IERC721Receiver).interfaceId ||
            interfaceId_ == type(IERC165).interfaceId;
    }

    function editParams(SwapParams memory newParams_, bool isEditFirstParams_) external onlyOwner {
        SwapParams memory params_ = _getSwapParams(isEditFirstParams_);

        if (params_.tokenIn != address(0) && params_.tokenIn != newParams_.tokenIn) {
            TransferHelper.safeApprove(params_.tokenIn, router, 0);
            TransferHelper.safeApprove(params_.tokenIn, nonfungiblePositionManager, 0);
        }

        if (params_.tokenOut != address(0) && params_.tokenOut != newParams_.tokenOut) {
            TransferHelper.safeApprove(params_.tokenOut, nonfungiblePositionManager, 0);
        }

        _addAllowanceUpdateSwapParams(newParams_, isEditFirstParams_);
    }

    function withdrawToken(address recipient_, address token_, uint256 amount_) external onlyOwner {
        TransferHelper.safeTransfer(token_, recipient_, amount_);
    }

    function withdrawTokenId(address recipient_, address token_, uint256 tokenId_) external onlyOwner {
        IERC721(token_).safeTransferFrom(address(this), recipient_, tokenId_);
    }

    function swap(
        uint256 amountIn_,
        uint256 amountOutMinimum_,
        uint256 deadline_,
        uint160 sqrtPriceLimitX96_,
        bool isUseFirstSwapParams_
    ) external onlyOwner returns (uint256) {
        SwapParams memory params_ = _getSwapParams(isUseFirstSwapParams_);

        ISwapRouter.ExactInputSingleParams memory swapParams_ = ISwapRouter.ExactInputSingleParams({
            tokenIn: params_.tokenIn,
            tokenOut: params_.tokenOut,
            fee: params_.fee,
            recipient: address(this),
            deadline: deadline_,
            amountIn: amountIn_,
            amountOutMinimum: amountOutMinimum_,
            sqrtPriceLimitX96: sqrtPriceLimitX96_
        });

        uint256 amountOut_ = ISwapRouter(router).exactInputSingle(swapParams_);

        emit TokensSwapped(params_.tokenIn, params_.tokenOut, amountIn_, amountOut_, amountOutMinimum_);

        return amountOut_;
    }

    function increaseLiquidityCurrentRange(
        uint256 tokenId_,
        uint256 amount0Add_,
        uint256 amount1Add_,
        uint256 amount0Min_,
        uint256 amount1Min_
    ) external onlyOwner returns (uint128 liquidity_, uint256 amount0_, uint256 amount1_) {
        INonfungiblePositionManager.IncreaseLiquidityParams memory params_ = INonfungiblePositionManager
            .IncreaseLiquidityParams({
                tokenId: tokenId_,
                amount0Desired: amount0Add_,
                amount1Desired: amount1Add_,
                amount0Min: amount0Min_,
                amount1Min: amount1Min_,
                deadline: block.timestamp
            });

        (liquidity_, amount0_, amount1_) = INonfungiblePositionManager(nonfungiblePositionManager).increaseLiquidity(
            params_
        );

        emit LiquidityIncreased(tokenId_, amount0_, amount1_, liquidity_, amount0Min_, amount1Min_);
    }

    function decreaseLiquidityCurrentRange(
        uint256 tokenId_,
        uint128 liquidity_,
        uint256 amount0Min_,
        uint256 amount1Min_
    ) external onlyOwner returns (uint256 amount0_, uint256 amount1_) {
        INonfungiblePositionManager.DecreaseLiquidityParams memory params_ = INonfungiblePositionManager
            .DecreaseLiquidityParams({
                tokenId: tokenId_,
                liquidity: liquidity_,
                amount0Min: amount0Min_,
                amount1Min: amount1Min_,
                deadline: block.timestamp
            });

        (amount0_, amount1_) = INonfungiblePositionManager(nonfungiblePositionManager).decreaseLiquidity(params_);

        collectFees(tokenId_);

        emit LiquidityDecreased(tokenId_, amount0_, amount1_, liquidity_, amount0Min_, amount1Min_);
    }

    function collectFees(uint256 tokenId_) public returns (uint256 amount0_, uint256 amount1_) {
        INonfungiblePositionManager.CollectParams memory params_ = INonfungiblePositionManager.CollectParams({
            tokenId: tokenId_,
            recipient: address(this),
            amount0Max: type(uint128).max,
            amount1Max: type(uint128).max
        });

        (amount0_, amount1_) = INonfungiblePositionManager(nonfungiblePositionManager).collect(params_);

        emit FeesCollected(tokenId_, amount0_, amount1_);
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }

    function _addAllowanceUpdateSwapParams(SwapParams memory newParams_, bool isEditFirstParams_) private {
        require(newParams_.tokenIn != address(0), "L2TR: invalid tokenIn");
        require(newParams_.tokenOut != address(0), "L2TR: invalid tokenOut");

        TransferHelper.safeApprove(newParams_.tokenIn, router, type(uint256).max);
        TransferHelper.safeApprove(newParams_.tokenIn, nonfungiblePositionManager, type(uint256).max);

        TransferHelper.safeApprove(newParams_.tokenOut, nonfungiblePositionManager, type(uint256).max);

        if (isEditFirstParams_) {
            firstSwapParams = newParams_;
        } else {
            secondSwapParams = newParams_;
        }
    }

    function _getSwapParams(bool isUseFirstSwapParams_) internal view returns (SwapParams memory) {
        return isUseFirstSwapParams_ ? firstSwapParams : secondSwapParams;
    }
}
