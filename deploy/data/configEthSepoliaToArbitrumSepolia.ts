const deployerAddress = '0x19ec1E4b714990620edf41fE28e9a1552953a7F4'; // Custom address
const payoutStart = Math.round(new Date().getTime() / 1000 + 60 * 10); // now + 10 minutes

// https://sepolia.etherscan.io/address/0x384D86Aca164370F1Fa4f9cF96708A5b556027e4#code
const stEthL1 = '0x384D86Aca164370F1Fa4f9cF96708A5b556027e4';
// https://sepolia.etherscan.io/address/0xF38C4Ba6D14BA68Cf13a127F281ad420614eaBeB#code
const wstEthL1 = '0xF38C4Ba6D14BA68Cf13a127F281ad420614eaBeB';
// https://sepolia.arbiscan.io/address/0xe2442c0b85e13d3a207cb0e35b884ab2df329165#code
const wstEthL2 = '0xe2442c0b85e13D3a207Cb0e35B884Ab2DF329165';

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
  // {
  //   // 'Community',
  //   payoutStart,
  //   decreaseInterval: 60 * 60 * 2, // 2 hours
  //   withdrawLockPeriod: 60 * 60 * 1, // 1 hour
  //   claimLockPeriod: 60 * 10, // 10 minutes
  //   withdrawLockPeriodAfterStake: 60 * 5, // 5 minutes
  //   initialReward: '84013800000000000000000', // 84013.8 SPACE
  //   rewardDecrease: '14558684330869400000', // 72.793421654347 * 0.2 = 14.5586843308694 SPACE
  //   minimalStake: '10000000000000000', // 0.01 stETH
  //   isPublic: false,
  // },
  // {
  //   // 'Developers',
  //   payoutStart,
  //   decreaseInterval: 86400, // 1 day
  //   withdrawLockPeriod: 604800, // 7 days
  //   claimLockPeriod: 7776000, // 90 days
  //   withdrawLockPeriodAfterStake: 604800, // 7 days
  //   initialReward: '84013800000000000000000', // 84013.8 SPACE
  //   rewardDecrease: '14558684330869400000', // 72.793421654347 * 0.2 = 14.5586843308694 SPACE
  //   minimalStake: '10000000000000000', // 0.01 stETH
  //   isPublic: false,
  // },
  // {
  //   // 'Team',
  //   payoutStart,
  //   decreaseInterval: 86400, // 1 day
  //   withdrawLockPeriod: 604800, // 7 days
  //   claimLockPeriod: 7776000, // 90 days
  //   withdrawLockPeriodAfterStake: 604800, // 7 days
  //   initialReward: '84013800000000000000000', // 84013.8 SPACE
  //   rewardDecrease: '14558684330869400000', // 72.793421654347 * 0.2 = 14.5586843308694 SPACE
  //   minimalStake: '10000000000000000', // 0.01 stETH
  //   isPublic: false,
  // },
  // {
  //   // 'Users',
  //   payoutStart,
  //   decreaseInterval: 86400, // 1 day
  //   withdrawLockPeriod: 604800, // 7 days
  //   claimLockPeriod: 7776000, // 90 days
  //   withdrawLockPeriodAfterStake: 604800, // 7 days
  //   initialReward: '84013800000000000000000', // 84013.8 SPACE
  //   rewardDecrease: '14558684330869400000', // 72.793421654347 * 0.2 = 14.5586843308694 SPACE
  //   minimalStake: '10000000000000000', // 0.01 stETH
  //   isPublic: false,
  // },
];

export const configEthSepoliaToArbitrumSepolia = {
  feeConfig: {
    baseFee: '3500000000000000000000000', // 0.35%
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
    destinationChainId: 10231,
  },
  arbitrumExternalDeps: {
    endpoint: '0xcE18836b233C83325Cc8848CA4487e94C6288264',
  },
  // https://docs.layerzero.network/v1/developers/evm/technical-reference/testnet/testnet-addresses - Endpoint
  // https://docs.layerzero.network/v2/developers/evm/technical-reference/deployed-contracts - OFT endpoint
  lzExternalDepsForL2: {
    endpoint: '0xae92d5aD7583AD66E49A0c67BAd18F6ba52dDDc1',
    oftEndpoint: '0x6EDCE65403992e310A62460808c4b910D972f10f',
    senderChainId: 10161,
  },
  // https://docs.uniswap.org/contracts/v3/reference/deployments/arbitrum-deployments
  uniswapExternalDeps: {
    router: '0x101F443B4d1b059569D643917553c771E1b9663E',
    nonfungiblePositionManager: '0x6b2937Bde17889EDCf8fbD8dE31C3C2a70Bc4d65',
  },
  l1Params: {
    isUpgradeable: true,
    owner: deployerAddress, // TODO
    protocolName: 'Nounspace',
    poolsInfo: pools,
    l2TokenReceiver: '', // TODO
    l2MessageReceiver: '', // TODO
  },
  l2Params: {
    isUpgradeable: true,
    owner: deployerAddress, // TODO
    protocolName: 'Nounspace',
    mor20Name: 'Nounspace',
    mor20Symbol: 'SPACE',
    l1Sender: '', // TODO
    firstSwapParams_: {
      tokenIn: wstEthL2,
      // https://sepolia.arbiscan.io/address/0x980B62Da83eFf3D4576C647993b0c1D7faf17c73
      tokenOut: '0x980b62da83eff3d4576c647993b0c1d7faf17c73', // wETH
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
