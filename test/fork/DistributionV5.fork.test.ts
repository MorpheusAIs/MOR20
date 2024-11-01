import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { assert } from 'console';
import { ethers } from 'hardhat';

import { getCurrentBlockTime, setNextTime, setTime } from '../helpers/block-helper';
import { oneDay } from '../helpers/distribution-helper';
import { Reverter } from '../helpers/reverter';

import { DistributionToBaseV4, L1FactoryToBase } from '@/generated-types/ethers';
import { wei } from '@/scripts/utils/utils';

describe('DistributionV4 Fork', () => {
  const reverter = new Reverter();

  let OWNER: SignerWithAddress;
  let SECOND: SignerWithAddress;

  let distribution: DistributionToBaseV4;

  const richAddress = '0xE74546162c7c58929b898575C378Fd7EC5B16998';
  const distributionToBaseAddress = '0x959AB8B319cc74437441542f0250BB90788eC57e';
  const l1FactoryToBaseAddress = '0x890bfa255e6ee8db5c67ab32dc600b14ebc4546c';

  before(async () => {
    await ethers.provider.send('hardhat_reset', [
      {
        forking: {
          jsonRpcUrl: `https://mainnet.infura.io/v3/${process.env.INFURA_KEY}`,
          blockNumber: 20863290,
        },
      },
    ]);

    OWNER = await ethers.getImpersonatedSigner(richAddress);
    [SECOND] = await ethers.getSigners();
    await SECOND.sendTransaction({ to: richAddress, value: wei(100) });

    // Get factories and deploy deps
    const libFactory = await ethers.getContractFactory('LinearDistributionIntervalDecrease', OWNER);
    const lib = await libFactory.deploy();

    const l1FactoryToBaseFactory = await ethers.getContractFactory('L1FactoryToBase');
    const distributionV2Factory = await ethers.getContractFactory('DistributionToBaseV4', {
      libraries: {
        LinearDistributionIntervalDecrease: await lib.getAddress(),
      },
      signer: OWNER,
    });

    // Get existed contract and deploy new implementations
    const l1FactoryToBaseCurrent = l1FactoryToBaseFactory.attach(l1FactoryToBaseAddress) as L1FactoryToBase;
    const distributionV4Impl = await distributionV2Factory.deploy();
    distribution = distributionV2Factory.attach(distributionToBaseAddress) as DistributionToBaseV4;

    //// Upgrade to V4
    // Transfer L1Factory ownersip
    const contractOwner = await ethers.getImpersonatedSigner(await l1FactoryToBaseCurrent.owner());
    await SECOND.sendTransaction({ to: contractOwner, value: wei(2) });
    await l1FactoryToBaseCurrent.connect(contractOwner).transferOwnership(OWNER);

    // Transfer L1Factory ownersip
    const distributionContractOwner = await ethers.getImpersonatedSigner(await distribution.owner());
    await SECOND.sendTransaction({ to: distributionContractOwner, value: wei(2) });
    await distribution.connect(distributionContractOwner).transferOwnership(OWNER);

    await l1FactoryToBaseCurrent
      .connect(OWNER)
      .setImplementations(['DISTRIBUTION'], [await distributionV4Impl.getAddress()]);

    assert((await distribution.version()) === 4n, 'Distribution should be upgraded to V4');

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
      expect(await distribution.totalDepositedInPublicPools()).to.be.eq('709914201826053577981');

      const userData = await distribution.usersData('0x678bC3C5811f2A2F8F411b3be3842173104F2EA6', 0);
      expect(userData.lastStake).to.be.eq('1726842743');
      expect(userData.deposited).to.be.eq('145056962656966207183');
      expect(userData.rate).to.be.eq('41750778068821793448554744718');
      expect(userData.pendingRewards).to.be.eq('0');
      expect(userData.claimLockStart).to.be.eq('0');
      expect(userData.claimLockEnd).to.be.eq('0');

      const poolData = await distribution.poolsData(0);
      expect(poolData.lastUpdate).to.be.eq('1727679707');
      expect(poolData.rate).to.be.eq('44795099144738127839236182076');
      expect(poolData.totalVirtualDeposited).to.be.eq('709914201826053577981');

      expect(await distribution.getCurrentUserReward(0, userPublicPool)).to.be.eq('47561629605315756393311');
    });
  });

  describe('should correctly lock claim', () => {
    let userPublicPool: SignerWithAddress;

    beforeEach(async () => {
      userPublicPool = await ethers.getImpersonatedSigner('0x678bC3C5811f2A2F8F411b3be3842173104F2EA6');
      await OWNER.sendTransaction({ to: userPublicPool, value: wei(2) });
    });

    it('should lock claim, public pool', async () => {
      let userData = await distribution.usersData(userPublicPool.address, 0);
      expect(userData.lastStake).to.be.eq('1726842743');

      // Move in feature to skip time restrictions
      await setTime((await getCurrentBlockTime()) + 10 * oneDay);

      const claimLockEnd = (await getCurrentBlockTime()) + 1000 * oneDay;

      await distribution.connect(userPublicPool).lockClaim(0, claimLockEnd);
      userData = await distribution.usersData(userPublicPool.address, 0);
      expect(userData.claimLockStart).to.be.eq(userData.claimLockStart);
      expect(userData.claimLockEnd).to.be.eq(claimLockEnd);

      // Withdraw should be available
      await distribution.connect(userPublicPool).withdraw(0, wei(1));
      // Stake should be availalble
      await distribution.connect(userPublicPool).stake(0, wei(0.0101), 0);
      const claimLockStart = await getCurrentBlockTime();
      // Claim should be locked
      await setNextTime(claimLockEnd - 10);
      await expect(
        distribution.connect(userPublicPool).claim(0, await userPublicPool.getAddress(), { value: wei(0.1) }),
      ).to.be.rejectedWith('DS: user claim is locked');

      userData = await distribution.usersData(userPublicPool.address, 0);
      expect(userData.claimLockStart).to.be.eq(claimLockStart);
      expect(userData.claimLockEnd).to.be.eq(claimLockEnd);
    });
  });

  describe('should correctly update claim lock period after stake', () => {
    let userPublicPool: SignerWithAddress;

    beforeEach(async () => {
      userPublicPool = await ethers.getImpersonatedSigner('0x678bC3C5811f2A2F8F411b3be3842173104F2EA6');
      await OWNER.sendTransaction({ to: userPublicPool, value: wei(2) });
    });

    it('should reset claim lock period after stake', async () => {
      let poolLimits = await distribution.poolsLimits(0);
      expect(poolLimits.claimLockPeriodAfterStake).to.be.eq(0);
      expect(poolLimits.claimLockPeriodAfterClaim).to.be.eq(0);

      await distribution.editPoolLimits(0, { claimLockPeriodAfterStake: 86400, claimLockPeriodAfterClaim: 3600 });
      poolLimits = await distribution.poolsLimits(0);
      expect(poolLimits.claimLockPeriodAfterStake).to.be.eq(86400);
      expect(poolLimits.claimLockPeriodAfterClaim).to.be.eq(3600);
    });
    it('should lock claim after the stake and after the claim', async () => {
      // Claim should be available
      await distribution.connect(userPublicPool).claim(0, await userPublicPool.getAddress(), { value: wei(0.1) });
      // Move in feature to skip time restrictions
      await setTime((await getCurrentBlockTime()) + 10 * oneDay);
      // Withdraw
      await distribution.connect(userPublicPool).withdraw(0, wei(999));
      // Stake again
      await distribution.connect(userPublicPool).stake(0, wei(0.3), 0);
      // Claim
      await distribution.connect(userPublicPool).claim(0, await userPublicPool.getAddress(), { value: wei(0.1) });

      // Set limits
      await distribution.editPoolLimits(0, { claimLockPeriodAfterStake: 3600, claimLockPeriodAfterClaim: 8400 });
      await expect(
        distribution.connect(userPublicPool).claim(0, await userPublicPool.getAddress(), { value: wei(0.1) }),
      ).to.be.rejectedWith('DS: pool claim is locked (S)');

      await setTime((await getCurrentBlockTime()) + 3600);
      await expect(
        distribution.connect(userPublicPool).claim(0, await userPublicPool.getAddress(), { value: wei(0.1) }),
      ).to.be.rejectedWith('DS: pool claim is locked (C)');

      // Move in feature to skip time restrictions
      await setTime((await getCurrentBlockTime()) + 86400);
      await distribution.connect(userPublicPool).claim(0, await userPublicPool.getAddress(), { value: wei(0.1) });
    });
    it('should stake, claim and withdraw from V1', async () => {
      const claimLockEnd = (await getCurrentBlockTime()) + 1050 * oneDay;

      // Move in feature to skip time restrictions
      await setNextTime((await getCurrentBlockTime()) + 1000 * oneDay);
      // Withdraw two times to check that nothing can't lock this proccess
      await distribution.connect(userPublicPool).withdraw(0, wei(0.000001));
      await distribution.connect(userPublicPool).withdraw(0, wei(0.000001));
      // Claim  two times to check that nothing can't lock this proccess
      await distribution.connect(userPublicPool).claim(0, await userPublicPool.getAddress(), { value: wei(0.1) });
      await distribution.connect(userPublicPool).claim(0, await userPublicPool.getAddress(), { value: wei(0.1) });

      await distribution.connect(userPublicPool).withdraw(0, wei(1));
      // Stake again
      await distribution.connect(userPublicPool).stake(0, wei(0.01) + 5n, 0);
      // Withdraw should be locked, claim should be available
      await expect(distribution.connect(userPublicPool).withdraw(0, wei(1))).to.be.rejectedWith(
        'DS: pool withdraw is locked',
      );
      await distribution.connect(userPublicPool).claim(0, await userPublicPool.getAddress(), { value: wei(0.1) });

      // Move in feature to skip time restrictions
      await setNextTime((await getCurrentBlockTime()) + 20 * oneDay);
      await distribution.connect(userPublicPool).lockClaim(0, claimLockEnd);
      // Withdraw should be available
      await distribution.connect(userPublicPool).withdraw(0, wei(1));
      // Stake should be availalble
      await distribution.connect(userPublicPool).stake(0, wei(0.01) + 5n, 0);
      // Claim should be locked
      await expect(
        distribution.connect(userPublicPool).claim(0, await userPublicPool.getAddress(), { value: wei(0.1) }),
      ).to.be.rejectedWith('DS: user claim is locked');

      const userData = await distribution.usersData(userPublicPool.address, 0);
      expect(userData.claimLockStart).to.be.eq('1815825161');
      expect(userData.claimLockEnd).to.be.eq(claimLockEnd);
    });
  });
});

// npx hardhat test "test/fork/DistributionV4.fork.test.ts"
