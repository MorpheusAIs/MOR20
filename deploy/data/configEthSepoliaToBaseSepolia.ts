const deployerAddress = '---'; // TODO
const payoutStart = new Date().getTime() / 1000 + 60 * 10; // now + 10 minutes

// https://sepolia.etherscan.io/address/0x384D86Aca164370F1Fa4f9cF96708A5b556027e4#code
const stEthL1 = '0x384D86Aca164370F1Fa4f9cF96708A5b556027e4';
// https://sepolia.etherscan.io/address/0xF38C4Ba6D14BA68Cf13a127F281ad420614eaBeB#code
const wstEthL1 = '0xF38C4Ba6D14BA68Cf13a127F281ad420614eaBeB';
// https://sepolia.basescan.org/address/0x04AcA9D9944CbEBF42297B307cb2E97bc51a35a9
const wstEthL2 = '0x04AcA9D9944CbEBF42297B307cb2E97bc51a35a9';

const pools = [
  {
    // 'Capital Providers',
    payoutStart,
    decreaseInterval: 60 * 60 * 2, // 2 hours
    withdrawLockPeriod: 60 * 60 * 1, // 1 hour
    claimLockPeriod: 60 * 10, // 10 minutes
    withdrawLockPeriodAfterStake: 60 * 5, // 5 minutes
    initialReward: '84013800000000000000000', // 84013.8 SPACE
    rewardDecrease: '14558684330869400000', // 72.793421654347 * 0.2 = 14.5586843308694 SPACE
    minimalStake: '10000000000000000', // 0.01 stETH
    isPublic: true,
  },
  {
    // 'Community',
    payoutStart,
    decreaseInterval: 60 * 60 * 2, // 2 hours
    withdrawLockPeriod: 60 * 60 * 1, // 1 hour
    claimLockPeriod: 60 * 10, // 10 minutes
    withdrawLockPeriodAfterStake: 60 * 5, // 5 minutes
    initialReward: '84013800000000000000000', // 84013.8 SPACE
    rewardDecrease: '14558684330869400000', // 72.793421654347 * 0.2 = 14.5586843308694 SPACE
    minimalStake: '10000000000000000', // 0.01 stETH
    isPublic: false,
  },
  {
    // 'Developers',
    payoutStart,
    decreaseInterval: 86400, // 1 day
    withdrawLockPeriod: 604800, // 7 days
    claimLockPeriod: 7776000, // 90 days
    withdrawLockPeriodAfterStake: 604800, // 7 days
    initialReward: '84013800000000000000000', // 84013.8 SPACE
    rewardDecrease: '14558684330869400000', // 72.793421654347 * 0.2 = 14.5586843308694 SPACE
    minimalStake: '10000000000000000', // 0.01 stETH
    isPublic: false,
  },
  {
    // 'Team',
    payoutStart,
    decreaseInterval: 86400, // 1 day
    withdrawLockPeriod: 604800, // 7 days
    claimLockPeriod: 7776000, // 90 days
    withdrawLockPeriodAfterStake: 604800, // 7 days
    initialReward: '84013800000000000000000', // 84013.8 SPACE
    rewardDecrease: '14558684330869400000', // 72.793421654347 * 0.2 = 14.5586843308694 SPACE
    minimalStake: '10000000000000000', // 0.01 stETH
    isPublic: false,
  },
  {
    // 'Users',
    payoutStart,
    decreaseInterval: 86400, // 1 day
    withdrawLockPeriod: 604800, // 7 days
    claimLockPeriod: 7776000, // 90 days
    withdrawLockPeriodAfterStake: 604800, // 7 days
    initialReward: '84013800000000000000000', // 84013.8 SPACE
    rewardDecrease: '14558684330869400000', // 72.793421654347 * 0.2 = 14.5586843308694 SPACE
    minimalStake: '10000000000000000', // 0.01 stETH
    isPublic: false,
  },
];

export const configEthSepoliaToBaseSepolia = {
  feeConfig: {
    baseFee: '350000000000000000000000000', // 0.35%
    treasury: '0x19ec1E4b714990620edf41fE28e9a1552953a7F4', // Custom address
  },
  depositTokenExternalDeps: {
    token: stEthL1, // Deployed stETH
    wToken: wstEthL1, // Deployed wstETH
  },
  // https://docs.layerzero.network/v1/developers/evm/technical-reference/testnet/testnet-addresses
  lzExternalDepsForL1: {
    endpoint: '0xae92d5aD7583AD66E49A0c67BAd18F6ba52dDDc1',
    zroPaymentAddress: '0x0000000000000000000000000000000000000000',
    adapterParams: '0x',
    destinationChainId: 10245,
  },
  baseExternalDeps: {
    endpoint: '0xB28e8A528a53984D369Bc07800916575Efeec15B', // Deployed L1ERC20TokenBridgeMock
    wTokenL2: wstEthL2,
  },
  // https://docs.layerzero.network/v1/developers/evm/technical-reference/testnet/testnet-addresses - Endpoint
  // https://docs.layerzero.network/v2/developers/evm/technical-reference/deployed-contracts - OFT endpoint
  lzExternalDepsForL2: {
    endpoint: '0x55370E0fBB5f5b8dAeD978BA1c075a499eB107B8',
    oftEndpoint: '0x6EDCE65403992e310A62460808c4b910D972f10f',
    senderChainId: 10161,
  },
  // https://docs.uniswap.org/contracts/v3/reference/deployments/base-deployments
  uniswapExternalDeps: {
    router: '0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4',
    nonfungiblePositionManager: '0x27F971cb582BF9E50F397e4d29a5C7A34f11faA2',
  },
  l1Params: {
    isUpgradeable: true,
    owner: deployerAddress, // TODO
    protocolName: 'Nounspace',
    poolsInfo: pools,
    l2TokenReceiver: '---', // TODO
    l2MessageReceiver: '---', // TODO
  },
  l2Params: {
    isUpgradeable: true,
    owner: deployerAddress, // TODO
    protocolName: 'Nounspace',
    mor20Name: 'Nounspace',
    mor20Symbol: 'SPACE',
    l1Sender: '---', // TODO
    firstSwapParams_: {
      tokenIn: wstEthL2,
      // https://basescan.org/address/0x4200000000000000000000000000000000000006
      tokenOut: '0x4200000000000000000000000000000000000006', // wETH
      fee: '3000', // 0.3% Uniswap fee
    },
    secondSwapFee: '3000', // 0.3% Uniswap fee
  },
  //END

  nonAutomatedUsers: [
    {
      poolId: 1, // Community
      users: [deployerAddress],
      amount: [1],
    },
    {
      poolId: 2, // Developers
      users: [deployerAddress],
      amount: [1],
    },
    {
      poolId: 3, // Team
      users: [deployerAddress],
      amount: [1],
    },
    {
      poolId: 4, // Users
      users: [deployerAddress],
      amount: [1],
    },
  ],
};
