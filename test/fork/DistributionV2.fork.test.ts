import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { assert } from 'console';
import { ethers } from 'hardhat';

import { getCurrentBlockTime, setNextTime, setTime } from '../helpers/block-helper';
import { oneDay } from '../helpers/distribution-helper';
import { Reverter } from '../helpers/reverter';

import { DistributionToBaseV2, L1FactoryToBase } from '@/generated-types/ethers';
import { wei } from '@/scripts/utils/utils';

describe('DistributionV2 Fork', () => {
  const reverter = new Reverter();

  let OWNER: SignerWithAddress;
  let SECOND: SignerWithAddress;

  let distribution: DistributionToBaseV2;

  const richAddress = '0x896C20Da40c2A4df9B7C98B16a8D5A95129161a5';
  const distributionToBaseAddress = '0xcB7FdF9ccbdA5C9E9968fa021C5A5d051C4fF35e';
  const l1FactoryToBaseAddress = '0x890BfA255E6EE8DB5c67aB32dc600B14EBc4546c';

  before(async () => {
    await ethers.provider.send('hardhat_reset', [
      {
        forking: {
          jsonRpcUrl: `https://mainnet.infura.io/v3/${process.env.INFURA_KEY}`,
          blockNumber: 20217400,
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
    const distributionV2Factory = await ethers.getContractFactory('DistributionToBaseV2', {
      libraries: {
        LinearDistributionIntervalDecrease: await lib.getAddress(),
      },
      signer: OWNER,
    });

    // Get existed contract and deploy new implementations
    const l1FactoryToBaseCurrent = l1FactoryToBaseFactory.attach(l1FactoryToBaseAddress) as L1FactoryToBase;
    const distributionV2Impl = await distributionV2Factory.deploy();
    distribution = distributionV2Factory.attach(distributionToBaseAddress) as DistributionToBaseV2;

    //// Upgrade to V2
    // Transfer ownersip
    const contractOwner = await ethers.getImpersonatedSigner(await l1FactoryToBaseCurrent.owner());
    await SECOND.sendTransaction({ to: contractOwner, value: wei(100) });
    await l1FactoryToBaseCurrent.connect(contractOwner).transferOwnership(OWNER);

    await l1FactoryToBaseCurrent
      .connect(OWNER)
      .setImplementations(['DISTRIBUTION'], [await distributionV2Impl.getAddress()]);

    assert((await distribution.version()) === 2n, 'Distribution should be upgraded to V2');

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
      expect(await distribution.depositToken()).to.be.eq('0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84');
      expect(await distribution.totalDepositedInPublicPools()).to.be.eq('10999999999999999');

      const userData = await distribution.usersData('0x05A1ff0a32bc24265BCB39499d0c5D9A6cb2011c', 0);
      expect(userData.lastStake).to.be.eq('1718337827');
      expect(userData.deposited).to.be.eq('10999999999999999');
      expect(userData.rate).to.be.eq('0');
      expect(userData.pendingRewards).to.be.eq('0');
      expect(userData.claimLockStart).to.be.eq('0');
      expect(userData.claimLockEnd).to.be.eq('0');

      const poolData = await distribution.poolsData(0);
      expect(poolData.lastUpdate).to.be.eq('1719029891');
      expect(poolData.rate).to.be.eq('11589585333877345759207353220078');
      expect(poolData.totalVirtualDeposited).to.be.eq('10999999999999999');

      expect(await distribution.getCurrentUserReward(0, '0x05A1ff0a32bc24265BCB39499d0c5D9A6cb2011c')).to.be.eq(
        '862904669381706126746983',
      );
    });
  });

  describe('should correctly lock claim', () => {
    let userPublicPool: SignerWithAddress;
    let userPrivatePool: SignerWithAddress;

    before(async () => {
      userPublicPool = await ethers.getImpersonatedSigner('0x05A1ff0a32bc24265BCB39499d0c5D9A6cb2011c');
      userPrivatePool = await ethers.getImpersonatedSigner('0xDe7f2A208cC3fB7522b3AeFF8Ee6352eCC84e33f');
    });

    it('should lock claim, public pool', async () => {
      let userData = await distribution.usersData(userPublicPool.address, 0);
      expect(userData.lastStake).to.be.eq('1718337827');

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
        distribution
          .connect(userPublicPool)
          .claim(0, '0x473FFa6AB954a7A003C554eeA90153DADB05a4E7', { value: wei(0.1) }),
      ).to.be.rejectedWith('DS: user claim is locked');

      userData = await distribution.usersData(userPublicPool.address, 0);
      expect(userData.claimLockStart).to.be.eq(claimLockStart);
      expect(userData.claimLockEnd).to.be.eq(claimLockEnd);
    });
    it('should lock claim, private pool', async () => {
      await SECOND.sendTransaction({ to: userPrivatePool, value: wei(1) });

      let userData = await distribution.usersData(userPrivatePool.address, 4);
      expect(userData.lastStake).to.be.eq('1718308319');

      // Move in feature to skip time restrictions
      await setTime((await getCurrentBlockTime()) + 10 * oneDay);

      const claimLockEnd = (await getCurrentBlockTime()) + 1000 * oneDay;

      await distribution.connect(userPrivatePool).lockClaim(4, claimLockEnd);
      userData = await distribution.usersData(userPrivatePool.address, 4);
      const claimLockStart = userData.claimLockStart;
      expect(userData.claimLockStart).to.be.eq(await getCurrentBlockTime());
      expect(userData.claimLockEnd).to.be.eq(claimLockEnd);

      // Claim should be locked
      await setNextTime(claimLockEnd - 10);
      await expect(
        distribution.connect(userPrivatePool).claim(4, userPrivatePool, { value: wei(0.1) }),
      ).to.be.rejectedWith('DS: user claim is locked');

      userData = await distribution.usersData(userPrivatePool.address, 4);
      expect(userData.claimLockStart).to.be.eq(claimLockStart);
      expect(userData.claimLockEnd).to.be.eq(claimLockEnd);
    });
    it('should stake, claim and withdraw from V1', async () => {
      // const userPublicPool = await ethers.getImpersonatedSigner(richAddress);
      const claimLockEnd = (await getCurrentBlockTime()) + 1050 * oneDay;

      let userData = await distribution.usersData(richAddress, 0);
      expect(userData.lastStake).to.be.eq('1718340623');

      // Move in feature to skip time restrictions
      await setNextTime((await getCurrentBlockTime()) + 1000 * oneDay);
      // Withdraw two times to check that nothing can't lock this proccess
      await distribution.connect(userPublicPool).withdraw(0, wei(0.000001));
      await distribution.connect(userPublicPool).withdraw(0, wei(0.000001));
      // Claim  two times to check that nothing can't lock this proccess
      await distribution.connect(userPublicPool).claim(0, richAddress, { value: wei(0.1) });
      await distribution.connect(userPublicPool).claim(0, richAddress, { value: wei(0.1) });

      await distribution.connect(userPublicPool).withdraw(0, wei(1));
      // Stake again
      await distribution.connect(userPublicPool).stake(0, wei(0.01) + 5n, 0);
      // Withdraw should be locked, claim should be available
      await expect(distribution.connect(userPublicPool).withdraw(0, wei(1))).to.be.rejectedWith(
        'DS: pool withdraw is locked',
      );
      await distribution.connect(userPublicPool).claim(0, richAddress, { value: wei(0.1) });

      // Move in feature to skip time restrictions
      await setNextTime((await getCurrentBlockTime()) + 20 * oneDay);
      await distribution.connect(userPublicPool).lockClaim(0, claimLockEnd);
      // Withdraw should be available
      await distribution.connect(userPublicPool).withdraw(0, wei(1));
      // Stake should be availalble
      await distribution.connect(userPublicPool).stake(0, wei(0.01) + 5n, 0);
      // Claim should be locked
      await expect(distribution.connect(userPublicPool).claim(0, richAddress, { value: wei(0.1) })).to.be.rejectedWith(
        'DS: user claim is locked',
      );

      userData = await distribution.usersData(userPublicPool.address, 0);
      expect(userData.claimLockStart).to.be.eq('1808034062');
      expect(userData.claimLockEnd).to.be.eq(claimLockEnd);
    });
  });
});

// npx hardhat test "test/fork/DistributionV2.fork.test.ts"
