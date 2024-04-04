// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract CorePropertiesL1 is Ownable {
    address public arbitrumGateway;
    address public treasuryAddress;

    address public lZEnpointAddress; // L1
    uint256 public destinationChainId; // arbitrum

    mapping(address => uint256) private _fees;

    constructor(
        address arbitrumGateway_,
        address treasuryAddress_,
        address lZEnpointAddress_,
        uint256 destinationChainId_
    ) {
        arbitrumGateway = arbitrumGateway_;
        treasuryAddress = treasuryAddress_;
        lZEnpointAddress = lZEnpointAddress_;
        destinationChainId = destinationChainId_;
    }

    function setFee(address token_, uint256 fee_) external onlyOwner {
        _fees[token_] = fee_;
    }

    function setTreasuryAddress(address treasuryAddress_) external onlyOwner {
        treasuryAddress = treasuryAddress_;
    }

    function getFeeAndTreadury(address distributionAddress_) external view returns (uint256, address) {
        return (_fees[distributionAddress_], treasuryAddress);
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

    function getDeployParams() external view returns (address, address) {
        return (arbitrumGateway, lZEnpointAddress);
    }
}
