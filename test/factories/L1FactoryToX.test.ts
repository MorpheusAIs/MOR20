import {
  Distribution,
  DistributionToArb,
  DistributionToArb__factory,
  DistributionToBase,
  DistributionToBase__factory,
  FeeConfig,
  GatewayRouterMock,
  IL1Factory,
  IL1FactoryToArb,
  IL1FactoryToBase,
  L1ArbSender,
  L1ArbSender__factory,
  L1BaseSender,
  L1BaseSender__factory,
  L1ERC20TokenBridgeMock,
  L1FactoryToArb,
  L1FactoryToBase,
  LZEndpointMock,
  LinearDistributionIntervalDecrease,
  StETHMock,
  WStETHMock,
} from '@ethers-v6';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import { PoolTypesL1 } from '../helpers/helper';
import { Reverter } from '../helpers/reverter';

import { ZERO_ADDR } from '@/scripts/utils/constants';
import { wei } from '@/scripts/utils/utils';

describe('L1Factory', () => {
  const senderChainId = 101;

  const reverter = new Reverter();

  let OWNER: SignerWithAddress;
  let SECOND: SignerWithAddress;

  let l1FactoryToArb: L1FactoryToArb;
  let l1FactoryToBase: L1FactoryToBase;

  let l1ArbSenderFactory: L1ArbSender__factory;
  let l1BaseSenderFactory: L1BaseSender__factory;
  let l1ArbSenderImplementation: L1ArbSender;
  let l1BaseSenderImplementation: L1BaseSender;

  let distributionToArbFactory: DistributionToArb__factory;
  let distributionToBaseFactory: DistributionToBase__factory;
  let distributionToArbImplementation: DistributionToArb;
  let distributionToBaseImplementation: DistributionToBase;
  let feeConfig: FeeConfig;

  let stEthMock: StETHMock;
  let wstEthMock: WStETHMock;
  let gatewayRouterMock: GatewayRouterMock;
  let baseGatewayMock: L1ERC20TokenBridgeMock;
  let lzEndpoint: LZEndpointMock;

  before(async () => {
    [OWNER, SECOND] = await ethers.getSigners();

    const [
      libFactory,
      l1FactoryToArbFactory,
      l1FactoryToBaseFactory,
      stEthMockFactory,
      wstEthMockFactory,
      gatewayRouterMockFactory,
      baseGatewayMockFactory,
      feeConfigFactory,
      ERC1967ProxyFactory,
      LZEndpointMockFactory,
    ] = await Promise.all([
      ethers.getContractFactory('LinearDistributionIntervalDecrease'),
      ethers.getContractFactory('L1FactoryToArb'),
      ethers.getContractFactory('L1FactoryToBase'),
      ethers.getContractFactory('StETHMock'),
      ethers.getContractFactory('WStETHMock'),
      ethers.getContractFactory('GatewayRouterMock'),
      ethers.getContractFactory('L1ERC20TokenBridgeMock'),
      ethers.getContractFactory('FeeConfig'),
      ethers.getContractFactory('ERC1967Proxy'),
      ethers.getContractFactory('LZEndpointMock'),
    ]);

    [l1ArbSenderFactory, l1BaseSenderFactory] = await Promise.all([
      ethers.getContractFactory('L1ArbSender'),
      ethers.getContractFactory('L1BaseSender'),
    ]);

    let lib: LinearDistributionIntervalDecrease;
    [
      lib,
      l1ArbSenderImplementation,
      l1BaseSenderImplementation,
      stEthMock,
      gatewayRouterMock,
      baseGatewayMock,
      lzEndpoint,
    ] = await Promise.all([
      libFactory.deploy(),
      l1ArbSenderFactory.deploy(),
      l1BaseSenderFactory.deploy(),
      stEthMockFactory.deploy(),
      gatewayRouterMockFactory.deploy(),
      baseGatewayMockFactory.deploy(),
      LZEndpointMockFactory.deploy(senderChainId),
    ]);
    wstEthMock = await wstEthMockFactory.deploy(stEthMock);

    const feeConfigImpl = await feeConfigFactory.deploy();
    const feeConfigProxy = await ERC1967ProxyFactory.deploy(feeConfigImpl, '0x');
    feeConfig = feeConfigFactory.attach(feeConfigProxy) as FeeConfig;

    await feeConfig.FeeConfig_init(OWNER, wei(0.1, 25));

    distributionToArbFactory = await ethers.getContractFactory('DistributionToArb', {
      libraries: {
        LinearDistributionIntervalDecrease: lib,
      },
    });
    distributionToArbImplementation = await distributionToArbFactory.deploy();

    distributionToBaseFactory = await ethers.getContractFactory('DistributionToBase', {
      libraries: {
        LinearDistributionIntervalDecrease: lib,
      },
    });
    distributionToBaseImplementation = await distributionToBaseFactory.deploy();

    const factoryToArbImpl = await l1FactoryToArbFactory.deploy();
    const factoryToArbProxy = await ERC1967ProxyFactory.deploy(factoryToArbImpl, '0x');
    l1FactoryToArb = l1FactoryToArbFactory.attach(factoryToArbProxy) as L1FactoryToArb;
    await l1FactoryToArb.L1FactoryToArb_init();

    const factoryToBaseImpl = await l1FactoryToBaseFactory.deploy();
    const factoryToBaseProxy = await ERC1967ProxyFactory.deploy(factoryToBaseImpl, '0x');
    l1FactoryToBase = l1FactoryToBaseFactory.attach(factoryToBaseProxy) as L1FactoryToBase;
    await l1FactoryToBase.L1FactoryToBase_init();

    const poolTypes = [PoolTypesL1.DISTRIBUTION, PoolTypesL1.L1_SENDER];
    await l1FactoryToArb.setImplementations(poolTypes, [distributionToArbImplementation, l1ArbSenderImplementation]);
    await l1FactoryToBase.setImplementations(poolTypes, [distributionToBaseImplementation, l1BaseSenderImplementation]);

    await reverter.snapshot();
  });

  afterEach(reverter.revert);

  function getL1FactoryParams() {
    const depositTokenExternalDeps: IL1Factory.DepositTokenExternalDepsStruct = {
      token: stEthMock,
      wToken: wstEthMock,
    };

    const lzExternalDeps: IL1Factory.LzExternalDepsStruct = {
      endpoint: lzEndpoint,
      zroPaymentAddress: ZERO_ADDR,
      adapterParams: '0x',
      destinationChainId: 2,
    };

    const arbExternalDeps: IL1FactoryToArb.ArbExternalDepsStruct = {
      endpoint: gatewayRouterMock,
    };

    const baseExternalDeps: IL1FactoryToBase.BaseExternalDepsStruct = {
      endpoint: baseGatewayMock,
      wTokenL2: wstEthMock,
    };

    return { depositTokenExternalDeps, lzExternalDeps, arbExternalDeps, baseExternalDeps };
  }

  function getL1DefaultParams() {
    const l1Params = {
      isUpgradeable: true,
      owner: OWNER,
      protocolName: 'Mor20',
      poolsInfo: [],
      l2TokenReceiver: SECOND,
      l2MessageReceiver: SECOND,
    };

    return l1Params;
  }

  describe('UUPS proxy functionality', () => {
    describe('#L1FactoryToX_init', () => {
      it('should revert if try to call init function twice - Arb', async () => {
        const reason = 'Initializable: contract is already initialized';

        await expect(l1FactoryToArb.L1FactoryToArb_init()).to.be.rejectedWith(reason);
      });
      it('should revert if try to call init function twice - Base', async () => {
        const reason = 'Initializable: contract is already initialized';

        await expect(l1FactoryToBase.L1FactoryToBase_init()).to.be.rejectedWith(reason);
      });
    });
  });

  describe('#setArbExternalDeps', () => {
    it('should set Arbitrum external deps', async () => {
      const { arbExternalDeps } = getL1FactoryParams();

      await l1FactoryToArb.setArbExternalDeps(arbExternalDeps);

      const actualArbExternalDeps = await l1FactoryToArb.arbExternalDeps();
      expect(actualArbExternalDeps).to.equal(arbExternalDeps.endpoint);
    });
    it('should revert if called by non-owner', async () => {
      const { arbExternalDeps } = getL1FactoryParams();

      await expect(l1FactoryToArb.connect(SECOND).setArbExternalDeps(arbExternalDeps)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      );
    });
    it('should revert if endpoint is zero address', async () => {
      const { arbExternalDeps } = getL1FactoryParams();
      arbExternalDeps.endpoint = ZERO_ADDR;

      await expect(l1FactoryToArb.setArbExternalDeps(arbExternalDeps)).to.be.revertedWith(
        'L1FTA: invalid ARB endpoint',
      );
    });
  });

  describe('#setBaseExternalDeps', () => {
    it('should set Base external deps', async () => {
      const { baseExternalDeps } = getL1FactoryParams();

      await l1FactoryToBase.setBaseExternalDeps(baseExternalDeps);

      const actualBaseExternalDeps = await l1FactoryToBase.baseExternalDeps();
      expect(actualBaseExternalDeps.endpoint).to.equal(baseExternalDeps.endpoint);
      expect(actualBaseExternalDeps.wTokenL2).to.equal(baseExternalDeps.wTokenL2);
    });
    it('should revert if called by non-owner', async () => {
      const { baseExternalDeps } = getL1FactoryParams();

      await expect(l1FactoryToBase.connect(SECOND).setBaseExternalDeps(baseExternalDeps)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      );
    });
    it('should revert if endpoint is zero address', async () => {
      const { baseExternalDeps } = getL1FactoryParams();
      baseExternalDeps.endpoint = ZERO_ADDR;

      await expect(l1FactoryToBase.setBaseExternalDeps(baseExternalDeps)).to.be.revertedWith(
        'L1FTB: invalid Base endpoint',
      );
    });
    it('should revert if wTokenL2 is zero address', async () => {
      const { baseExternalDeps } = getL1FactoryParams();
      baseExternalDeps.wTokenL2 = ZERO_ADDR;

      await expect(l1FactoryToBase.setBaseExternalDeps(baseExternalDeps)).to.be.revertedWith(
        'L1FTB: invalid wToken address',
      );
    });
  });

  describe('#deployArb', () => {
    beforeEach(async () => {
      const { depositTokenExternalDeps, lzExternalDeps, arbExternalDeps } = getL1FactoryParams();

      await l1FactoryToArb.setDepositTokenExternalDeps(depositTokenExternalDeps);
      await l1FactoryToArb.setLzExternalDeps(lzExternalDeps);
      await l1FactoryToArb.setArbExternalDeps(arbExternalDeps);
    });

    it('should deploy', async () => {
      const l1Params = getL1DefaultParams();

      await l1FactoryToArb.deploy(l1Params);

      const distribution = distributionToArbFactory.attach(
        await l1FactoryToArb.getProxyPool(OWNER, l1Params.protocolName, PoolTypesL1.DISTRIBUTION),
      ) as Distribution;
      const l1Sender = l1ArbSenderFactory.attach(
        await l1FactoryToArb.getProxyPool(OWNER, l1Params.protocolName, PoolTypesL1.L1_SENDER),
      ) as L1ArbSender;

      expect(await distribution.owner()).to.equal(OWNER);
      expect(await l1Sender.owner()).to.equal(OWNER);

      expect(await distribution.depositToken()).to.equal((await l1FactoryToArb.depositTokenExternalDeps()).token);
      expect(await distribution.l1Sender()).to.equal(l1Sender);

      expect(await l1Sender.unwrappedDepositToken()).to.equal((await l1FactoryToArb.depositTokenExternalDeps()).token);
      expect(await l1Sender.distribution()).to.equal(distribution);

      const depositTokenConfig = await l1Sender.depositTokenConfig();
      expect(depositTokenConfig.token).to.equal((await l1FactoryToArb.depositTokenExternalDeps()).wToken);
      expect(depositTokenConfig.gateway).to.equal(await l1FactoryToArb.arbExternalDeps());
      expect(depositTokenConfig.receiver).to.equal(l1Params.l2TokenReceiver);

      const rewardTokenConfig = await l1Sender.rewardTokenConfig();
      expect(rewardTokenConfig.gateway).to.equal((await l1FactoryToArb.lzExternalDeps()).endpoint);
      expect(rewardTokenConfig.receiver).to.equal(l1Params.l2MessageReceiver);
      expect(rewardTokenConfig.receiverChainId).to.equal((await l1FactoryToArb.lzExternalDeps()).destinationChainId);
      expect(rewardTokenConfig.zroPaymentAddress).to.equal((await l1FactoryToArb.lzExternalDeps()).zroPaymentAddress);
      expect(rewardTokenConfig.adapterParams).to.equal((await l1FactoryToArb.lzExternalDeps()).adapterParams);
    });
    it('should revert if contract is paused', async () => {
      await l1FactoryToArb.pause();

      await expect(l1FactoryToArb.deploy(getL1DefaultParams())).to.be.revertedWith('Pausable: paused');
    });
  });

  describe('#deployBase', () => {
    beforeEach(async () => {
      const { depositTokenExternalDeps, lzExternalDeps, baseExternalDeps } = getL1FactoryParams();

      await l1FactoryToBase.setDepositTokenExternalDeps(depositTokenExternalDeps);
      await l1FactoryToBase.setLzExternalDeps(lzExternalDeps);
      await l1FactoryToBase.setBaseExternalDeps(baseExternalDeps);
    });

    it('should deploy', async () => {
      const l1Params = getL1DefaultParams();

      await l1FactoryToBase.deploy(l1Params);

      const distribution = distributionToBaseFactory.attach(
        await l1FactoryToBase.getProxyPool(OWNER, l1Params.protocolName, PoolTypesL1.DISTRIBUTION),
      ) as Distribution;
      const l1Sender = l1BaseSenderFactory.attach(
        await l1FactoryToBase.getProxyPool(OWNER, l1Params.protocolName, PoolTypesL1.L1_SENDER),
      ) as L1BaseSender;

      expect(await distribution.owner()).to.equal(OWNER);
      expect(await l1Sender.owner()).to.equal(OWNER);

      expect(await distribution.depositToken()).to.equal((await l1FactoryToBase.depositTokenExternalDeps()).token);
      expect(await distribution.l1Sender()).to.equal(l1Sender);

      expect(await l1Sender.unwrappedDepositToken()).to.equal((await l1FactoryToBase.depositTokenExternalDeps()).token);
      expect(await l1Sender.distribution()).to.equal(distribution);

      const depositTokenConfig = await l1Sender.depositTokenConfig();
      expect(depositTokenConfig.gateway).to.equal((await l1FactoryToBase.baseExternalDeps()).endpoint);
      expect(depositTokenConfig.l1Token).to.equal((await l1FactoryToBase.depositTokenExternalDeps()).wToken);
      expect(depositTokenConfig.l2Token).to.equal((await l1FactoryToBase.baseExternalDeps()).wTokenL2);
      expect(depositTokenConfig.receiver).to.equal(l1Params.l2TokenReceiver);

      const rewardTokenConfig = await l1Sender.rewardTokenConfig();
      expect(rewardTokenConfig.gateway).to.equal((await l1FactoryToBase.lzExternalDeps()).endpoint);
      expect(rewardTokenConfig.receiver).to.equal(l1Params.l2MessageReceiver);
      expect(rewardTokenConfig.receiverChainId).to.equal((await l1FactoryToBase.lzExternalDeps()).destinationChainId);
      expect(rewardTokenConfig.zroPaymentAddress).to.equal((await l1FactoryToBase.lzExternalDeps()).zroPaymentAddress);
      expect(rewardTokenConfig.adapterParams).to.equal((await l1FactoryToBase.lzExternalDeps()).adapterParams);
    });
    it('should revert if contract is paused', async () => {
      await l1FactoryToBase.pause();

      await expect(l1FactoryToBase.deploy(getL1DefaultParams())).to.be.revertedWith('Pausable: paused');
    });
  });

  describe('#deployBase and #deployArb', () => {
    beforeEach(async () => {
      const { depositTokenExternalDeps, lzExternalDeps, baseExternalDeps, arbExternalDeps } = getL1FactoryParams();

      await l1FactoryToBase.setDepositTokenExternalDeps(depositTokenExternalDeps);
      await l1FactoryToBase.setLzExternalDeps(lzExternalDeps);
      await l1FactoryToBase.setBaseExternalDeps(baseExternalDeps);

      await l1FactoryToArb.setDepositTokenExternalDeps(depositTokenExternalDeps);
      await l1FactoryToArb.setLzExternalDeps(lzExternalDeps);
      await l1FactoryToArb.setArbExternalDeps(arbExternalDeps);
    });

    it('should deploy same project', async () => {
      const l1Params = getL1DefaultParams();

      await l1FactoryToBase.deploy(l1Params);
      await l1FactoryToArb.deploy(l1Params);
    });
    it('should revert if deploy the same project', async () => {
      const l1Params = getL1DefaultParams();
      await l1FactoryToBase.deploy(l1Params);

      await expect(l1FactoryToBase.deploy(l1Params)).to.be.revertedWith('F: salt used');
    });
  });

  describe('#predictAddresses', () => {
    beforeEach(async () => {
      const { depositTokenExternalDeps, lzExternalDeps, arbExternalDeps } = getL1FactoryParams();

      await l1FactoryToArb.setDepositTokenExternalDeps(depositTokenExternalDeps);
      await l1FactoryToArb.setLzExternalDeps(lzExternalDeps);
      await l1FactoryToArb.setArbExternalDeps(arbExternalDeps);
    });

    it('should predict addresses', async () => {
      const l1Params = getL1DefaultParams();

      const [distribution, l1Sender] = await l1FactoryToArb.predictAddresses(OWNER, l1Params.protocolName);

      expect(distribution).to.be.properAddress;
      expect(l1Sender).to.be.properAddress;

      await l1FactoryToArb.deploy(l1Params);

      expect(await l1FactoryToArb.getProxyPool(OWNER, l1Params.protocolName, PoolTypesL1.DISTRIBUTION)).to.equal(
        distribution,
      );
      expect(await l1FactoryToArb.getProxyPool(OWNER, l1Params.protocolName, PoolTypesL1.L1_SENDER)).to.equal(l1Sender);
    });

    it('should predict zero if empty protocol', async () => {
      const [distribution, l1Sender] = await l1FactoryToArb.predictAddresses(OWNER, '');

      expect(distribution).to.eq(ZERO_ADDR);
      expect(l1Sender).to.eq(ZERO_ADDR);
    });
  });

  describe('#getDeployedPools', () => {
    beforeEach(async () => {
      const { depositTokenExternalDeps, lzExternalDeps, arbExternalDeps } = getL1FactoryParams();

      await l1FactoryToArb.setDepositTokenExternalDeps(depositTokenExternalDeps);
      await l1FactoryToArb.setLzExternalDeps(lzExternalDeps);
      await l1FactoryToArb.setArbExternalDeps(arbExternalDeps);
    });

    it('should return deployed addresses', async () => {
      const l1Params = getL1DefaultParams();

      const [distribution, l1Sender] = await l1FactoryToArb.predictAddresses(OWNER, l1Params.protocolName);

      await l1FactoryToArb.deploy(l1Params);

      expect(await l1FactoryToArb.countProtocols(OWNER)).to.equal(1);

      const pools = await l1FactoryToArb.getDeployedPools(OWNER, 0, 1);

      expect(pools[0].protocol).to.equal(l1Params.protocolName);
      expect(pools[0].distribution).to.equal(distribution);
      expect(pools[0].l1Sender).to.equal(l1Sender);
    });
  });
});

// npx hardhat test "test/factories/L1FactoryToX.test.ts"
// npx hardhat coverage --solcoverjs ./.solcover.ts --testfiles "test/factories/L1FactoryToX.test.ts"
