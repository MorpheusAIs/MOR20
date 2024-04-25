// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {BaseFactoryL1} from "./BaseFactoryL1.sol";

import {IDistribution} from "../interfaces/IDistribution.sol";
import {IL1Sender} from "../interfaces/IL1Sender.sol";

contract Mor20FactoryL1 is BaseFactoryL1, Ownable {
    address public arbitrumGateway;

    address public lZEnpointAddress; // L1
    uint256 public destinationChainId; // arbitrum

    address zroPaymentAddress; // LZ
    uint16 l2EndpointId;
    bytes adapterParams;

    constructor(address arbitrumGateway_, address lZEnpointAddress_, uint256 destinationChainId_) {
        arbitrumGateway = arbitrumGateway_;
        lZEnpointAddress = lZEnpointAddress_;
        destinationChainId = destinationChainId_;
    }

    function deployMor20OnL1(Mor20DeployParams calldata parameters_) external onlyOwner {
        address distributionAddress_ = _deploy2(PoolType.DISTRIBUTION, parameters_.name);

        address l1SenderAddress_ = _deploy2(PoolType.L1_SENDER, parameters_.name);

        IDistribution(distributionAddress_).Distribution_init(
            parameters_.depositToken,
            l1SenderAddress_,
            parameters_.poolsInfo
        );

        IL1Sender(l1SenderAddress_).L1Sender__init(
            distributionAddress_,
            IL1Sender.RewardTokenConfig(
                lZEnpointAddress,
                parameters_.messageReceiver,
                l2EndpointId,
                zroPaymentAddress,
                adapterParams
            ),
            IL1Sender.DepositTokenConfig(parameters_.wrappedToken, arbitrumGateway, parameters_.tokenReceiver)
        );

        _addPool(PoolType.DISTRIBUTION, parameters_.name, distributionAddress_);
        _addPool(PoolType.L1_SENDER, parameters_.name, distributionAddress_);

        emit Mor20Deployed(parameters_.name, distributionAddress_, l1SenderAddress_);
    }

    function setDeployParams(
        address arbitrumGateway_,
        address lZEnpointAddress_,
        uint256 destinationChainId_
    ) external onlyOwner {
        arbitrumGateway = arbitrumGateway_;
        lZEnpointAddress = lZEnpointAddress_;
        destinationChainId = destinationChainId_;
    }

    function predictMor20Address(
        address deployer_,
        string calldata mor20Name_
    ) external view returns (Mor20PredictedAddressesL1 memory predictedAddresses_) {
        if (bytes(mor20Name_).length == 0) {
            return predictedAddresses_;
        }

        bytes32 poolSalt_ = _calculatePoolSalt(deployer_, mor20Name_);

        return
            Mor20PredictedAddressesL1(
                _predictPoolAddress(PoolType.DISTRIBUTION, poolSalt_),
                _predictPoolAddress(PoolType.L1_SENDER, poolSalt_)
            );
    }
}
