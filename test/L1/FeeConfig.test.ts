import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import { Reverter } from '../helpers/reverter';

import { FeeConfig } from '@/generated-types/ethers';
import { ZERO_ADDR } from '@/scripts/utils/constants';
import { wei } from '@/scripts/utils/utils';

describe('FeeConfig', () => {
  let OWNER: SignerWithAddress;
  let SECOND: SignerWithAddress;

  let feeConfig: FeeConfig;

  const reverter = new Reverter();

  before(async () => {
    [OWNER, SECOND] = await ethers.getSigners();

    const [feeConfigFactory, ERC1967ProxyFactory] = await Promise.all([
      ethers.getContractFactory('FeeConfig'),
      ethers.getContractFactory('ERC1967Proxy'),
    ]);

    const feeConfigImpl = await feeConfigFactory.deploy();
    const feeConfigProxy = await ERC1967ProxyFactory.deploy(feeConfigImpl, '0x');
    feeConfig = feeConfigFactory.attach(feeConfigProxy) as FeeConfig;

    await feeConfig.FeeConfig_init(OWNER, wei(0.1, 25));

    await reverter.snapshot();
  });

  afterEach(reverter.revert);

  describe('initialization', () => {
    describe('#FeeConfig_init', () => {
      it('should revert if try to call init function twice', async () => {
        const reason = 'Initializable: contract is already initialized';

        await expect(feeConfig.FeeConfig_init(SECOND, wei(0.1, 25))).to.be.rejectedWith(reason);
      });
      it('should revert if `baseFee` is > 1', async () => {
        const [feeConfigFactory, ERC1967ProxyFactory] = await Promise.all([
          ethers.getContractFactory('FeeConfig'),
          ethers.getContractFactory('ERC1967Proxy'),
        ]);

        const feeConfigImpl = await feeConfigFactory.deploy();
        const feeConfigProxy = await ERC1967ProxyFactory.deploy(feeConfigImpl, '0x');
        const feeConfig = feeConfigFactory.attach(feeConfigProxy) as FeeConfig;

        await expect(feeConfig.FeeConfig_init(SECOND, wei(1.1, 25))).to.be.revertedWith('FC: invalid base fee');
      });
    });
  });

  describe('#setFee', () => {
    it('should set the fee', async () => {
      expect(await feeConfig.fees(SECOND)).to.be.equal(0);

      await feeConfig.setFee(SECOND, wei(0.2, 25));

      expect(await feeConfig.fees(SECOND)).to.be.equal(wei(0.2, 25));

      await feeConfig.setFee(SECOND, wei(0.1, 25));

      expect(await feeConfig.fees(SECOND)).to.be.equal(wei(0.1, 25));
    });
    it('should revert if not called by the owner', async () => {
      await expect(feeConfig.connect(SECOND).setFee(SECOND, wei(0.1, 25))).to.be.revertedWith(
        'Ownable: caller is not the owner',
      );
    });
    it('should revert if fee is greater than1', async () => {
      await expect(feeConfig.setFee(SECOND, wei(1.1, 25))).to.be.revertedWith('FC: invalid fee');
    });
  });

  describe('#setTreasury', () => {
    it('should set the treasury', async () => {
      await feeConfig.setTreasury(SECOND);

      expect(await feeConfig.treasury()).to.be.equal(SECOND);
    });
    it('should revert if not called by the owner', async () => {
      await expect(feeConfig.connect(SECOND).setTreasury(SECOND.address)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      );
    });
    it('should revert if treasury is zero address', async () => {
      await expect(feeConfig.setTreasury(ZERO_ADDR)).to.be.revertedWith('FC: invalid treasury');
    });
  });

  describe('#setBaseFee', () => {
    it('should set the base fee', async () => {
      await feeConfig.setBaseFee(wei(0.2, 25));

      expect(await feeConfig.baseFee()).to.be.equal(wei(0.2, 25));

      await feeConfig.setBaseFee(wei(1, 25));

      expect(await feeConfig.baseFee()).to.be.equal(wei(1, 25));
    });
    it('should revert if not called by the owner', async () => {
      await expect(feeConfig.connect(SECOND).setBaseFee(wei(0.1, 25))).to.be.revertedWith(
        'Ownable: caller is not the owner',
      );
    });
    it('should revert if fee is > 1', async () => {
      await expect(feeConfig.setBaseFee(wei(1.1, 25))).to.be.revertedWith('FC: invalid base fee');
    });
  });

  describe('#getFeeAndTreasury', () => {
    it('should return the base fee and treasury', async () => {
      const [fee, treasury] = await feeConfig.getFeeAndTreasury(SECOND);

      expect(fee).to.be.equal(wei(0.1, 25));
      expect(treasury).to.be.equal(OWNER);
    });
    it('should return the specific fee and treasury', async () => {
      await feeConfig.setFee(SECOND, wei(0.2, 25));
      await feeConfig.setTreasury(SECOND);

      const [fee, treasury] = await feeConfig.getFeeAndTreasury(SECOND);

      expect(fee).to.be.equal(wei(0.2, 25));
      expect(treasury).to.be.equal(SECOND);
    });
  });
});
