// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract CorePropertiesL2 is UUPSUpgradeable, OwnableUpgradeable {
    address public lZEnpointAddress;
    address public lZGatewayAddress;
    uint16 public l1ChainId;

    function __CorePropertiesL2_init(
        address lZEnpointAddress_,
        address lZGatewayAddress_,
        uint16 l1ChainId_
    ) external initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();

        lZEnpointAddress = lZEnpointAddress_;
        lZGatewayAddress = lZGatewayAddress_;
        l1ChainId = l1ChainId_;
    }

    function setDeployParams(
        address lZEnpointAddress_,
        address lZGatewayAddress_,
        uint16 l1ChainId_
    ) external onlyOwner {
        lZEnpointAddress = lZEnpointAddress_;
        lZGatewayAddress = lZGatewayAddress_;
        l1ChainId = l1ChainId_;
    }

    function getDeployParams() external view returns (address, address, uint16) {
        return (lZEnpointAddress, lZGatewayAddress, l1ChainId);
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}
