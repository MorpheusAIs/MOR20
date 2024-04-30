# Overview

> [!NOTE]
> This documentation is for an early implementation of the MOR20 smart contracts, subject to change. Before conducting a Fair Launch, consider coordinating with other contributors in the [MOR20 chat](https://discord.com/channels/1151741790408429580/1228219372317966409) in the Morpheus Discord.

MOR20 is a standardized implementation of the Morpheus [Techno Capital Machine (TCM)](https://github.com/MorpheusAIs/Docs/blob/main/!KEYDOCS%20README%20FIRST!/TechnoCapitalMachineTCM.md) that can be used to fairly launch new projects while ensuring alignment with the Morpheus ethos and its community.

As in the case of Morpheus itself, a MOR20 token launch consists of an omnichain ERC20 token native to Layer 2 (Arbitrum), utilizing LayerZero's OFT token standard, as well as an Ethereum staking contract for Capital Providers on Layer 1 (Ethereum). Additional helper contracts are used for cross-chain communication and rewards calculation.

This design enables a fair token distribution among Capital providers (and other ecosystem participants), with yield from staked Ethereum used to bootstrap Protocol-Owned Liquidity (PoL).

## Architecture

A MOR20 deployment consists of the following contracts:

* `ERC20MOR` – the project's reward token
* `Distribution` – used to lock capital for the Techno Capital Machine and claim rewards
* `LinearDistributionIntervalDecrease` – a library for calculating rewards
* `L1Sender` – sends MOR minting requests; wraps and transfers stETH to Arbitrum
* `L2MessageReceiver` – receives and processes MOR minting requests on Arbitrum
* `L2TokenReceiverV2` – receives wstETH and manages Protocol-Owned Liquidity on Arbitrum

These contracts are functionally equivalent to those used by the Morpheus token itself. For more information, see the [Morpheus smart contract docs](https://github.com/MorpheusAIs/Docs/blob/main/Smart%20Contracts/Overview.md).

Deploying these contracts is made possible by the MOR20 factory contracts, `Mor20FactoryL1` and `Mor20FactoryL2`, which are managed by the Morpheus multi-sig. Universal settings for MOR20 deployments are configured in `FeeParams` and `CorePropertiesL2`.

## Fees

A percentage of stETH yield earned by MOR20 tokens is sent to the Morpheus treasury when excess yield is bridged to Arbitrum with the `bridgeOverplus()` method in the MOR20 token's `Distribution` contract.

The fee for each MOR20 token as well as the Morpheus treasury address are configured in `FeeParams` by the Morpheus multi-sig.

## Deployment

MOR20 contracts are deployed using the `Mor20FactoryL1` and `Mor20FactoryL2` factory contracts:

* `deployMor20OnL1` on `Mor20FactoryL1` deploys the `Distribution` and `L1Sender` contracts.
* `deployMor20OnL2` on `Mor20FactoryL2` deploys the `ERC20MOR` (the project's reward token), `L2MessageReceiver`, and `L2TokenReceiver` contracts.

These methods can be called in any order; however, before calling either method, the deployer should know the counterfactual deployment addresses of the second method, which can be calculated using `predictMor20Address`.

### Calldata

Both deployment methods take a singular struct. The address of the deployer and the `name` of the MOR20 token determine the salt for Create2 deployment; as a result, these must be constant across both chains.

#### `deployMor20OnL1`

```
struct Mor20DeployParams {
    string name; // name of the MOR20 token
    address depositToken; // address of the deposit token on L1 (stETH)
    IDistribution.Pool[] poolsInfo; // struct of initial pools
    address messageReceiver; // address of L2MessageReceiver
    address wrappedToken; // address of the wrapped deposit token on Ethereum (wsETH)
    address tokenReceiver; // address of L2TokenReceiver
}
```

#### `deployMor20OnL2`

```
struct Mor20DeployParams {
    string name; // name of the MOR20 token
    string symbol; // symbol of the MOR20 token
    address rewardToken; // address of the MOR20 token or zero address
    address rewardTokenDelegate; // owner of the MOR20 token
    address sender; // address of L1Sender
    uint16 senderChainId; // LayerZero chain ID for L1 (30101)
    address router_; // address of the Uniswap V3 router
    address nonfungiblePositionManager_; // address of the Uniswap V3 position manager
    IL2TokenReceiver.SwapParams firstSwapParams_; // swap parameters for the wstETH/WETH pair
    IL2TokenReceiver.SwapParams secondSwapParams; // swap parameters for the MOR20/WETH pair
}
```

### Example Sequence

1. Call `Mor20FactoryL2.predictMor20Address(msg.sender, "Example")` to determine the counterfactual addresses for the `ERC20MOR` (the project's reward token), `L2MessageReceiver`, and `L2TokenReceiver` contracts.
2. Call `Mor20FactoryL1.deployMor20OnL1` to deploy the `Distribution` and `L1Sender` contracts.
3. Call `Mor20FactoryL1.deployMor20OnL2` to deploy the `ERC20MOR` (the project's reward token), `L2MessageReceiver`, and `L2TokenReceiver` contracts.

For in-depth deployment guidance, see the [Deployment Guide](/Deployment%20Guide.md)

## Contract Addresses

Coming soon. In the meantime, join the [MOR20 chat](https://discord.com/channels/1151741790408429580/1228219372317966409) in the Morpheus Discord.