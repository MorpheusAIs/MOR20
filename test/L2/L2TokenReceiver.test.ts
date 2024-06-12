import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import { getDefaultSwapParams } from '../helpers/distribution-helper';
import { Reverter } from '../helpers/reverter';

import {
  IL2TokenReceiver,
  L2TokenReceiver,
  LayerZeroEndpointV2Mock,
  MOR20,
  NonfungiblePositionManagerMock,
  StETHMock,
  SwapRouterMock,
} from '@/generated-types/ethers';
import { ZERO_ADDR } from '@/scripts/utils/constants';

describe('L2TokenReceiver', () => {
  const reverter = new Reverter();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let OWNER: SignerWithAddress;
  let SECOND: SignerWithAddress;

  let lZEndpointMockOFT: LayerZeroEndpointV2Mock;

  let swapRouter: SwapRouterMock;
  let nonfungiblePositionManager: NonfungiblePositionManagerMock;

  let l2TokenReceiver: L2TokenReceiver;
  let inputToken: StETHMock;
  let outputToken: MOR20;
  before(async () => {
    [OWNER, SECOND] = await ethers.getSigners();

    const [
      ERC1967ProxyFactory,
      L2TokenReceiver,
      StETHMock,
      Mor,
      SwapRouterMock,
      NonfungiblePositionManagerMock,
      LZEndpointMockOFT,
    ] = await Promise.all([
      ethers.getContractFactory('ERC1967Proxy'),
      ethers.getContractFactory('L2TokenReceiver'),
      ethers.getContractFactory('StETHMock'),
      ethers.getContractFactory('MOR20'),
      ethers.getContractFactory('SwapRouterMock'),
      ethers.getContractFactory('NonfungiblePositionManagerMock'),
      ethers.getContractFactory('LayerZeroEndpointV2Mock'),
    ]);

    let l2TokenReceiverImplementation: L2TokenReceiver;

    lZEndpointMockOFT = await LZEndpointMockOFT.deploy(1, OWNER);

    [inputToken, outputToken, swapRouter, nonfungiblePositionManager, l2TokenReceiverImplementation] =
      await Promise.all([
        StETHMock.deploy(),
        Mor.deploy('MOR', 'MOR', lZEndpointMockOFT, OWNER, OWNER),
        SwapRouterMock.deploy(),
        NonfungiblePositionManagerMock.deploy(),
        L2TokenReceiver.deploy(),
      ]);

    const l2TokenReceiverProxy = await ERC1967ProxyFactory.deploy(l2TokenReceiverImplementation, '0x');
    l2TokenReceiver = L2TokenReceiver.attach(l2TokenReceiverProxy) as L2TokenReceiver;
    await l2TokenReceiver.L2TokenReceiver__init(
      swapRouter,
      nonfungiblePositionManager,
      {
        tokenIn: inputToken,
        tokenOut: outputToken,
        fee: 500,
      },
      {
        tokenIn: inputToken,
        tokenOut: outputToken,
        fee: 500,
      },
    );

    await reverter.snapshot();
  });

  beforeEach(async () => {
    await reverter.revert();
  });

  describe('initialization', () => {
    it('should disable initialize function', async () => {
      const reason = 'Initializable: contract is already initialized';

      const l2TokenReceiver = await (await ethers.getContractFactory('L2TokenReceiver')).deploy();

      await expect(
        l2TokenReceiver.L2TokenReceiver__init(
          swapRouter,
          nonfungiblePositionManager,
          {
            tokenIn: inputToken,
            tokenOut: outputToken,
            fee: 500,
          },
          {
            tokenIn: inputToken,
            tokenOut: outputToken,
            fee: 500,
          },
        ),
      ).to.be.rejectedWith(reason);
    });

    describe('#L2TokenReceiver__init', () => {
      it('should revert if try to call init function twice', async () => {
        const reason = 'Initializable: contract is already initialized';

        await expect(
          l2TokenReceiver.L2TokenReceiver__init(
            swapRouter,
            nonfungiblePositionManager,
            {
              tokenIn: inputToken,
              tokenOut: outputToken,
              fee: 500,
            },
            {
              tokenIn: inputToken,
              tokenOut: outputToken,
              fee: 500,
            },
          ),
        ).to.be.rejectedWith(reason);
      });
      it('should set router', async () => {
        expect(await l2TokenReceiver.router()).to.equal(await swapRouter.getAddress());
      });
      it('should set params', async () => {
        const defaultParams = getDefaultSwapParams(await inputToken.getAddress(), await outputToken.getAddress());
        const params = await l2TokenReceiver.secondSwapParams();

        expect(params.tokenIn).to.equal(defaultParams.tokenIn);
        expect(params.tokenOut).to.equal(defaultParams.tokenOut);
        expect(params.fee).to.equal(defaultParams.fee);
      });
      it('should give allowance', async () => {
        expect(await inputToken.allowance(l2TokenReceiver, swapRouter)).to.equal(ethers.MaxUint256);
        expect(await inputToken.allowance(l2TokenReceiver, nonfungiblePositionManager)).to.equal(ethers.MaxUint256);
        expect(await outputToken.allowance(l2TokenReceiver, nonfungiblePositionManager)).to.equal(ethers.MaxUint256);
      });
    });
  });

  describe('supportsInterface', () => {
    it('should support IL2TokenReceiver', async () => {
      expect(await l2TokenReceiver.supportsInterface('0xe15df538')).to.be.true;
    });
    it('should support IERC165', async () => {
      expect(await l2TokenReceiver.supportsInterface('0x01ffc9a7')).to.be.true;
    });
    it('should support IERC721Receiver', async () => {
      expect(await l2TokenReceiver.supportsInterface('0x150b7a02')).to.be.true;
    });
  });

  describe('#editParams', () => {
    it('should edit params', async () => {
      const newParams: IL2TokenReceiver.SwapParamsStruct = {
        tokenIn: await outputToken.getAddress(),
        tokenOut: await inputToken.getAddress(),
        fee: 1,
      };

      await l2TokenReceiver.editParams(newParams, false);

      const params = await l2TokenReceiver.secondSwapParams();

      expect(params.tokenIn).to.equal(newParams.tokenIn);
      expect(params.tokenOut).to.equal(newParams.tokenOut);
      expect(params.fee).to.equal(newParams.fee);
    });
    it('should set new allowance', async () => {
      const newParams: IL2TokenReceiver.SwapParamsStruct = {
        tokenIn: await outputToken.getAddress(),
        tokenOut: await inputToken.getAddress(),
        fee: 1,
      };

      await l2TokenReceiver.editParams(newParams, false);

      expect(await inputToken.allowance(l2TokenReceiver, swapRouter)).to.equal(0);
      expect(await inputToken.allowance(l2TokenReceiver, nonfungiblePositionManager)).to.equal(ethers.MaxUint256);
      expect(await outputToken.allowance(l2TokenReceiver, swapRouter)).to.equal(ethers.MaxUint256);
      expect(await outputToken.allowance(l2TokenReceiver, nonfungiblePositionManager)).to.equal(ethers.MaxUint256);
    });
    it('should revert if caller is not owner', async () => {
      await expect(
        l2TokenReceiver.connect(SECOND).editParams(getDefaultSwapParams(ZERO_ADDR, ZERO_ADDR), false),
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
    it('should revert if tokenIn is zero address', async () => {
      await expect(
        l2TokenReceiver.editParams(getDefaultSwapParams(ZERO_ADDR, await outputToken.getAddress()), false),
      ).to.be.revertedWith('L2TR: invalid tokenIn');
    });
    it('should revert if tokenOut is zero address', async () => {
      await expect(
        l2TokenReceiver.editParams(getDefaultSwapParams(await inputToken.getAddress(), ZERO_ADDR), false),
      ).to.be.revertedWith('L2TR: invalid tokenOut');
    });
  });

  describe('#swap', () => {
    it('should return if caller is not the owner', async () => {
      await expect(l2TokenReceiver.connect(SECOND).swap(1, 1, 1, 0, false)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      );
    });
    it('should revert if time is expired', async () => {
      await expect(l2TokenReceiver.swap(1, 0, 0, 0, false)).to.be.revertedWith('L2TR: Transaction too old');
    });
  });

  describe('#increaseLiquidityCurrentRange', () => {
    it('should return if caller is not the owner', async () => {
      await expect(l2TokenReceiver.connect(SECOND).increaseLiquidityCurrentRange(1, 1, 1, 0, 0)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      );
    });
  });

  describe('#decreaseLiquidityCurrentRange', () => {
    it('should return if caller is not the owner', async () => {
      await expect(l2TokenReceiver.connect(SECOND).decreaseLiquidityCurrentRange(1, 1, 0, 0)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      );
    });
  });

  describe('#withdrawToken', () => {
    it('should withdraw token', async () => {
      await inputToken.mint(l2TokenReceiver, 1);

      const tx = await l2TokenReceiver.withdrawToken(OWNER, inputToken, 1);

      await expect(tx).to.changeTokenBalances(inputToken, [l2TokenReceiver, OWNER], [-1, 1]);
    });
    it('should return if caller is not the owner', async () => {
      await expect(l2TokenReceiver.connect(SECOND).withdrawToken(OWNER, inputToken, 1)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      );
    });
  });

  describe('#withdrawTokenId', () => {
    it('should return if caller is not the owner', async () => {
      await expect(l2TokenReceiver.connect(SECOND).withdrawTokenId(OWNER, OWNER, 0)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      );
    });
  });
});

// npx hardhat test "test/L2TokenReceiver.test.ts"
