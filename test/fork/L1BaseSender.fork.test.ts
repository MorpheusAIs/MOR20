import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import { Reverter } from '../helpers/reverter';

import { IL1BaseSender, IStETH, IStETH__factory, L1BaseSender } from '@/generated-types/ethers';
import { ZERO_ADDR } from '@/scripts/utils/constants';
import { wei } from '@/scripts/utils/utils';

// @dev See txs https://etherscan.io/tx/0xf53b69bd170a9376b314f29326b63519c52e4c42c5c6d2db6183d55d2281ecf0 and
// https://basescan.org/tx/0xf9df3b1dce1b5323ffbddfeab0e0b0fcee0e8314ab66fe5fc4c4199a625c3173 as successful example

describe('L1ArbSender Fork', () => {
  const reverter = new Reverter();

  let OWNER: SignerWithAddress;
  let SECOND: SignerWithAddress;
  let LZ_RECEIVER: SignerWithAddress;
  let BASE_RECEIVER: SignerWithAddress;

  const baseBridgeParams = {
    stEth: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84',
    wstEthL1: '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
    wstEthL2: '0xc1cba3fcea344f92d9239c08c0568f6f2f0ee452',
    baseGateway: '0x9de443AdC5A411E83F1878Ef24C3F52C61571e72',
  };

  const lzBridgeParams = {
    gateway: '0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675',
    receiverChainId: 184,
    adapterParams: '0x',
    zroPaymentAddress: ZERO_ADDR,
  };

  const richAddress = '0xE53FFF67f9f384d20Ebea36F43b93DC49Ed22753';

  let l1BaseSender: L1BaseSender;
  let stEth: IStETH;

  before(async () => {
    await ethers.provider.send('hardhat_reset', [
      {
        forking: {
          jsonRpcUrl: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`,
        },
      },
    ]);

    // Get accounts
    OWNER = await ethers.getImpersonatedSigner(richAddress);
    [, SECOND, LZ_RECEIVER, BASE_RECEIVER] = await ethers.getSigners();

    // Connect existed contracts
    stEth = IStETH__factory.connect(baseBridgeParams.stEth, OWNER);

    // Get factories and deploy
    const [ERC1967ProxyFactory, L1BaseSenderFactory] = await Promise.all([
      ethers.getContractFactory('ERC1967Proxy', OWNER),
      ethers.getContractFactory('L1BaseSender', OWNER),
    ]);

    const l1BaseSenderImpl = await L1BaseSenderFactory.deploy();
    const l1BaseSenderProxy = await ERC1967ProxyFactory.deploy(l1BaseSenderImpl, '0x');

    // Initialize test contract
    const rewardTokenConfig = {
      gateway: lzBridgeParams.gateway,
      receiver: LZ_RECEIVER,
      receiverChainId: lzBridgeParams.receiverChainId,
      zroPaymentAddress: lzBridgeParams.zroPaymentAddress,
      adapterParams: lzBridgeParams.adapterParams,
    };
    const depositTokenConfig: IL1BaseSender.DepositTokenConfigStruct = {
      gateway: baseBridgeParams.baseGateway,
      l1Token: baseBridgeParams.wstEthL1,
      l2Token: baseBridgeParams.wstEthL2,
      receiver: BASE_RECEIVER,
    };

    l1BaseSender = L1BaseSenderFactory.attach(l1BaseSenderProxy) as L1BaseSender;
    await l1BaseSender.L1BaseSender__init(OWNER, rewardTokenConfig, depositTokenConfig);

    await reverter.snapshot();
  });

  beforeEach(async () => {
    await reverter.revert();
  });

  after(async () => {
    await ethers.provider.send('hardhat_reset', []);
  });

  describe('sendDepositToken', () => {
    it('should bridge depositTokens', async () => {
      const amount = wei(1);
      await stEth.transfer(l1BaseSender, amount);

      const gasLimit = 200_000;
      const data = '0x';

      const tokenBalanceBefore = await stEth.balanceOf(l1BaseSender);
      expect(tokenBalanceBefore).to.closeTo(amount, wei(0.0001));

      await l1BaseSender.sendDepositToken(gasLimit, data);
      const tokenBalanceAfter = await stEth.balanceOf(l1BaseSender);

      expect(tokenBalanceAfter).to.closeTo(0, wei(0.0001));
    });
  });

  describe('sendMintMessage', () => {
    it('should just successful sendMintMessage', async () => {
      await l1BaseSender.sendMintMessage(SECOND, wei(1), OWNER, {
        value: wei(1),
      });
    });
  });
});

// npx hardhat test "test/fork/L1BaseSender.fork.test.ts"
