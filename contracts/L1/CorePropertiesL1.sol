// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract CorePropertiesL1 is UUPSUpgradeable, OwnableUpgradeable {
    address public arbitrumGateway;
    address public treasuryAddress;

    address public lZEnpointAddress; // L1
    uint256 public destinationChainId; // arbitrum

    mapping(address => uint256) private _fees;

    function __CorePropertiesL1_init(
        address arbitrumGateway_,
        address treasuryAddress_,
        address lZEnpointAddress_,
        uint256 destinationChainId_
    ) external initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();

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

    function setDeployParams(
        address arbitrumGateway_,
        address lZEnpointAddress_,
        uint256 destinationChainId_
    ) external onlyOwner {
        arbitrumGateway = arbitrumGateway_;
        lZEnpointAddress = lZEnpointAddress_;
        destinationChainId = destinationChainId_;
    }

    function getFeeAndTreasury(address distributionAddress_) external view returns (uint256, address) {
        return (_fees[distributionAddress_], treasuryAddress);
    }

    function getDeployParams() external view returns (address, address) {
        return (arbitrumGateway, lZEnpointAddress);
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}
