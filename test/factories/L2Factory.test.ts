import {
  IL2Factory,
  L2Factory,
  L2FactoryV2,
  L2MessageReceiver,
  L2MessageReceiver__factory,
  L2TokenReceiver,
  L2TokenReceiver__factory,
  LZEndpointMock,
  LayerZeroEndpointV2Mock,
  MOR20,
  MOR20Deployer,
  MOR20__factory,
  NonfungiblePositionManagerMock,
  SwapRouterMock,
} from '@ethers-v6';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import { PoolTypesL2 } from '../helpers/helper';
import { Reverter } from '../helpers/reverter';

import { ETHER_ADDR, ZERO_ADDR } from '@/scripts/utils/constants';

describe('L2Factory', () => {
  const senderChainId = 101;

  const reverter = new Reverter();

  let OWNER: SignerWithAddress;
  let SECOND: SignerWithAddress;

  let l2Factory: L2Factory;

  let lzEndpoint: LZEndpointMock;
  let lzEndpointOFT: LayerZeroEndpointV2Mock;

  let swapRouter: SwapRouterMock;
  let nonfungiblePositionManager: NonfungiblePositionManagerMock;

  let l2MessageReceiverFactory: L2MessageReceiver__factory;
  let l2TokenReceiverFactory: L2TokenReceiver__factory;
  let MOR20Factory: MOR20__factory;

  before(async () => {
    [OWNER, SECOND] = await ethers.getSigners();

    const [
      ERC1967ProxyFactory,
      LZEndpointMockFactory,
      LayerZeroEndpointV2Mock,
      MOR20DeployerFactory,
      SwapRouterMock,
      NonfungiblePositionManagerMock,
    ] = await Promise.all([
      ethers.getContractFactory('ERC1967Proxy'),
      ethers.getContractFactory('LZEndpointMock'),
      ethers.getContractFactory('LayerZeroEndpointV2Mock'),
      ethers.getContractFactory('MOR20Deployer'),
      ethers.getContractFactory('SwapRouterMock'),
      ethers.getContractFactory('NonfungiblePositionManagerMock'),
    ]);

    [l2MessageReceiverFactory, l2TokenReceiverFactory, MOR20Factory] = await Promise.all([
      ethers.getContractFactory('L2MessageReceiver'),
      ethers.getContractFactory('L2TokenReceiver'),
      ethers.getContractFactory('MOR20'),
    ]);

    let l2MessageReceiver: L2MessageReceiver;
    let l2TokenReceiver: L2TokenReceiver;
    let MOR20Deployer: MOR20Deployer;
    [
      lzEndpoint,
      lzEndpointOFT,
      l2MessageReceiver,
      l2TokenReceiver,
      MOR20Deployer,
      swapRouter,
      nonfungiblePositionManager,
    ] = await Promise.all([
      LZEndpointMockFactory.deploy(senderChainId),
      LayerZeroEndpointV2Mock.deploy(senderChainId, OWNER),
      l2MessageReceiverFactory.deploy(),
      l2TokenReceiverFactory.deploy(),
      MOR20DeployerFactory.deploy(),
      SwapRouterMock.deploy(),
      NonfungiblePositionManagerMock.deploy(),
    ]);

    const l2FactoryFactory = await ethers.getContractFactory('L2Factory', {
      libraries: {
        MOR20Deployer: MOR20Deployer,
      },
    });
    const factoryImpl = await l2FactoryFactory.deploy();
    const factoryProxy = await ERC1967ProxyFactory.deploy(factoryImpl, '0x');
    l2Factory = l2FactoryFactory.attach(factoryProxy) as L2Factory;

    await l2Factory.L2Factory_init();

    const poolTypes = [PoolTypesL2.L2_MESSAGE_RECEIVER, PoolTypesL2.L2_TOKEN_RECEIVER];
    const poolImplementations = [await l2MessageReceiver.getAddress(), await l2TokenReceiver.getAddress()];

    await l2Factory.setImplementations(poolTypes, poolImplementations);

    await reverter.snapshot();
  });

  afterEach(reverter.revert);

  function getL2FactoryParams() {
    const lzTokenExternalDeps: IL2Factory.LzExternalDepsStruct = {
      endpoint: lzEndpoint,
      oftEndpoint: lzEndpointOFT,
      senderChainId: senderChainId,
    };

    const uniswapExternalDeps: IL2Factory.UniswapExternalDepsStruct = {
      router: swapRouter,
      nonfungiblePositionManager: nonfungiblePositionManager,
    };

    return { lzTokenExternalDeps, uniswapExternalDeps };
  }

  function getL2DefaultParams() {
    const l2Params: IL2Factory.L2ParamsStruct = {
      isUpgradeable: true,
      owner: OWNER,
      protocolName: 'Mor20',
      mor20Name: 'MOR20',
      mor20Symbol: 'M20',
      l1Sender: ZERO_ADDR,
      firstSwapParams_: {
        tokenIn: ETHER_ADDR,
        tokenOut: ETHER_ADDR,
        fee: 100,
      },
      secondSwapFee: 3000,
    };

    return l2Params;
  }

  describe('UUPS proxy functionality', () => {
    describe('#L2Factory_init', () => {
      it('should revert if try to call init function twice', async () => {
        const reason = 'Initializable: contract is already initialized';

        await expect(l2Factory.L2Factory_init()).to.be.rejectedWith(reason);
      });

      describe('#_authorizeUpgrade', () => {
        it('should correctly upgrade', async () => {
          const l2FactoryV2Factory = await ethers.getContractFactory('FactoryMockV2');
          const l2FactoryV2Implementation = await l2FactoryV2Factory.deploy();

          await l2Factory.upgradeTo(l2FactoryV2Implementation);

          const l2factoryV2 = l2FactoryV2Factory.attach(await l2FactoryV2Implementation.getAddress()) as L2FactoryV2;

          expect(await l2factoryV2.version()).to.eq(2);
        });
        it('should revert if caller is not the owner', async () => {
          await expect(l2Factory.connect(SECOND).upgradeTo(ZERO_ADDR)).to.be.revertedWith(
            'Ownable: caller is not the owner',
          );
        });
      });
    });
  });

  describe('setLzExternalDeps', () => {
    it('should set lz external deps', async () => {
      const { lzTokenExternalDeps } = getL2FactoryParams();

      await l2Factory.setLzExternalDeps(lzTokenExternalDeps);

      const actualLzTokenExternalDeps = await l2Factory.lzExternalDeps();
      expect(actualLzTokenExternalDeps.endpoint).to.equal(lzTokenExternalDeps.endpoint);
      expect(actualLzTokenExternalDeps.oftEndpoint).to.equal(lzTokenExternalDeps.oftEndpoint);
      expect(actualLzTokenExternalDeps.senderChainId).to.equal(lzTokenExternalDeps.senderChainId);
    });
    it('should revert if `endpoint` is zero address', async () => {
      const { lzTokenExternalDeps } = getL2FactoryParams();
      lzTokenExternalDeps.endpoint = ZERO_ADDR;

      await expect(l2Factory.setLzExternalDeps(lzTokenExternalDeps)).to.be.revertedWith('L2F: invalid LZ endpoint');
    });
    it('should revert if `oftEndpoint` is zero address', async () => {
      const { lzTokenExternalDeps } = getL2FactoryParams();
      lzTokenExternalDeps.oftEndpoint = ZERO_ADDR;

      await expect(l2Factory.setLzExternalDeps(lzTokenExternalDeps)).to.be.revertedWith('L2F: invalid LZ OFT endpoint');
    });
    it('should revert if `senderChainId` is zero', async () => {
      const { lzTokenExternalDeps } = getL2FactoryParams();
      lzTokenExternalDeps.senderChainId = 0;

      await expect(l2Factory.setLzExternalDeps(lzTokenExternalDeps)).to.be.revertedWith('L2F: invalid chain ID');
    });
    it('should revert if caller is not the owner', async () => {
      await expect(
        l2Factory.connect(SECOND).setLzExternalDeps(getL2FactoryParams().lzTokenExternalDeps),
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });

  describe('#setUniswapExternalDeps', () => {
    it('should set uniswap external deps', async () => {
      const { uniswapExternalDeps } = getL2FactoryParams();

      await l2Factory.setUniswapExternalDeps(uniswapExternalDeps);

      const actualUniswapExternalDeps = await l2Factory.uniswapExternalDeps();
      expect(actualUniswapExternalDeps.router).to.equal(uniswapExternalDeps.router);
      expect(actualUniswapExternalDeps.nonfungiblePositionManager).to.equal(
        uniswapExternalDeps.nonfungiblePositionManager,
      );
    });
    it('should revert if `router` is zero address', async () => {
      const { uniswapExternalDeps } = getL2FactoryParams();
      uniswapExternalDeps.router = ZERO_ADDR;

      await expect(l2Factory.setUniswapExternalDeps(uniswapExternalDeps)).to.be.revertedWith('L2F: invalid UNI router');
    });
    it('should revert if `nonfungiblePositionManager` is zero address', async () => {
      const { uniswapExternalDeps } = getL2FactoryParams();
      uniswapExternalDeps.nonfungiblePositionManager = ZERO_ADDR;

      await expect(l2Factory.setUniswapExternalDeps(uniswapExternalDeps)).to.be.revertedWith('L2F: invalid NPM');
    });
    it('should revert if caller is not the owner', async () => {
      await expect(
        l2Factory.connect(SECOND).setUniswapExternalDeps(getL2FactoryParams().uniswapExternalDeps),
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });

  describe('#getL2Network', () => {
    it('should return an empty string', async () => {
      expect(await l2Factory.getL2Network()).to.equal('');
    });
  });

  describe('#deploy', () => {
    beforeEach(async () => {
      const { lzTokenExternalDeps, uniswapExternalDeps } = getL2FactoryParams();

      await l2Factory.setLzExternalDeps(lzTokenExternalDeps);
      await l2Factory.setUniswapExternalDeps(uniswapExternalDeps);
    });

    it('should deploy', async () => {
      const l2Params = getL2DefaultParams();

      await l2Factory.deploy(l2Params);

      const l2MessageReceiver = l2MessageReceiverFactory.attach(
        await l2Factory.getProxyPool(OWNER, l2Params.protocolName, PoolTypesL2.L2_MESSAGE_RECEIVER),
      ) as L2MessageReceiver;
      const l2TokenReceiver = l2TokenReceiverFactory.attach(
        await l2Factory.getProxyPool(OWNER, l2Params.protocolName, PoolTypesL2.L2_TOKEN_RECEIVER),
      ) as L2TokenReceiver;
      const MOR = MOR20Factory.attach(await l2Factory.getMor20(OWNER, l2Params.protocolName)) as MOR20;

      expect(await l2MessageReceiver.owner()).to.equal(OWNER);
      expect(await l2TokenReceiver.owner()).to.equal(OWNER);

      // expect(await l2MessageReceiver.rewardToken()).to.equal(MOR);
      const config = await l2MessageReceiver.config();
      expect(config.gateway).to.equal((await l2Factory.lzExternalDeps()).endpoint);
      // expect(config.sender).to.equal();
      expect(config.senderChainId).to.equal((await l2Factory.lzExternalDeps()).senderChainId);

      expect(await l2TokenReceiver.router()).to.equal((await l2Factory.uniswapExternalDeps()).router);
      expect(await l2TokenReceiver.nonfungiblePositionManager()).to.equal(
        (await l2Factory.uniswapExternalDeps()).nonfungiblePositionManager,
      );

      const firstSwapParams = await l2TokenReceiver.firstSwapParams();
      expect(firstSwapParams.tokenIn).to.equal(l2Params.firstSwapParams_.tokenIn);
      expect(firstSwapParams.tokenOut).to.equal(l2Params.firstSwapParams_.tokenOut);
      expect(firstSwapParams.fee).to.equal(l2Params.firstSwapParams_.fee);

      const secondSwapParams = await l2TokenReceiver.secondSwapParams();
      expect(secondSwapParams.tokenIn).to.equal(l2Params.firstSwapParams_.tokenOut);
      expect(secondSwapParams.tokenOut).to.equal(MOR);
      expect(secondSwapParams.fee).to.equal(l2Params.secondSwapFee);

      expect(await MOR.owner()).to.equal(OWNER);
      expect(await MOR.name()).to.equal(l2Params.mor20Name);
      expect(await MOR.symbol()).to.equal(l2Params.mor20Symbol);
      expect(await MOR.endpoint()).to.equal((await l2Factory.lzExternalDeps()).oftEndpoint);
      expect(await MOR.isMinter(l2MessageReceiver)).to.be.true;
    });
    it('should revert if contract is paused', async () => {
      await l2Factory.pause();

      await expect(l2Factory.deploy(getL2DefaultParams())).to.be.revertedWith('Pausable: paused');
    });
  });

  describe('#predictAddresses', () => {
    beforeEach(async () => {
      const { lzTokenExternalDeps, uniswapExternalDeps } = getL2FactoryParams();

      await l2Factory.setLzExternalDeps(lzTokenExternalDeps);
      await l2Factory.setUniswapExternalDeps(uniswapExternalDeps);
    });

    it('should predict addresses', async () => {
      const l2Params = getL2DefaultParams();

      const [l2MessageReceiver, l2TokenReceiver] = await l2Factory.predictAddresses(OWNER, l2Params.protocolName);

      expect(l2MessageReceiver).to.be.properAddress;
      expect(l2TokenReceiver).to.be.properAddress;

      await l2Factory.deploy(l2Params);

      expect(await l2Factory.getProxyPool(OWNER, l2Params.protocolName, PoolTypesL2.L2_MESSAGE_RECEIVER)).to.equal(
        l2MessageReceiver,
      );

      expect(await l2Factory.getProxyPool(OWNER, l2Params.protocolName, PoolTypesL2.L2_TOKEN_RECEIVER)).to.equal(
        l2TokenReceiver,
      );
    });

    it('should predict zero if empty protocol', async () => {
      const [l2MessageReceiver, l2TokenReceiver] = await l2Factory.predictAddresses(OWNER, '');

      expect(l2MessageReceiver).to.eq(ZERO_ADDR);
      expect(l2TokenReceiver).to.eq(ZERO_ADDR);
    });
  });

  describe('#getDeployedPools', () => {
    beforeEach(async () => {
      const { lzTokenExternalDeps, uniswapExternalDeps } = getL2FactoryParams();

      await l2Factory.setLzExternalDeps(lzTokenExternalDeps);
      await l2Factory.setUniswapExternalDeps(uniswapExternalDeps);
    });

    it('should predict addresses', async () => {
      const l2Params = getL2DefaultParams();

      const [l2MessageReceiver, l2TokenReceiver] = await l2Factory.predictAddresses(OWNER, l2Params.protocolName);

      await l2Factory.deploy(l2Params);

      expect(await l2Factory.countProtocols(OWNER)).to.equal(1);

      const pools = await l2Factory.getDeployedPools(OWNER, 0, 1);

      expect(pools[0].protocol).to.equal(l2Params.protocolName);
      expect(pools[0].l2MessageReceiver).to.equal(l2MessageReceiver);
      expect(pools[0].l2TokenReceiver).to.equal(l2TokenReceiver);
    });
  });
});
