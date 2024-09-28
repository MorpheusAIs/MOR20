# Deployment Guide

> [!NOTE]
> This documentation is for an early implementation of the MOR20 smart contracts, subject to change. Before conducting a Fair Launch, consider coordinating with other contributors in the [MOR20 chat](https://discord.com/channels/1151741790408429580/1228219372317966409) in the Morpheus Discord.

This guide outlines the steps involved in deploying a MOR20 token.

## Predicting L2 Addresses

Before deploying the L1 contracts, determine the counterfactual addresses for the `ERC20MOR` (the project's reward token), `L2MessageReceiver`, and `L2TokenReceiver` contracts:

```
Mor20FactoryL2.predictMor20Address(msg.sender, "Example")
```

This returns a struct of the three addreses:

```
struct Mor20PredictedAddressesL2 {
    address l2MessageReceiver;
    address l2TokenReceiver;
    address rewardToken;
}
```

## Deploying L1 Contracts

To deploy the `Distribution` and `L1Sender` contracts on L1, call `Mor20FactoryL1.deployMor20OnL1`, passing a Mor20DeployParams struct. For example:

```
Mor20FactoryL1.deployMor20OnL1({
    "Example", // name of the MOR20 token
    0xae7ab96520de3a18e5e111b5eaab095312d7fe84, // address of the deposit token on L1 i.e. stETH
    [], // optional array of initial pools
    l2MessageReceiver, // address of L2MessageReceiver
    0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0,  // address of the wrapped deposit token on Ethereum i.e. wsETH
    l2TokenReceiver // address of L2TokenReceiver
})
```

## Deploying L2 Contracts

Similarly, to deploy the `ERC20MOR`, `L2MessageReceiver`, and `L2TokenReceiver` contracts on L2, call `Mor20FactoryL2.deployMor20OnL2`, passing a Mor20DeployParams struct. For example:

```
Mor20FactoryL2.deployMor20OnL2({
    "Example", // name of the MOR20 token
    "EXAM", // symbol of the MOR20 token
    "0x0000000000000000000000000000000000000000", // address of the MOR20 token or zero address
    wallet.address, // owner of the MOR20 token
    L1Sender, // address of L1Sender
    30101, // LayerZero chain ID for L1 (30101)
    "0xe592427a0aece92de3edee1f18e0157c05861564", // address of the Uniswap V3 router
    "0xC36442b4a4522E871399CD717aBDD847Ab11FE88", // address of the Uniswap V3 position manager
    {TBD}, // swap parameters for the wstETH/WETH pair
    {TBD} // swap parameters for the MOR20/WETH pair
})
```

## Next Steps

In addition to deploying MOR20 contracts, the factory contracts also call the respective `_init` methods on each contract deployed. As a result, the only step that remains after deployment is to configure pools on `Distribution`.

Pools can be configured by calling the `createPool` or `editPool` methods as described in the [documentation for the Morpheus deployment of `Distribution`](https://github.com/MorpheusAIs/Docs/blob/main/Smart%20Contracts/Distribution.md).