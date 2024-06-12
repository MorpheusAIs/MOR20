// https://etherscan.io/address/0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84
const stEthL1 = '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84';
// https://etherscan.io/address/0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0
const wstEthL1 = '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0';
// https://basescan.org/address/0xc1cba3fcea344f92d9239c08c0568f6f2f0ee452
const wstEthL2 = '0xc1cba3fcea344f92d9239c08c0568f6f2f0ee452';

const pools = [
  {
    // 'Capital Providers',
    payoutStart: 1718370660, // Friday, 14 June 2024, 13:11:00 GMT +0
    decreaseInterval: 86400, // 1 day
    withdrawLockPeriod: 604800, // 7 days
    claimLockPeriod: 7776000, // 90 days
    withdrawLockPeriodAfterStake: 604800, // 7 days
    initialReward: '84013800000000000000000', // 84013.8 SPACE
    rewardDecrease: '14558684330869400000', // 72.793421654347 * 0.2 = 14.5586843308694 SPACE
    minimalStake: '10000000000000000', // 0.01 stETH
    isPublic: true,
  },
  {
    // 'Community',
    payoutStart: 1718370660, // Friday, 14 June 2024, 13:11:00 GMT +0
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
    // 'Developers',
    payoutStart: 1718370660, // Friday, 14 June 2024, 13:11:00 GMT +0
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
    payoutStart: 1718370660, // Friday, 14 June 2024, 13:11:00 GMT +0
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
    payoutStart: 1718370660, // Friday, 14 June 2024, 13:11:00 GMT +0
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

export const configEthToBase = {
  // FACTORY
  feeConfig: {
    baseFee: '350000000000000000000000000', // 0.35%
    // https://etherscan.io/address/0x47176B2Af9885dC6C4575d4eFd63895f7Aaa4790
    treasury: '0x47176B2Af9885dC6C4575d4eFd63895f7Aaa4790', // Distribution contract address
  },
  depositTokenExternalDeps: {
    // https://etherscan.io/address/0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84
    token: stEthL1,
    // https://etherscan.io/address/0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0
    wToken: wstEthL1,
  },
  // https://docs.layerzero.network/v1/developers/evm/technical-reference/mainnet/mainnet-addresses
  lzExternalDepsForL1: {
    endpoint: '0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675',
    zroPaymentAddress: '0x0000000000000000000000000000000000000000',
    adapterParams: '0x',
    destinationChainId: 184,
  },
  baseExternalDeps: {
    // https://etherscan.io/tx/0xf53b69bd170a9376b314f29326b63519c52e4c42c5c6d2db6183d55d2281ecf0
    endpoint: '0x9de443AdC5A411E83F1878Ef24C3F52C61571e72',
    wTokenL2: wstEthL2,
  },
  // https://docs.layerzero.network/v1/developers/evm/technical-reference/testnet/testnet-addresses - Endpoint
  // https://docs.layerzero.network/v2/developers/evm/technical-reference/deployed-contracts - OFT endpoint
  lzExternalDepsForL2: {
    endpoint: '0xb6319cC6c8c27A8F5dAF0dD3DF91EA35C4720dd7',
    oftEndpoint: '0x1a44076050125825900e736c501f859c50fE728c',
    senderChainId: 101,
  },
  // https://docs.uniswap.org/contracts/v3/reference/deployments/base-deployments
  uniswapExternalDeps: {
    router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    nonfungiblePositionManager: '0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1',
  },
  l1Params: {
    isUpgradeable: true,
    owner: '???',
    protocolName: 'Nounspace',
    poolsInfo: pools,
    l2TokenReceiver: '---', // TODO
    l2MessageReceiver: '---', // TODO
  },
  l2Params: {
    isUpgradeable: true,
    owner: '???',
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
      users: ['???'],
      amount: ['???'],
    },
    {
      poolId: 2, // Developers
      users: ['???'],
      amount: ['???'],
    },
    {
      poolId: 3, // Team
      users: ['???'],
      amount: ['???'],
    },
    {
      poolId: 4, // Users
      users: ['???'],
      amount: ['???'],
    },
  ],
};
