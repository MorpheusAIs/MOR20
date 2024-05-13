import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import { LayerZeroEndpointV2Mock, MOR20 } from '@/generated-types/ethers';
import { ZERO_ADDR } from '@/scripts/utils/constants';
import { wei } from '@/scripts/utils/utils';
import { Reverter } from '@/test/helpers/reverter';

describe('MOR20', () => {
  const reverter = new Reverter();

  let OWNER: SignerWithAddress;
  let SECOND: SignerWithAddress;
  let MINTER: SignerWithAddress;
  let DELEGATE: SignerWithAddress;
  let LZ_ENDPOINT_OWNER: SignerWithAddress;

  let rewardToken: MOR20;
  let lZEndpointMock: LayerZeroEndpointV2Mock;

  const chainId = 101;

  before(async () => {
    [OWNER, SECOND, MINTER, DELEGATE, LZ_ENDPOINT_OWNER] = await ethers.getSigners();

    const [LZEndpointMock, MOR20] = await Promise.all([
      ethers.getContractFactory('LayerZeroEndpointV2Mock'),
      ethers.getContractFactory('MOR20'),
    ]);

    lZEndpointMock = await LZEndpointMock.deploy(chainId, LZ_ENDPOINT_OWNER);
    rewardToken = await MOR20.deploy('TEST', 'TST', lZEndpointMock, DELEGATE, MINTER);

    await reverter.snapshot();
  });

  afterEach(async () => {
    await reverter.revert();
  });

  describe('constructor', () => {
    it('should set the name and symbol', async () => {
      expect(await rewardToken.name()).to.equal('TEST');
      expect(await rewardToken.symbol()).to.equal('TST');
      expect(await rewardToken.isMinter(MINTER)).to.be.true;
    });
    it('should revert if LZ endpoint is zero address', async () => {
      const MOR20 = await ethers.getContractFactory('MOR20');

      await expect(MOR20.deploy('TEST', 'TST', lZEndpointMock, DELEGATE.address, ZERO_ADDR)).to.be.revertedWith(
        'MOR20: invalid minter',
      );
    });
  });

  describe('supportsInterface', () => {
    it('should support IToken', async () => {
      expect(await rewardToken.supportsInterface('0x38f90a90')).to.be.true;
    });
    it('should support IERC20', async () => {
      expect(await rewardToken.supportsInterface('0x36372b07')).to.be.true;
    });
    it('should support IOAppCore', async () => {
      expect(await rewardToken.supportsInterface('0x0c39d358')).to.be.true;
    });
    it('should support IERC165', async () => {
      expect(await rewardToken.supportsInterface('0x01ffc9a7')).to.be.true;
    });
  });

  describe('mint', () => {
    it('should mint tokens', async () => {
      const amount = wei('10');

      const tx = await rewardToken.connect(MINTER).mint(SECOND.address, amount);
      await expect(tx).to.changeTokenBalance(rewardToken, SECOND, amount);
    });
    it('should revert if not called by the owner', async () => {
      await expect(rewardToken.connect(SECOND).mint(SECOND.address, wei('10'))).to.be.revertedWith(
        'MOR20: invalid caller',
      );
    });
  });

  describe('#updateMinter', () => {
    it('should update the minter', async () => {
      await rewardToken.connect(DELEGATE).updateMinter(SECOND, true);

      expect(await rewardToken.isMinter(SECOND)).to.be.true;

      await rewardToken.connect(DELEGATE).updateMinter(SECOND, false);

      expect(await rewardToken.isMinter(SECOND)).to.be.false;
    });
    it('should revert if not called by the owner', async () => {
      await expect(rewardToken.connect(SECOND).updateMinter(SECOND, true)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      );
    });
  });

  describe('burn', () => {
    it('should burn tokens', async () => {
      const amount = wei('10');

      await rewardToken.connect(MINTER).mint(OWNER.address, amount);

      const tx = await rewardToken.burn(amount);

      await expect(tx).to.changeTokenBalance(rewardToken, OWNER, -amount);
    });
  });

  describe('burnFrom', () => {
    it('should burn tokens from another account', async () => {
      const amount = wei('10');

      await rewardToken.connect(MINTER).mint(OWNER.address, amount);

      await rewardToken.approve(SECOND.address, amount);

      const tx = await rewardToken.connect(SECOND).burnFrom(OWNER.address, amount);

      await expect(tx).to.changeTokenBalance(rewardToken, OWNER, -amount);

      expect(await rewardToken.allowance(OWNER.address, SECOND.address)).to.equal(0);
    });
  });
});
