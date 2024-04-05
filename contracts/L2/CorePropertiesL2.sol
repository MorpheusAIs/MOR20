// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract CorePropertiesL2 is Ownable {
    address public lZEnpointAddress;
    address public lZGatewayAddress;
    uint16 public l1ChainId;

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
}
