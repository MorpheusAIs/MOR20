// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IFactory {
    /**
     * The event is emitted when the proxy is deployed.
     * @param proxy The proxy address.
     * @param implementation The implementation.
     * @param protocol The `protocol`.
     * @param poolType The `poolType`.
     */
    event ProxyDeployed(address proxy, address indexed implementation, string protocol, uint8 indexed poolType);

    /**
     * The function to freeze the specific pool.
     * @param protocol_ the name of the protocol.
     * @param poolType_ the type of the pool.
     */
    function freezePool(string calldata protocol_, uint8 poolType_) external;

    /**
     * The function to unfreeze the specific pool.
     * @param protocol_ the name of the protocol.
     * @param poolType_ the type of the pool.
     */
    function unfreezePool(string calldata protocol_, uint8 poolType_) external;

    /**
     * The function to set the implementation for the specific pool.
     * @param poolTypes_ The types of the pools.
     * @param implementations_ The new implementations pools will point to.
     */
    function setImplementations(uint8[] calldata poolTypes_, address[] calldata implementations_) external;

    /**
     * The function to get the implementation of the specific pools.
     * @param poolType_ The type of the pools.
     * @return The implementation which the pool points to.
     */
    function getImplementation(uint8 poolType_) external view returns (address);

    /**
     * The function to get beacon of the specific pools.
     * @param poolType_ the type of the pools.
     * @return beacon the beacon which the pool points to.
     */
    function getBeacon(uint8 poolType_) external view returns (address);
}
