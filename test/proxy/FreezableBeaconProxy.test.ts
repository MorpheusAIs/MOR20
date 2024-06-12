import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import { Reverter } from '../helpers/reverter';

import { FreezableBeaconProxy, PoolMockV1, PoolMockV2, UpgradeableBeacon } from '@/generated-types/ethers';

describe('FreezableBeaconProxy', () => {
  const reverter = new Reverter();

  let SECOND: SignerWithAddress;

  let beaconProxy: FreezableBeaconProxy;
  let beacon: UpgradeableBeacon;
  let poolV1: PoolMockV1;
  let poolV2: PoolMockV2;

  before(async () => {
    SECOND = (await ethers.getSigners())[1];

    const [FreezableBeaconProxy, UpgradeableBeacon, PoolMockV1, PoolMockV2] = await Promise.all([
      ethers.getContractFactory('FreezableBeaconProxy'),
      ethers.getContractFactory('UpgradeableBeacon'),
      ethers.getContractFactory('PoolMockV1'),
      ethers.getContractFactory('PoolMockV2'),
    ]);

    poolV1 = await PoolMockV1.deploy();
    poolV2 = await PoolMockV2.deploy();

    beacon = await UpgradeableBeacon.deploy(poolV1);
    beaconProxy = await FreezableBeaconProxy.deploy(beacon, '0x');

    const proxy = PoolMockV1.attach(beaconProxy) as PoolMockV1;
    await proxy.PoolMockV1_init();

    await reverter.snapshot();
  });

  afterEach(reverter.revert);

  describe('freeze', () => {
    it('should not freeze if not owner', async () => {
      await expect(beaconProxy.connect(SECOND).freeze()).to.be.revertedWith('FBP: caller is not the owner');
    });

    it('should not freeze if already frozen', async () => {
      await beaconProxy.freeze();
      await expect(beaconProxy.freeze()).to.be.revertedWith('FBP: already frozen');
    });

    it('should not freeze if all conditions are met', async () => {
      await beaconProxy.freeze();

      await beacon.upgradeTo(poolV2);

      expect(await beaconProxy.implementation()).to.eq(await poolV1.getAddress());
    });
  });

  describe('unfreeze', () => {
    it('should not freeze if not owner', async () => {
      await expect(beaconProxy.connect(SECOND).unfreeze()).to.be.revertedWith('FBP: caller is not the owner');
    });

    it('should not freeze if not frozen', async () => {
      await expect(beaconProxy.unfreeze()).to.be.revertedWith('FBP: not frozen');
    });

    it('should not freeze if all conditions are met', async () => {
      await beaconProxy.freeze();

      await beacon.upgradeTo(poolV2);

      expect(await beaconProxy.implementation()).to.eq(await poolV1.getAddress());

      await beaconProxy.unfreeze();

      expect(await beaconProxy.implementation()).to.eq(await poolV2.getAddress());

      await beacon.upgradeTo(poolV1);

      expect(await beaconProxy.implementation()).to.eq(await poolV1.getAddress());
    });
  });

  describe('isFrozen', () => {
    it('should properly check if frozen', async () => {
      expect(await beaconProxy.isFrozen()).to.be.false;

      await beaconProxy.freeze();

      expect(await beaconProxy.isFrozen()).to.be.true;

      await beaconProxy.unfreeze();

      expect(await beaconProxy.isFrozen()).to.be.false;
    });
  });
});
