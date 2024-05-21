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
    event ProxyDeployed(address proxy, address indexed implementation, string protocol, string poolType);

    /**
     * The function to freeze the specific pool.
     * @param protocol_ the name of the protocol.
     * @param poolType_ the type of the pool.
     */
    function freezePool(string memory protocol_, string memory poolType_) external;

    /**
     * The function to unfreeze the specific pool.
     * @param protocol_ the name of the protocol.
     * @param poolType_ the type of the pool.
     */
    function unfreezePool(string memory protocol_, string memory poolType_) external;

    /**
     * The function to set the implementation for the specific pool.
     * @param poolTypes_ The types of the pools.
     * @param implementations_ The new implementations pools will point to.
     */
    function setImplementations(string[] memory poolTypes_, address[] memory implementations_) external;

    /**
     * The function to get the number of protocols.
     * @param deployer_ the address of the deployer.
     * @return protocolsCount the number of protocols.
     */
    function countProtocols(address deployer_) external view returns (uint256);

    /**
     * The function to get the list of protocols.
     * @param deployer_ the address of the deployer.
     * @param offset_ the offset of the list.
     * @param limit_ the limit of the list.
     * @return protocols the list of the protocols.
     */
    function listProtocols(address deployer_, uint256 offset_, uint256 limit_) external view returns (string[] memory);

    /**
     * The function to get the deployed proxy pool.
     * @param deployer_ the deployer address.
     * @param protocol_ the name of the protocol.
     * @param poolType_ the type of the pool.
     * @return pool the deployed proxy pool.
     */
    function getProxyPool(
        address deployer_,
        string memory protocol_,
        string memory poolType_
    ) external view returns (address);

    /**
     * The function to get the implementation of the specific pools.
     * @param poolType_ The type of the pools.
     * @return The implementation which the pool points to.
     */
    function getImplementation(string memory poolType_) external view returns (address);

    /**
     * The function to get beacon of the specific pools.
     * @param poolType_ the type of the pools.
     * @return beacon the beacon which the pool points to.
     */
    function getBeacon(string memory poolType_) external view returns (address);
}
