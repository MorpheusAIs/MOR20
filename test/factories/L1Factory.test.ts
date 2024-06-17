import {
  Distribution,
  Distribution__factory,
  FeeConfig,
  GatewayRouterMock,
  IL1Factory,
  L1Factory,
  L1Sender,
  L1Sender__factory,
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

import { L1FactoryV2 } from '@/generated-types/ethers/contracts/mock/L1FactoryV2';
import { ZERO_ADDR } from '@/scripts/utils/constants';
import { wei } from '@/scripts/utils/utils';

describe('L1Factory', () => {
  const senderChainId = 101;

  const reverter = new Reverter();

  let OWNER: SignerWithAddress;
  let SECOND: SignerWithAddress;

  let l1Factory: L1Factory;

  let distributionFactory: Distribution__factory;
  let l1SenderFactory: L1Sender__factory;

  let l1SenderImplementation: L1Sender;
  let distributionImplementation: Distribution;
  let feeConfig: FeeConfig;

  let stEthMock: StETHMock;
  let wstEthMock: WStETHMock;
  let gatewayRouterMock: GatewayRouterMock;
  let lzEndpoint: LZEndpointMock;

  before(async () => {
    [OWNER, SECOND] = await ethers.getSigners();

    const [
      libFactory,
      l1FactoryFactory,
      stEthMockFactory,
      wstEthMockFactory,
      gatewayRouterMockFactory,
      feeConfigFactory,
      ERC1967ProxyFactory,
      LZEndpointMockFactory,
    ] = await Promise.all([
      ethers.getContractFactory('LinearDistributionIntervalDecrease'),
      ethers.getContractFactory('L1Factory'),
      ethers.getContractFactory('StETHMock'),
      ethers.getContractFactory('WStETHMock'),
      ethers.getContractFactory('GatewayRouterMock'),
      ethers.getContractFactory('FeeConfig'),
      ethers.getContractFactory('ERC1967Proxy'),
      ethers.getContractFactory('LZEndpointMock'),
    ]);
    l1SenderFactory = await ethers.getContractFactory('L1Sender');

    let lib: LinearDistributionIntervalDecrease;
    [lib, l1SenderImplementation, stEthMock, gatewayRouterMock, lzEndpoint] = await Promise.all([
      libFactory.deploy(),
      l1SenderFactory.deploy(),
      stEthMockFactory.deploy(),
      gatewayRouterMockFactory.deploy(),
      LZEndpointMockFactory.deploy(senderChainId),
    ]);
    wstEthMock = await wstEthMockFactory.deploy(stEthMock);

    const feeConfigImpl = await feeConfigFactory.deploy();
    const feeConfigProxy = await ERC1967ProxyFactory.deploy(feeConfigImpl, '0x');
    feeConfig = feeConfigFactory.attach(feeConfigProxy) as FeeConfig;

    await feeConfig.FeeConfig_init(OWNER, wei(0.1, 25));

    distributionFactory = await ethers.getContractFactory('Distribution', {
      libraries: {
        LinearDistributionIntervalDecrease: lib,
      },
    });
    distributionImplementation = await distributionFactory.deploy();

    const factoryImpl = await l1FactoryFactory.deploy();
    const factoryProxy = await ERC1967ProxyFactory.deploy(factoryImpl, '0x');
    l1Factory = l1FactoryFactory.attach(factoryProxy) as L1Factory;

    await l1Factory.L1Factory_init();

    const poolTypes = [PoolTypesL1.DISTRIBUTION, PoolTypesL1.L1_SENDER];
    const poolImplementations = [
      await distributionImplementation.getAddress(),
      await l1SenderImplementation.getAddress(),
    ];

    await l1Factory.setImplementations(poolTypes, poolImplementations);

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

    const arbExternalDeps: IL1Factory.ArbExternalDepsStruct = {
      endpoint: gatewayRouterMock,
    };

    return { depositTokenExternalDeps, lzExternalDeps, arbExternalDeps };
  }

  function getL1DefaultParams() {
    const l1Params: IL1Factory.L1ParamsStruct = {
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
    describe('#L1Factory_init', () => {
      it('should revert if try to call init function twice', async () => {
        const reason = 'Initializable: contract is already initialized';

        await expect(l1Factory.L1Factory_init()).to.be.rejectedWith(reason);
      });

      describe('#_authorizeUpgrade', () => {
        it('should correctly upgrade', async () => {
          const l1FactoryV2Factory = await ethers.getContractFactory('FactoryMockV2');
          const l1FactoryV2Implementation = await l1FactoryV2Factory.deploy();

          await l1Factory.upgradeTo(l1FactoryV2Implementation);

          const l1factoryV2 = l1FactoryV2Factory.attach(await l1FactoryV2Implementation.getAddress()) as L1FactoryV2;

          expect(await l1factoryV2.version()).to.eq(2);
        });
        it('should revert if caller is not the owner', async () => {
          await expect(l1Factory.connect(SECOND).upgradeTo(ZERO_ADDR)).to.be.revertedWith(
            'Ownable: caller is not the owner',
          );
        });
      });
    });
  });

  describe('setDepositTokenExternalDeps', () => {
    it('should set deposit token external deps', async () => {
      const { depositTokenExternalDeps } = getL1FactoryParams();

      await l1Factory.setDepositTokenExternalDeps(depositTokenExternalDeps);

      const actualDepositTokenExternalDeps = await l1Factory.depositTokenExternalDeps();
      expect(actualDepositTokenExternalDeps.token).to.equal(depositTokenExternalDeps.token);
      expect(actualDepositTokenExternalDeps.wToken).to.equal(depositTokenExternalDeps.wToken);
    });
    it('should revert if called by non-owner', async () => {
      const { depositTokenExternalDeps } = getL1FactoryParams();

      await expect(l1Factory.connect(SECOND).setDepositTokenExternalDeps(depositTokenExternalDeps)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      );
    });
    it('should revert if token is zero address', async () => {
      const { depositTokenExternalDeps } = getL1FactoryParams();
      depositTokenExternalDeps.token = ZERO_ADDR;

      await expect(l1Factory.setDepositTokenExternalDeps(depositTokenExternalDeps)).to.be.revertedWith(
        'L1F: invalid token',
      );
    });
    it('should revert if wToken is zero address', async () => {
      const { depositTokenExternalDeps } = getL1FactoryParams();
      depositTokenExternalDeps.wToken = ZERO_ADDR;

      await expect(l1Factory.setDepositTokenExternalDeps(depositTokenExternalDeps)).to.be.revertedWith(
        'L1F: invalid wtoken',
      );
    });
  });

  describe('setLzExternalDeps', () => {
    it('should set lz external deps', async () => {
      const { lzExternalDeps } = getL1FactoryParams();

      await l1Factory.setLzExternalDeps(lzExternalDeps);

      const actualLzExternalDeps = await l1Factory.lzExternalDeps();
      expect(actualLzExternalDeps.endpoint).to.equal(lzExternalDeps.endpoint);
      expect(actualLzExternalDeps.zroPaymentAddress).to.equal(lzExternalDeps.zroPaymentAddress);
      expect(actualLzExternalDeps.adapterParams).to.equal(lzExternalDeps.adapterParams);
      expect(actualLzExternalDeps.destinationChainId).to.equal(lzExternalDeps.destinationChainId);
    });
    it('should revert if called by non-owner', async () => {
      const { lzExternalDeps } = getL1FactoryParams();

      await expect(l1Factory.connect(SECOND).setLzExternalDeps(lzExternalDeps)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      );
    });
    it('should revert if endpoint is zero address', async () => {
      const { lzExternalDeps } = getL1FactoryParams();
      lzExternalDeps.endpoint = ZERO_ADDR;

      await expect(l1Factory.setLzExternalDeps(lzExternalDeps)).to.be.revertedWith('L1F: invalid LZ endpoint');
    });
    it('should revert if destinationChainId is zero', async () => {
      const { lzExternalDeps } = getL1FactoryParams();
      lzExternalDeps.destinationChainId = 0;

      await expect(l1Factory.setLzExternalDeps(lzExternalDeps)).to.be.revertedWith('L1F: invalid chain ID');
    });
  });

  describe('setArbExternalDeps', () => {
    it('should set arb external deps', async () => {
      const { arbExternalDeps } = getL1FactoryParams();

      await l1Factory.setArbExternalDeps(arbExternalDeps);

      const actualArbExternalDeps = await l1Factory.arbExternalDeps();
      expect(actualArbExternalDeps).to.equal(arbExternalDeps.endpoint);
    });
    it('should revert if called by non-owner', async () => {
      const { arbExternalDeps } = getL1FactoryParams();

      await expect(l1Factory.connect(SECOND).setArbExternalDeps(arbExternalDeps)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      );
    });
    it('should revert if endpoint is zero address', async () => {
      const { arbExternalDeps } = getL1FactoryParams();
      arbExternalDeps.endpoint = ZERO_ADDR;

      await expect(l1Factory.setArbExternalDeps(arbExternalDeps)).to.be.revertedWith('L1F: invalid ARB endpoint');
    });
  });

  describe('#setFeeConfig', () => {
    it('should set fee config', async () => {
      await l1Factory.setFeeConfig(feeConfig);

      expect(await l1Factory.feeConfig()).to.equal(await feeConfig.getAddress());
    });
    it('should revert if provided fee config is zero address', async () => {
      await expect(l1Factory.setFeeConfig(ZERO_ADDR)).to.be.revertedWith('L1F: invalid fee config');
    });
    it('should revert if called by non-owner', async () => {
      await expect(l1Factory.connect(SECOND).setFeeConfig(feeConfig)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      );
    });
  });

  describe('deploy', () => {
    beforeEach(async () => {
      const { depositTokenExternalDeps, lzExternalDeps, arbExternalDeps } = getL1FactoryParams();

      await l1Factory.setDepositTokenExternalDeps(depositTokenExternalDeps);
      await l1Factory.setLzExternalDeps(lzExternalDeps);
      await l1Factory.setArbExternalDeps(arbExternalDeps);
    });

    it('should deploy', async () => {
      const l1Params = getL1DefaultParams();

      await l1Factory.deploy(l1Params);

      const distribution = distributionFactory.attach(
        await l1Factory.getProxyPool(OWNER, l1Params.protocolName, PoolTypesL1.DISTRIBUTION),
      ) as Distribution;
      const l1Sender = l1SenderFactory.attach(
        await l1Factory.getProxyPool(OWNER, l1Params.protocolName, PoolTypesL1.L1_SENDER),
      ) as L1Sender;

      expect(await distribution.owner()).to.equal(OWNER);
      expect(await l1Sender.owner()).to.equal(OWNER);

      expect(await distribution.depositToken()).to.equal((await l1Factory.depositTokenExternalDeps()).token);
      expect(await distribution.l1Sender()).to.equal(l1Sender);

      expect(await l1Sender.unwrappedDepositToken()).to.equal((await l1Factory.depositTokenExternalDeps()).token);
      expect(await l1Sender.distribution()).to.equal(distribution);

      const depositTokenConfig = await l1Sender.depositTokenConfig();
      expect(depositTokenConfig.token).to.equal((await l1Factory.depositTokenExternalDeps()).wToken);
      expect(depositTokenConfig.gateway).to.equal(await l1Factory.arbExternalDeps());
      expect(depositTokenConfig.receiver).to.equal(l1Params.l2TokenReceiver);

      const rewardTokenConfig = await l1Sender.rewardTokenConfig();
      expect(rewardTokenConfig.gateway).to.equal((await l1Factory.lzExternalDeps()).endpoint);
      expect(rewardTokenConfig.receiver).to.equal(l1Params.l2MessageReceiver);
      expect(rewardTokenConfig.receiverChainId).to.equal((await l1Factory.lzExternalDeps()).destinationChainId);
      expect(rewardTokenConfig.zroPaymentAddress).to.equal((await l1Factory.lzExternalDeps()).zroPaymentAddress);
      expect(rewardTokenConfig.adapterParams).to.equal((await l1Factory.lzExternalDeps()).adapterParams);
    });
    it('should revert if contract is paused', async () => {
      await l1Factory.pause();

      await expect(l1Factory.deploy(getL1DefaultParams())).to.be.revertedWith('Pausable: paused');
    });
  });

  describe('#predictAddresses', () => {
    beforeEach(async () => {
      const { depositTokenExternalDeps, lzExternalDeps, arbExternalDeps } = getL1FactoryParams();

      await l1Factory.setDepositTokenExternalDeps(depositTokenExternalDeps);
      await l1Factory.setLzExternalDeps(lzExternalDeps);
      await l1Factory.setArbExternalDeps(arbExternalDeps);
    });

    it('should predict addresses', async () => {
      const l1Params = getL1DefaultParams();

      const [distribution, l1Sender] = await l1Factory.predictAddresses(OWNER, l1Params.protocolName);

      expect(distribution).to.be.properAddress;
      expect(l1Sender).to.be.properAddress;

      await l1Factory.deploy(l1Params);

      expect(await l1Factory.getProxyPool(OWNER, l1Params.protocolName, PoolTypesL1.DISTRIBUTION)).to.equal(
        distribution,
      );
      expect(await l1Factory.getProxyPool(OWNER, l1Params.protocolName, PoolTypesL1.L1_SENDER)).to.equal(l1Sender);
    });

    it('should predict zero if empty protocol', async () => {
      const [distribution, l1Sender] = await l1Factory.predictAddresses(OWNER, '');

      expect(distribution).to.eq(ZERO_ADDR);
      expect(l1Sender).to.eq(ZERO_ADDR);
    });
  });

  describe('#getDeployedPools', () => {
    beforeEach(async () => {
      const { depositTokenExternalDeps, lzExternalDeps, arbExternalDeps } = getL1FactoryParams();

      await l1Factory.setDepositTokenExternalDeps(depositTokenExternalDeps);
      await l1Factory.setLzExternalDeps(lzExternalDeps);
      await l1Factory.setArbExternalDeps(arbExternalDeps);
    });

    it('should predict addresses', async () => {
      const l1Params = getL1DefaultParams();

      const [distribution, l1Sender] = await l1Factory.predictAddresses(OWNER, l1Params.protocolName);

      await l1Factory.deploy(l1Params);

      expect(await l1Factory.countProtocols(OWNER)).to.equal(1);

      const pools = await l1Factory.getDeployedPools(OWNER, 0, 1);

      expect(pools[0].protocol).to.equal(l1Params.protocolName);
      expect(pools[0].distribution).to.equal(distribution);
      expect(pools[0].l1Sender).to.equal(l1Sender);
    });
  });
});
