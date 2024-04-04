// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {BaseFactoryL1} from "./BaseFactoryL1.sol";
import {CorePropertiesL1} from "./CorePropertiesL1.sol";

import {IDistribution} from "../interfaces/IDistribution.sol";
import {IL1Sender} from "../interfaces/IL1Sender.sol";

contract Mor20FactoryL1 is BaseFactoryL1, Ownable {
    CorePropertiesL1 public coreProperties;

    struct Mor20DeployParams {
        string name;
        address depositToken;
        IDistribution.Pool[] poolsInfo;
        //////
        address messageReceiver;
        address zroPaymentAddress;
        uint16 l2EndpointId;
        bytes adapterParams;
        //////
        address wrappedToken;
        address tokenReceiver;
    }

    event Mor20Deployed(string name, address distribution, address l1Sender);

    constructor(address coreProperties_) {
        coreProperties = CorePropertiesL1(coreProperties_);
    }

    function deployMor20OnL1(Mor20DeployParams calldata parameters) external onlyOwner {
        (address arbitrumGateway_, address lZEnpointAddress_) = coreProperties.getDeployParams();

        address distributionAddress_ = _deploy2(PoolType.DISTRIBUTION, parameters.name);

        address l1SenderAddress_ = _deploy2(PoolType.L1_SENDER, parameters.name);

        IDistribution(distributionAddress_).Distribution_init(
            parameters.depositToken,
            l1SenderAddress_,
            parameters.poolsInfo
        );

        IL1Sender(l1SenderAddress_).L1Sender__init(
            distributionAddress_,
            IL1Sender.RewardTokenConfig(
                lZEnpointAddress_,
                parameters.messageReceiver,
                parameters.l2EndpointId,
                parameters.zroPaymentAddress,
                parameters.adapterParams
            ),
            IL1Sender.DepositTokenConfig(parameters.wrappedToken, arbitrumGateway_, parameters.tokenReceiver)
        );

        _addDistribution(distributionAddress_);

        _updateSalt(parameters.name);

        emit Mor20Deployed(parameters.name, distributionAddress_, l1SenderAddress_);
    }

    function setNewImplementations(
        PoolType[] memory poolTypes_,
        address[] calldata newImplementations_
    ) external onlyOwner {
        _setNewImplementations(poolTypes_, newImplementations_);
    }
}
