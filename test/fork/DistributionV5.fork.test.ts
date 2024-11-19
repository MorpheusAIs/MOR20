import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { assert } from 'console';
import { ethers } from 'hardhat';

import { getCurrentBlockTime, setNextTime, setTime } from '../helpers/block-helper';
import { getDefaultReferrerTiers, oneDay } from '../helpers/distribution-helper';
import { Reverter } from '../helpers/reverter';

import { DistributionToBaseV5, IDistributionV5, L1FactoryToBase, StETHMock } from '@/generated-types/ethers';
import { ZERO_ADDR } from '@/scripts/utils/constants';
import { wei } from '@/scripts/utils/utils';

describe('DistributionV5 Fork', () => {
  const reverter = new Reverter();

  let OWNER: SignerWithAddress;
  let SECOND: SignerWithAddress;

  let distribution: DistributionToBaseV5;
  let depositToken: StETHMock;

  const richAddress = '0xE74546162c7c58929b898575C378Fd7EC5B16998';
  const distributionToBaseAddress = '0x959AB8B319cc74437441542f0250BB90788eC57e';
  const l1FactoryToBaseAddress = '0x890bfa255e6ee8db5c67ab32dc600b14ebc4546c';
  const stETHAddress = '0xae7ab96520de3a18e5e111b5eaab095312d7fe84';

  before(async () => {
    await ethers.provider.send('hardhat_reset', [
      {
        forking: {
          jsonRpcUrl: `https://mainnet.infura.io/v3/${process.env.INFURA_KEY}`,
          blockNumber: 20988621,
        },
      },
    ]);

    OWNER = await ethers.getImpersonatedSigner(richAddress);
    [SECOND] = await ethers.getSigners();
    await SECOND.sendTransaction({ to: richAddress, value: wei(100) });

    // Get factories and deploy deps
    const libFactory = await ethers.getContractFactory('LinearDistributionIntervalDecrease', OWNER);
    const lib = await libFactory.deploy();
    const referrerLibFactory = await ethers.getContractFactory('ReferrerLib', OWNER);
    const referrerLib = await referrerLibFactory.deploy();

    const l1FactoryToBaseFactory = await ethers.getContractFactory('L1FactoryToBase');
    const stETHMockFactory = await ethers.getContractFactory('StETHMock');
    const distributionV5Factory = await ethers.getContractFactory('DistributionToBaseV5', {
      libraries: {
        LinearDistributionIntervalDecrease: await lib.getAddress(),
        ReferrerLib: await referrerLib.getAddress(),
      },
      signer: OWNER,
    });

    // Get existed contract and deploy new implementations
    const l1FactoryToBaseCurrent = l1FactoryToBaseFactory.attach(l1FactoryToBaseAddress) as L1FactoryToBase;
    const distributionV5Impl = await distributionV5Factory.deploy();
    distribution = distributionV5Factory.attach(distributionToBaseAddress) as DistributionToBaseV5;
    depositToken = stETHMockFactory.attach(stETHAddress) as StETHMock;

    //// Upgrade to V4
    // Transfer L1Factory ownership
    const contractOwner = await ethers.getImpersonatedSigner(await l1FactoryToBaseCurrent.owner());
    await SECOND.sendTransaction({ to: contractOwner, value: wei(2) });
    await l1FactoryToBaseCurrent.connect(contractOwner).transferOwnership(OWNER);

    // Transfer L1Factory ownership
    const distributionContractOwner = await ethers.getImpersonatedSigner(await distribution.owner());
    await SECOND.sendTransaction({ to: distributionContractOwner, value: wei(2) });
    await distribution.connect(distributionContractOwner).transferOwnership(OWNER);

    await l1FactoryToBaseCurrent
      .connect(OWNER)
      .setImplementations(['DISTRIBUTION'], [await distributionV5Impl.getAddress()]);

    assert((await distribution.version()) === 5n, 'Distribution should be upgraded to V5');

    await reverter.snapshot();
  });

  beforeEach(async () => {
    await reverter.revert();
  });

  after(async () => {
    await ethers.provider.send('hardhat_reset', []);
  });

  describe('should not change previous layout', () => {
    it('should have the same fields', async () => {
      const userPublicPool = '0x678bC3C5811f2A2F8F411b3be3842173104F2EA6';
      expect(await distribution.depositToken()).to.be.eq('0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84');
      expect(await distribution.totalDepositedInPublicPools()).to.be.eq('659408175202638420744');

      const userData = await distribution.usersData('0x678bC3C5811f2A2F8F411b3be3842173104F2EA6', 0);
      expect(userData.lastStake).to.be.eq('1728516623');
      expect(userData.deposited).to.be.eq('148521658461744216628');
      expect(userData.rate).to.be.eq('65014683785971571472268480661');
      expect(userData.pendingRewards).to.be.eq('0');
      expect(userData.claimLockStart).to.be.eq('0');
      expect(userData.claimLockEnd).to.be.eq('0');
      expect(userData.referrer).to.be.eq(ZERO_ADDR);

      const poolData = await distribution.poolsData(0);
      expect(poolData.lastUpdate).to.be.eq('1729208363');
      expect(poolData.rate).to.be.eq('66246014226928342700423303330');
      expect(poolData.totalVirtualDeposited).to.be.eq('659408175202638420744');

      expect(await distribution.getCurrentUserReward(0, userPublicPool)).to.be.eq('18289852351772607214894');
    });
  });

  describe('should correctly update referrer', () => {
    const referrerTiers = getDefaultReferrerTiers();

    beforeEach(async () => {
      await distribution.editReferrerTiers(0, referrerTiers);
    });

    it('should set referrerTiers', async () => {
      await distribution.editReferrerTiers(0, referrerTiers);

      for (let i = 0; i < referrerTiers.length; i++) {
        expect(_compareReferrerTierStructs(referrerTiers[i], await distribution.referrerTiers(0, i))).to.be.true;
      }
    });
    it('should apply referrer after stake', async () => {
      const userPublicPool = await ethers.getImpersonatedSigner('0x18C529e97297C7d7da79779714B288F5C034EBE1');
      await depositToken.connect(userPublicPool).approve(await distribution.getAddress(), wei(100));
      await OWNER.sendTransaction({ to: userPublicPool, value: wei(2) });

      await setTime((await getCurrentBlockTime()) + 100 * oneDay);
      await distribution.connect(userPublicPool).withdraw(0, wei(0.1));

      await distribution.connect(userPublicPool).stake(0, wei(0.1), 0, SECOND);
      let userData = await distribution.usersData(userPublicPool.address, 0);
      expect(userData.referrer).to.be.eq(SECOND.address);
      let referrerData = await distribution.referrersData(SECOND, 0);
      expect(referrerData.amountStaked).to.closeTo(wei(1), wei(0.0001));
      expect(referrerData.virtualAmountStaked).to.be.closeTo(wei(1 * 0.01), wei(0.0001));

      await setNextTime((await getCurrentBlockTime()) + 200 * oneDay);
      await distribution
        .connect(userPublicPool)
        .claim(0, '0x18C529e97297C7d7da79779714B288F5C034EBE1', { value: wei(0.1) });

      await distribution.connect(userPublicPool).withdraw(0, wei(100));
      userData = await distribution.usersData(userPublicPool.address, 0);
      expect(userData.referrer).to.be.eq(SECOND.address);
      referrerData = await distribution.referrersData(SECOND, 0);
      expect(referrerData.amountStaked).to.be.eq(wei(0));
      expect(referrerData.virtualAmountStaked).to.be.eq(0);
      expect(referrerData.pendingRewards).to.be.gt(0);

      await distribution.connect(SECOND).claimReferrerTier(0, SECOND, { value: wei(0.1) });
      referrerData = await distribution.referrersData(SECOND, 0);
      expect(referrerData.amountStaked).to.be.eq(0);
      expect(referrerData.virtualAmountStaked).to.be.eq(0);
      expect(referrerData.pendingRewards).to.be.eq(0);
    });
  });
});

const _compareReferrerTierStructs = (
  a: IDistributionV5.ReferrerTierStruct,
  b: IDistributionV5.ReferrerTierStruct,
): boolean => {
  return a.amount.toString() === b.amount.toString() && a.multiplier.toString() === b.multiplier.toString();
};

// npx hardhat test "test/fork/DistributionV5.fork.test.ts"
