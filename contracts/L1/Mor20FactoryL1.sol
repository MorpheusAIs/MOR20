// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {BaseFactoryL1} from "./BaseFactoryL1.sol";
import {CorePropertiesL1} from "./CorePropertiesL1.sol";

import {IDistribution} from "../interfaces/IDistribution.sol";
import {IL1Sender} from "../interfaces/IL1Sender.sol";

contract Mor20FactoryL1 is BaseFactoryL1, Ownable {
    CorePropertiesL1 public coreProperties;

    constructor(address coreProperties_) {
        coreProperties = CorePropertiesL1(coreProperties_);
    }

    function deployMor20OnL1(Mor20DeployParams calldata parameters_) external onlyOwner {
        (address arbitrumGateway_, address lZEnpointAddress_) = coreProperties.getDeployParams();

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
                lZEnpointAddress_,
                parameters_.messageReceiver,
                parameters_.l2EndpointId,
                parameters_.zroPaymentAddress,
                parameters_.adapterParams
            ),
            IL1Sender.DepositTokenConfig(parameters_.wrappedToken, arbitrumGateway_, parameters_.tokenReceiver)
        );

        _addDistribution(distributionAddress_);

        _updateSalt(parameters_.name);

        emit Mor20Deployed(parameters_.name, distributionAddress_, l1SenderAddress_);
    }

    function setNewImplementations(
        uint8[] memory poolTypes_,
        address[] calldata newImplementations_
    ) external onlyOwner {
        _setNewImplementations(poolTypes_, newImplementations_);
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
