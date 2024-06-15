# MOR20 Fair Launch Standard
MOR20 is the generalized version of the Morpheus Capital Smart Contracts available for community use.

![MOR20Proven](https://github.com/MorpheusAIs/MOR20/assets/1563345/af6e09d7-b03b-491b-8b08-72b8d380eac2)

## MOR20 Basics
- Any project inside or even outside the context of Web3 & AI, can use MOR20 to bootstrap their project with the click of a button.
  
- The use of MOR20 Smart Contracts to collect yield-generating assets creates Automated Recurring Revenue (ARR), which is compelling for both projects and capital providers.
  
- Easy creation of fair launch for projects, fair price discovery mechanism and access the large network effect of the Morpheus community.
  
- The model can be extended to many software as a service projects as a means of building recurring revenue / payments from users via yield.
  
- stETH is currently generating about 3.5% yield APR. Of that 3.5%, the MOR20 platform keeps 0.35% with the remaining 3.15% yield flowing to a project that use MOR20 Smart Contracts.
  
- This yield collected is added to the Morpheus Protocol owned Liquidity and provides on going support for ecosystem.
  
- This adds to the Network Effect of Morpheus when it comes to bootstraping new projects, growing liquidity for all MOR20 Smart Contract users.

## Introduction
Morpheus introduced the Techno Capital Machine (TCM) to revolutionize how developers are rewarded for their software. TCM automates infrastructure and payments and is central to Morpheus's Fair Launch approach. The TCM model, validated with over $500 million in capital contributions, simplifies the creation of native tokens and supports long-term project development through Protocol owned Liquidity and fair price discovery mechanism. Morpheus's open-source MOR20 smart contracts enable easy, permissionless project launches, fostering a frictionless environment for decentralized and open-source innovation.


## MOR20 Smart Contracts
As in the case of Morpheus itself, a MOR20 token launch consists of an omnichain ERC20 token (Arbitrum, Ethereum, Base), utilizing LayerZero's OFT token standard, as well as an Ethereum staking contract for Capital Providers (stETH) on Layer 1 (Ethereum). Additional helper contracts are used for cross-chain communication and rewards calculation. Projects that launch using MOR20 can use other chain combinations.

This design enables a fair token distribution among Capital providers (and other ecosystem participants), with yield from staked Ethereum used to create Protocol-Owned Liquidity (PoL).


### Contracts Architecture
A MOR20 deployment consists of the following contracts:

* `ERC20MOR` – the project's reward token
* `Distribution` – used to lock capital for the Techno Capital Machine and claim rewards
* `LinearDistributionIntervalDecrease` – a library for calculating rewards
* `L1Sender` – sends MOR minting requests; wraps and transfers stETH to Arbitrum
* `L2MessageReceiver` – receives and processes MOR minting requests on Arbitrum
* `L2TokenReceiverV2` – receives wstETH and manages Protocol-Owned Liquidity on Arbitrum

These contracts are functionally equivalent to those used by the Morpheus token itself. For more information, see the [Morpheus smart contract docs](https://github.com/MorpheusAIs/Docs/blob/main/Smart%20Contracts/Overview.md).

### Contracts Deployment
MOR20 contracts are deployed using the `Mor20FactoryL1` and `Mor20FactoryL2` factory contracts:

* `deployMor20OnL1` on `Mor20FactoryL1` deploys the `Distribution` and `L1Sender` contracts.
* `deployMor20OnL2` on `Mor20FactoryL2` deploys the `ERC20MOR` (the project's reward token), `L2MessageReceiver`, and `L2TokenReceiver` contracts.

These methods can be called in any order; however, before calling either method, the deployer should know the counterfactual deployment addresses of the second method, which can be calculated using `predictMor20Address`.


## Links
- [MOR20 website](https://mor.org/MOR20)
- [MOR20 Discord channel](https://discord.com/channels/1151741790408429580/1228219372317966409)
- [MOR20 Security Audit](https://github.com/user-attachments/files/15831583/MOR20-audit-final.pdf)
- [Techno Capital Machince document](https://github.com/MorpheusAIs/Docs/blob/main/!KEYDOCS%20README%20FIRST!/Capital%20Providers%2C%20MOR20%2C%20TCM/Techno%20Capital%20Machine%20(TCM).md)
- [AMM Liquidity Deployment and Fair Price Discovery](https://github.com/MorpheusAIs/Docs/blob/main/!KEYDOCS%20README%20FIRST!/Capital%20Providers%2C%20MOR20%2C%20TCM/Phased%20AMM%20Deployment%20and%20Fair%20Price%20Discovery.md) 
- [MOR20 Token Launch Lessons and Tips](https://github.com/MorpheusAIs/Docs/blob/main/!KEYDOCS%20README%20FIRST!/Capital%20Providers%2C%20MOR20%2C%20TCM/MOR20%20Token%20Launch%20Guide%2C%20Lessons%20and%20Tips.md)


