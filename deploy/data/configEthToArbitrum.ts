// https://etherscan.io/address/0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84
const stEthL1 = '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84';
// https://etherscan.io/address/0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0
const wstEthL1 = '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0';

export const configEthToArbitrum = {
  feeConfig: '0x33e689846b1F143793C9d270a26016615a1cAe83',
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
    destinationChainId: 110,
  },
  arbitrumExternalDeps: {
    // https://etherscan.io/address/0x72Ce9c846789fdB6fC1f34aC4AD25Dd9ef7031ef
    endpoint: '0x72Ce9c846789fdB6fC1f34aC4AD25Dd9ef7031ef',
  },
  // https://docs.layerzero.network/v1/developers/evm/technical-reference/mainnet/mainnet-addresses - Endpoint
  // https://docs.layerzero.network/v2/developers/evm/technical-reference/deployed-contracts - OFT endpoint
  lzExternalDepsForL2: {
    endpoint: '0x3c2269811836af69497E5F486A85D7316753cf62',
    oftEndpoint: '0x1a44076050125825900e736c501f859c50fE728c',
    senderChainId: 101,
  },
  // https://docs.uniswap.org/contracts/v3/reference/deployments/base-deployments
  uniswapExternalDeps: {
    router: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    nonfungiblePositionManager: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
  },
  //END
};
