// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IFactory {
    /**
     * The event is emitted when the proxy is deployed.
     * @param proxy The proxy address.
     * @param implementation The implementation.
     * @param poolType The `poolType`.
     * @param poolName The `poolName`.
     */
    event ProxyDeployed(address proxy, address indexed implementation, uint8 indexed poolType, string poolName);

    /**
     * The function to set the implementation for the specific pool.
     * @param poolType_ The type of the pool.
     * @param implementation_ The implementation the pool will point to.
     */
    function setImplementation(uint8 poolType_, address implementation_) external;

    /**
     * The function to get the implementation of the specific pools.
     * @param poolType_ The type of the pools.
     * @return The implementation which the pool points to.
     */
    function getImplementation(uint8 poolType_) external view returns (address);
}
