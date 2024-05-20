import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import { Reverter } from './helpers/reverter';

import { FactoryMock, FactoryMockV2, PoolMockV1, PoolMockV2 } from '@/generated-types/ethers';
import { ZERO_ADDR } from '@/scripts/utils/constants';

describe('Factory', () => {
  const reverter = new Reverter();

  let OWNER: SignerWithAddress;
  let SECOND: SignerWithAddress;

  let factory: FactoryMock;
  let poolV1: PoolMockV1;
  let poolV2: PoolMockV2;

  before(async () => {
    [OWNER, SECOND] = await ethers.getSigners();

    const [FactoryMockFactory, ERC1967ProxyFactory, PoolMockV1, PoolMockV2] = await Promise.all([
      ethers.getContractFactory('FactoryMock'),
      ethers.getContractFactory('ERC1967Proxy'),
      ethers.getContractFactory('PoolMockV1'),
      ethers.getContractFactory('PoolMockV2'),
    ]);

    const factoryImpl = await FactoryMockFactory.deploy();
    const factoryProxy = await ERC1967ProxyFactory.deploy(factoryImpl, '0x');
    factory = FactoryMockFactory.attach(factoryProxy) as FactoryMock;

    await factory.Factory_init();

    poolV1 = await PoolMockV1.deploy();
    poolV2 = await PoolMockV2.deploy();

    await reverter.snapshot();
  });

  afterEach(reverter.revert);

  describe('UUPS proxy functionality', () => {
    describe('#Factory_init', () => {
      it('should revert if try to call init function twice', async () => {
        const reason = 'Initializable: contract is already initialized';

        await expect(factory.Factory_init()).to.be.rejectedWith(reason);
      });
      it('should revert if call init function incorrect', async () => {
        const reason = 'Initializable: contract is not initializing';

        await expect(factory.mockInit()).to.be.rejectedWith(reason);
      });
    });

    describe('#_authorizeUpgrade', () => {
      it('should correctly upgrade', async () => {
        const factoryV2Factory = await ethers.getContractFactory('FactoryMockV2');
        const factoryV2Implementation = await factoryV2Factory.deploy();

        await factory.upgradeTo(factoryV2Implementation);

        const factoryV2 = factoryV2Factory.attach(await factory.getAddress()) as FactoryMockV2;

        expect(await factoryV2.version()).to.eq(2);
      });
      it('should revert if caller is not the owner', async () => {
        await expect(factory.connect(SECOND).upgradeTo(ZERO_ADDR)).to.be.revertedWith(
          'Ownable: caller is not the owner',
        );
      });
    });
  });

  describe('pause', () => {
    it('should pause', async () => {
      expect(await factory.paused()).to.be.false;
      await factory.pause();
      expect(await factory.paused()).to.be.true;
    });
    it('should revert if called by non-owner', async () => {
      await expect(factory.connect(SECOND).pause()).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });

  describe('unpause', () => {
    it('should unpause', async () => {
      await factory.pause();
      expect(await factory.paused()).to.be.true;

      await factory.unpause();
      expect(await factory.paused()).to.be.false;
    });
    it('should revert if called by non-owner', async () => {
      await factory.pause();
      await expect(factory.connect(SECOND).unpause()).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });

  describe('freezePool', () => {
    it('should not freeze pool if pool not found', async () => {
      await expect(factory.freezePool('name', 0)).to.be.revertedWith('F: pool not found');
    });

    it('should freeze pool if all conditions are met', async () => {
      await factory.setImplementations([0, 1], [poolV1, poolV1]);

      await factory.deploy2('name', 0);
      await factory.deploy2('name', 1);

      await factory.freezePool('name', 0);

      await factory.setImplementations([0, 1], [poolV2, poolV2]);

      expect(await (poolV1.attach(await factory.deployedProxies(OWNER, 'name', 0)) as PoolMockV1).version()).to.eq(1);
      expect(await (poolV1.attach(await factory.deployedProxies(OWNER, 'name', 1)) as PoolMockV1).version()).to.eq(2);
    });
  });

  describe('unfreezePool', () => {
    it('should not unfreeze pool if pool not found', async () => {
      await expect(factory.unfreezePool('name', 0)).to.be.revertedWith('F: pool not found');
    });

    it('should unfreeze pool if all conditions are met', async () => {
      await factory.setImplementations([0, 1], [poolV1, poolV1]);

      await factory.deploy2('name', 0);
      await factory.deploy2('name', 1);

      await factory.freezePool('name', 0);

      await factory.setImplementations([0, 1], [poolV2, poolV2]);

      expect(await (poolV1.attach(await factory.deployedProxies(OWNER, 'name', 0)) as PoolMockV1).version()).to.eq(1);
      expect(await (poolV1.attach(await factory.deployedProxies(OWNER, 'name', 1)) as PoolMockV1).version()).to.eq(2);

      await factory.unfreezePool('name', 0);

      expect(await (poolV1.attach(await factory.deployedProxies(OWNER, 'name', 0)) as PoolMockV1).version()).to.eq(2);
    });
  });

  describe('setImplementations', () => {
    it('should set implementation', async () => {
      await factory.setImplementations([0], [poolV1]);

      expect(await factory.getImplementation(0)).to.eq(await poolV1.getAddress());

      await factory.setImplementations([0], [poolV2]);

      expect(await factory.getImplementation(0)).to.eq(await poolV2.getAddress());

      await factory.setImplementations([0], [poolV2]);

      expect(await factory.getImplementation(0)).to.eq(await poolV2.getAddress());
    });
    it('should revert if called by non-owner', async () => {
      await expect(factory.connect(SECOND).setImplementations([0], [poolV1])).to.be.revertedWith(
        'Ownable: caller is not the owner',
      );
    });
  });

  describe('getImplementation', () => {
    it('should get implementation', async () => {
      await expect(factory.getImplementation(0)).to.be.revertedWith('F: beacon not found');

      await factory.setImplementations([0], [poolV1]);

      expect(await factory.getImplementation(0)).to.eq(await poolV1.getAddress());
    });
  });

  describe('deploy2', () => {
    beforeEach(async () => {
      const L1SenderFactory = await ethers.getContractFactory('L1Sender');
      const L1SenderImplementation = await L1SenderFactory.deploy();

      await factory.setImplementations([0], [L1SenderImplementation]);
    });

    it('should deploy contract', async () => {
      const proxy = await factory.deploy2.staticCall('name', 0);
      await factory.deploy2('name', 0);

      expect(await factory.deployedProxies(OWNER, 'name', 0)).to.eq(proxy);
    });
    it('should deploy the same name for different addresses', async () => {
      await factory.deploy2('name', 0);

      await factory.connect(SECOND).deploy2('name', 0);
    });
    it('should revert if name is an empty string', async () => {
      await expect(factory.deploy2('', 0)).to.be.revertedWith('F: poolName_ is empty');
    });
    it('should revert if implementation is not set', async () => {
      await expect(factory.deploy2('name', 1)).to.be.revertedWith('F: beacon not found');
    });
    it('should revert if called twice with the same name for same address', async () => {
      await factory.deploy2('name', 0);

      await expect(factory.deploy2('name', 0)).to.be.revertedWith('F: salt used');
    });
  });
});
