import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import { setNextTime } from './helpers/block-helper';
import { getDefaultPool, oneDay } from './helpers/distribution-helper';
import { PoolTypesL1, PoolTypesL2 } from './helpers/helper';
import { Reverter } from './helpers/reverter';

import {
  FeeConfig,
  IL1Factory,
  IL1FactoryToArb,
  IL1FactoryToBase,
  IL2Factory,
  L1FactoryToArb,
  L1FactoryToBase,
  L2Factory,
  LZEndpointMock,
  WETHMock,
  WStETHMock,
} from '@/generated-types/ethers';
import { ZERO_ADDR } from '@/scripts/utils/constants';
import { wei } from '@/scripts/utils/utils';

describe('Integration', () => {
  const senderChainId = 101;
  const receiverChainId = 102;

  const reverter = new Reverter();

  let OWNER: SignerWithAddress;

  let l1FactoryToArb: L1FactoryToArb;
  let l1FactoryToBase: L1FactoryToBase;
  let l2Factory: L2Factory;

  let l2Weth: WETHMock;
  let l1WstEth: WStETHMock;
  let l2WstEth: WStETHMock;

  let l1LzEndpoint: LZEndpointMock;
  let l2LzEndpoint: LZEndpointMock;

  let depositTokenExternalDeps: IL1Factory.DepositTokenExternalDepsStruct;
  let lzExternalDeps: IL1Factory.LzExternalDepsStruct;
  let arbExternalDeps: IL1FactoryToArb.ArbExternalDepsStruct;
  let baseExternalDeps: IL1FactoryToBase.BaseExternalDepsStruct;

  let lzTokenExternalDeps: IL2Factory.LzExternalDepsStruct;
  let uniswapExternalDeps: IL2Factory.UniswapExternalDepsStruct;

  before(async () => {
    [OWNER] = await ethers.getSigners();

    const [
      L1FactoryToArb,
      L1FactoryToBase,
      ERC1967ProxyFactory,

      LinearDistributionIntervalDecreaseFactory,
      L1ArbSenderFactory,
      L1BaseSenderFactory,
      StEthMockFactory,
      WstEthMockFactory,
      GatewayRouterMockFactory,
      L1ERC20TokenBridgeMock,
      FeeConfigFactory,
      LZEndpointMockFactory,

      LayerZeroEndpointV2Mock,
      MOR20DeployerFactory,
      SwapRouterMockFactory,
      NonfungiblePositionManagerMockFactory,
      L2MessageReceiverFactory,
      L2TokenReceiverFactory,
      WETHMockFactory,
    ] = await Promise.all([
      ethers.getContractFactory('L1FactoryToArb'),
      ethers.getContractFactory('L1FactoryToBase'),
      ethers.getContractFactory('ERC1967Proxy'),

      ethers.getContractFactory('LinearDistributionIntervalDecrease'),
      ethers.getContractFactory('L1ArbSender'),
      ethers.getContractFactory('L1BaseSender'),
      ethers.getContractFactory('StETHMock'),
      ethers.getContractFactory('WStETHMock'),
      ethers.getContractFactory('GatewayRouterMock'),
      ethers.getContractFactory('L1ERC20TokenBridgeMock'),
      ethers.getContractFactory('FeeConfig'),
      ethers.getContractFactory('LZEndpointMock'),

      ethers.getContractFactory('LayerZeroEndpointV2Mock'),
      ethers.getContractFactory('MOR20Deployer'),
      ethers.getContractFactory('SwapRouterMock'),
      ethers.getContractFactory('NonfungiblePositionManagerMock'),
      ethers.getContractFactory('L2MessageReceiver'),
      ethers.getContractFactory('L2TokenReceiver'),
      ethers.getContractFactory('WETHMock'),
    ]);

    const [
      linearDistributionIntervalDecrease,
      l1ArbSenderImplementation,
      l1BaseSenderImplementation,
      l1StEth,
      l2StEth,
      gatewayRouterMock,
      baseGateway,
      feeConfigImplementation,
      l1LzEndpointMock,

      l2LzEndpointMock,
      l2LzEndpointOFT,
      l2MessageReceiverImplementation,
      l2TokenReceiverImplementation,
      MOR20Deployer,
      swapRouter,
      nonfungiblePositionManager,
      l2WethMock,
    ] = await Promise.all([
      LinearDistributionIntervalDecreaseFactory.deploy(),
      L1ArbSenderFactory.deploy(),
      L1BaseSenderFactory.deploy(),
      StEthMockFactory.deploy(),
      StEthMockFactory.deploy(),
      GatewayRouterMockFactory.deploy(),
      L1ERC20TokenBridgeMock.deploy(),
      FeeConfigFactory.deploy(),
      LZEndpointMockFactory.deploy(senderChainId),

      LZEndpointMockFactory.deploy(receiverChainId),
      LayerZeroEndpointV2Mock.deploy(receiverChainId, OWNER),
      L2MessageReceiverFactory.deploy(),
      L2TokenReceiverFactory.deploy(),
      MOR20DeployerFactory.deploy(),
      SwapRouterMockFactory.deploy(),
      NonfungiblePositionManagerMockFactory.deploy(),
      WETHMockFactory.deploy(),
    ]);
    l2Weth = l2WethMock;
    l1LzEndpoint = l1LzEndpointMock;
    l2LzEndpoint = l2LzEndpointMock;

    const distributionFactoryToArb = await ethers.getContractFactory('DistributionToArb', {
      libraries: {
        LinearDistributionIntervalDecrease: linearDistributionIntervalDecrease,
      },
    });
    const distributionToArbImplementation = await distributionFactoryToArb.deploy();

    const distributionFactoryToBase = await ethers.getContractFactory('DistributionToBase', {
      libraries: {
        LinearDistributionIntervalDecrease: linearDistributionIntervalDecrease,
      },
    });
    const distributionToBaseImplementation = await distributionFactoryToBase.deploy();

    l1WstEth = await WstEthMockFactory.deploy(l1StEth);
    l2WstEth = await WstEthMockFactory.deploy(l2StEth);

    const l1FactoryToArbImpl = await L1FactoryToArb.deploy();
    const l1FactoryToArbProxy = await ERC1967ProxyFactory.deploy(l1FactoryToArbImpl, '0x');
    l1FactoryToArb = L1FactoryToArb.attach(l1FactoryToArbProxy) as L1FactoryToArb;
    await l1FactoryToArb.L1FactoryToArb_init();

    const l1FactoryToBaseImpl = await L1FactoryToBase.deploy();
    const l1FactoryToBaseProxy = await ERC1967ProxyFactory.deploy(l1FactoryToBaseImpl, '0x');
    l1FactoryToBase = L1FactoryToBase.attach(l1FactoryToBaseProxy) as L1FactoryToBase;
    await l1FactoryToBase.L1FactoryToBase_init();

    // Set test impl for `l1BaseSenderImplementation`
    await l1FactoryToArb.setImplementations(
      [PoolTypesL1.DISTRIBUTION, PoolTypesL1.L1_SENDER],
      [distributionToArbImplementation, l1ArbSenderImplementation],
    );

    await l1FactoryToBase.setImplementations(
      [PoolTypesL1.DISTRIBUTION, PoolTypesL1.L1_SENDER],
      [distributionToBaseImplementation, l1BaseSenderImplementation],
    );

    const feeConfigProxy = await ERC1967ProxyFactory.deploy(feeConfigImplementation, '0x');
    const feeConfig = FeeConfigFactory.attach(feeConfigProxy) as FeeConfig;
    await feeConfig.FeeConfig_init(OWNER, wei(0.1, 25));

    const L2Factory = await ethers.getContractFactory('L2Factory', {
      libraries: {
        MOR20Deployer: MOR20Deployer,
      },
    });
    const l2FactoryImpl = await L2Factory.deploy();
    const l2FactoryProxy = await ERC1967ProxyFactory.deploy(l2FactoryImpl, '0x');
    l2Factory = L2Factory.attach(l2FactoryProxy) as L2Factory;
    await l2Factory.L2Factory_init();

    await l2Factory.setImplementations(
      [PoolTypesL2.L2_MESSAGE_RECEIVER, PoolTypesL2.L2_TOKEN_RECEIVER],
      [l2MessageReceiverImplementation, l2TokenReceiverImplementation],
    );

    depositTokenExternalDeps = {
      token: l1StEth,
      wToken: l1WstEth,
    };
    lzExternalDeps = {
      endpoint: l1LzEndpoint,
      zroPaymentAddress: ZERO_ADDR,
      adapterParams: '0x',
      destinationChainId: receiverChainId,
    };
    arbExternalDeps = {
      endpoint: gatewayRouterMock,
    };
    baseExternalDeps = {
      endpoint: baseGateway,
      wTokenL2: l1WstEth,
    };

    await l1FactoryToArb.setDepositTokenExternalDeps(depositTokenExternalDeps);
    await l1FactoryToArb.setLzExternalDeps(lzExternalDeps);
    await l1FactoryToArb.setArbExternalDeps(arbExternalDeps);
    await l1FactoryToArb.setFeeConfig(feeConfig);

    await l1FactoryToBase.setDepositTokenExternalDeps(depositTokenExternalDeps);
    await l1FactoryToBase.setLzExternalDeps(lzExternalDeps);
    await l1FactoryToBase.setBaseExternalDeps(baseExternalDeps);
    await l1FactoryToBase.setFeeConfig(feeConfig);

    lzTokenExternalDeps = {
      endpoint: l2LzEndpoint,
      oftEndpoint: l2LzEndpointOFT,
      senderChainId: senderChainId,
    };
    uniswapExternalDeps = {
      router: swapRouter,
      nonfungiblePositionManager: nonfungiblePositionManager,
    };
    await l2Factory.setLzExternalDeps(lzTokenExternalDeps);
    await l2Factory.setUniswapExternalDeps(uniswapExternalDeps);

    await l1StEth.mint(OWNER, wei(1000));

    await reverter.snapshot();
  });

  afterEach(reverter.revert);

  describe('Should deploy L1 and L2', () => {
    const protocolName = 'Mor20';

    it('should deploy correctly for Arbitrum', async () => {
      const [l2MessageReceiverPredicted, l2TokenReceiverPredicted] = await l2Factory.predictAddresses(
        OWNER,
        protocolName,
      );

      const [distributionPredicted, l1SenderPredicted] = await l1FactoryToArb.predictAddresses(OWNER, protocolName);

      await l1LzEndpoint.setDestLzEndpoint(l2MessageReceiverPredicted, l2LzEndpoint);

      const l1Params = {
        isUpgradeable: false,
        owner: OWNER,
        protocolName: protocolName,
        poolsInfo: [],
        l2TokenReceiver: l2TokenReceiverPredicted,
        l2MessageReceiver: l2MessageReceiverPredicted,
      };
      const l2Params: IL2Factory.L2ParamsStruct = {
        isUpgradeable: false,
        owner: OWNER,
        protocolName: protocolName,
        mor20Name: 'MOR20',
        mor20Symbol: 'M20',
        l1Sender: l1SenderPredicted,
        firstSwapParams_: {
          tokenIn: l2WstEth,
          tokenOut: l2Weth,
          fee: 100,
        },
        secondSwapFee: 3000,
      };

      await l1FactoryToArb.deploy(l1Params);
      await l2Factory.deploy(l2Params);

      const distribution = await ethers.getContractAt('DistributionToArb', distributionPredicted);
      const MOR20 = await ethers.getContractAt('MOR20', await l2Factory.getMor20(OWNER, protocolName));

      const pool = getDefaultPool();
      await distribution.createPool(pool);

      const l1StEth = await ethers.getContractAt('StETHMock', (await l1FactoryToArb.depositTokenExternalDeps()).token);
      await l1StEth.approve(distribution, wei(1));
      await distribution.stake(0, wei(1));

      await l1StEth.setTotalPooledEther((await l1StEth.totalPooledEther()) * 2n);

      const overplus = await distribution.overplus();
      expect(overplus).to.be.eq(wei(1));

      let tx = await distribution.bridgeOverplus(1, 1, 1);
      await expect(tx).to.changeTokenBalances(l1StEth, [distributionPredicted, OWNER], [wei(-1), wei(0.1)]);
      // we made an assumption that the token address is l1WstEth
      await expect(tx).to.changeTokenBalance(l1WstEth, l2TokenReceiverPredicted, wei(0.9));
      expect(await distribution.overplus()).to.be.eq(0);

      await setNextTime(2 * oneDay);

      tx = await distribution.withdraw(0, wei(1));
      await expect(tx).to.changeTokenBalances(l1StEth, [distributionPredicted, OWNER], [wei(-1), wei(1)]);

      const reward = await distribution.getCurrentUserReward(0, OWNER);
      expect(reward).to.equal(wei(100));

      await distribution.claim(0, OWNER, { value: wei(0.1) });

      expect(await MOR20.balanceOf(OWNER)).to.be.eq(reward);
    });

    it('should deploy correctly for Base', async () => {
      const [l2MessageReceiverPredicted, l2TokenReceiverPredicted] = await l2Factory.predictAddresses(
        OWNER,
        protocolName,
      );

      const [distributionPredicted, l1SenderPredicted] = await l1FactoryToBase.predictAddresses(OWNER, protocolName);

      await l1LzEndpoint.setDestLzEndpoint(l2MessageReceiverPredicted, l2LzEndpoint);

      const l1Params = {
        isUpgradeable: false,
        owner: OWNER,
        protocolName: protocolName,
        poolsInfo: [],
        l2TokenReceiver: l2TokenReceiverPredicted,
        l2MessageReceiver: l2MessageReceiverPredicted,
      };
      const l2Params: IL2Factory.L2ParamsStruct = {
        isUpgradeable: false,
        owner: OWNER,
        protocolName: protocolName,
        mor20Name: 'MOR20',
        mor20Symbol: 'M20',
        l1Sender: l1SenderPredicted,
        firstSwapParams_: {
          tokenIn: l2WstEth,
          tokenOut: l2Weth,
          fee: 100,
        },
        secondSwapFee: 3000,
      };

      await l1FactoryToBase.deploy(l1Params);
      await l2Factory.deploy(l2Params);

      const distribution = await ethers.getContractAt('DistributionToBase', distributionPredicted);
      const MOR20 = await ethers.getContractAt('MOR20', await l2Factory.getMor20(OWNER, protocolName));

      const pool = getDefaultPool();
      await distribution.createPool(pool);

      const l1StEth = await ethers.getContractAt('StETHMock', (await l1FactoryToBase.depositTokenExternalDeps()).token);
      await l1StEth.approve(distribution, wei(1));
      await distribution.stake(0, wei(1));

      await l1StEth.setTotalPooledEther((await l1StEth.totalPooledEther()) * 2n);

      const overplus = await distribution.overplus();
      expect(overplus).to.be.eq(wei(1));

      let tx = await distribution.bridgeOverplus(1, '0x');
      await expect(tx).to.changeTokenBalances(l1StEth, [distributionPredicted, OWNER], [wei(-1), wei(0.1)]);
      // we made an assumption that the token address is l1WstEth
      await expect(tx).to.changeTokenBalance(l1WstEth, l2TokenReceiverPredicted, wei(0.9));
      expect(await distribution.overplus()).to.be.eq(0);

      await setNextTime(2 * oneDay);

      tx = await distribution.withdraw(0, wei(1));
      await expect(tx).to.changeTokenBalances(l1StEth, [distributionPredicted, OWNER], [wei(-1), wei(1)]);

      const reward = await distribution.getCurrentUserReward(0, OWNER);
      expect(reward).to.equal(wei(100));

      await distribution.claim(0, OWNER, { value: wei(0.1) });

      expect(await MOR20.balanceOf(OWNER)).to.be.eq(reward);
    });
  });
});

// npx hardhat test "test/Integration.test.ts"
