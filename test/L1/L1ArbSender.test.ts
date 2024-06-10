import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { Typed } from 'ethers';
import { ethers } from 'hardhat';

import {
  GatewayRouterMock,
  IL1ArbSender,
  L1ArbSender,
  L2MessageReceiver,
  LZEndpointMock,
  LayerZeroEndpointV2Mock,
  MOR20,
  StETHMock,
  WStETHMock,
} from '@/generated-types/ethers';
import { IL1Sender } from '@/generated-types/ethers/contracts/L1/L1BaseSender';
import { ZERO_ADDR } from '@/scripts/utils/constants';
import { Reverter } from '@/test/helpers/reverter';

describe('L1ArbSender', () => {
  const senderChainId = 101;
  const receiverChainId = 110;

  const reverter = new Reverter();

  let OWNER: SignerWithAddress;
  let SECOND: SignerWithAddress;

  let unwrappedToken: StETHMock;
  let depositToken: WStETHMock;

  let lZEndpointMockL1: LZEndpointMock;
  let lZEndpointMockL2: LZEndpointMock;
  let lZEndpointMockOFT: LayerZeroEndpointV2Mock;

  let gatewayRouter: GatewayRouterMock;

  let l1ArbSender: L1ArbSender;
  let l2MessageReceiver: L2MessageReceiver;

  let rewardToken: MOR20;
  before(async () => {
    [OWNER, SECOND] = await ethers.getSigners();

    const [
      ERC1967ProxyFactory,
      LZEndpointMock,
      Mor,
      L1ArbSender,
      GatewayRouterMock,
      StETHMock,
      WStETHMock,
      L2MessageReceiver,
      LZEndpointMockOFT,
    ] = await Promise.all([
      ethers.getContractFactory('ERC1967Proxy'),
      ethers.getContractFactory('LZEndpointMock'),
      ethers.getContractFactory('MOR20'),
      ethers.getContractFactory('L1ArbSender'),
      ethers.getContractFactory('GatewayRouterMock'),
      ethers.getContractFactory('StETHMock'),
      ethers.getContractFactory('WStETHMock'),
      ethers.getContractFactory('L2MessageReceiver'),
      ethers.getContractFactory('LayerZeroEndpointV2Mock'),
    ]);

    lZEndpointMockOFT = await LZEndpointMockOFT.deploy(receiverChainId, OWNER);

    let l1ArbSenderImplementation: L1ArbSender;
    let l2MessageReceiverImplementation: L2MessageReceiver;

    [
      lZEndpointMockL1,
      lZEndpointMockL2,
      l1ArbSenderImplementation,
      unwrappedToken,
      l2MessageReceiverImplementation,
      gatewayRouter,
    ] = await Promise.all([
      LZEndpointMock.deploy(senderChainId),
      LZEndpointMock.deploy(receiverChainId),
      L1ArbSender.deploy(),
      StETHMock.deploy(),
      L2MessageReceiver.deploy(),
      GatewayRouterMock.deploy(),
    ]);
    depositToken = await WStETHMock.deploy(unwrappedToken);

    const l2MessageReceiverProxy = await ERC1967ProxyFactory.deploy(l2MessageReceiverImplementation, '0x');
    l2MessageReceiver = L2MessageReceiver.attach(l2MessageReceiverProxy) as L2MessageReceiver;

    rewardToken = await Mor.deploy('MOR', 'MOR', lZEndpointMockOFT, OWNER, l2MessageReceiver);

    const rewardTokenConfig = {
      gateway: lZEndpointMockL1,
      receiver: l2MessageReceiver,
      receiverChainId: receiverChainId,
      zroPaymentAddress: ZERO_ADDR,
      adapterParams: '0x',
    };
    const depositTokenConfig: IL1ArbSender.DepositTokenConfigStruct = {
      token: depositToken,
      gateway: gatewayRouter,
      receiver: SECOND,
    };

    const l1ArbSenderProxy = await ERC1967ProxyFactory.deploy(l1ArbSenderImplementation, '0x');
    l1ArbSender = L1ArbSender.attach(l1ArbSenderProxy) as L1ArbSender;
    await l1ArbSender.L1ArbSender__init(OWNER, rewardTokenConfig, depositTokenConfig);

    await l2MessageReceiver.L2MessageReceiver__init(rewardToken, {
      gateway: lZEndpointMockL2,
      sender: l1ArbSender,
      senderChainId: senderChainId,
    });

    await lZEndpointMockL1.setDestLzEndpoint(l2MessageReceiver, lZEndpointMockL2);

    await rewardToken.transferOwnership(l2MessageReceiver);

    await reverter.snapshot();
  });

  beforeEach(async () => {
    await reverter.revert();
  });

  describe('initialization', () => {
    let rewardTokenConfig: Typed | IL1Sender.RewardTokenConfigStruct;
    let depositTokenConfig: IL1ArbSender.DepositTokenConfigStruct;

    before(async () => {
      rewardTokenConfig = {
        gateway: lZEndpointMockL1,
        receiver: l2MessageReceiver,
        receiverChainId: receiverChainId,
        zroPaymentAddress: ZERO_ADDR,
        adapterParams: '0x',
      };
      depositTokenConfig = {
        token: depositToken,
        gateway: gatewayRouter,
        receiver: SECOND,
      };
    });

    describe('#constructor', () => {
      it('should disable initialize function', async () => {
        const reason = 'Initializable: contract is already initialized';

        const l1ArbSender = await (await ethers.getContractFactory('L1ArbSender')).deploy();

        await expect(l1ArbSender.L1ArbSender__init(OWNER, rewardTokenConfig, depositTokenConfig)).to.be.rejectedWith(
          reason,
        );
      });
    });

    describe('#L1ArbSender__init', () => {
      it('should revert if try to call init function twice', async () => {
        const reason = 'Initializable: contract is already initialized';

        await expect(l1ArbSender.L1ArbSender__init(OWNER, rewardTokenConfig, depositTokenConfig)).to.be.rejectedWith(
          reason,
        );
      });
      it('should setup config', async () => {
        expect(await l1ArbSender.distribution()).to.be.equal(OWNER.address);

        expect(await l1ArbSender.rewardTokenConfig()).to.be.deep.equal([
          await lZEndpointMockL1.getAddress(),
          await l2MessageReceiver.getAddress(),
          receiverChainId,
          ZERO_ADDR,
          '0x',
        ]);

        expect(await l1ArbSender.depositTokenConfig()).to.be.deep.equal([
          await depositToken.getAddress(),
          await gatewayRouter.getAddress(),
          SECOND.address,
        ]);

        expect(await unwrappedToken.allowance(l1ArbSender, depositToken)).to.be.equal(ethers.MaxUint256);
        expect(await depositToken.allowance(l1ArbSender, gatewayRouter)).to.be.equal(ethers.MaxUint256);
      });
      it('should revert if receiver is zero address', async () => {
        const [ERC1967ProxyFactory, L1Sender] = await Promise.all([
          ethers.getContractFactory('ERC1967Proxy'),
          ethers.getContractFactory('L1ArbSender'),
        ]);
        const l1SenderImplementation = await L1Sender.deploy();
        const l1SenderProxy = await ERC1967ProxyFactory.deploy(l1SenderImplementation, '0x');
        const l1Sender = L1Sender.attach(l1SenderProxy) as L1ArbSender;

        await expect(
          l1Sender.L1ArbSender__init(OWNER, rewardTokenConfig, {
            ...depositTokenConfig,
            receiver: ZERO_ADDR,
          }),
        ).to.be.rejectedWith('L1S: invalid receiver');
      });
    });
  });

  describe('supportsInterface', () => {
    it('should support IL1ArbSender', async () => {
      expect(await l1ArbSender.supportsInterface('0x11c022b4')).to.be.true;
    });
    it('should support IERC165', async () => {
      expect(await l1ArbSender.supportsInterface('0x01ffc9a7')).to.be.true;
    });
  });

  describe('setRewardTokenLZParams', () => {
    it('should update lz params', async () => {
      await l1ArbSender.setRewardTokenLZParams(SECOND, '0x1234');

      const config = await l1ArbSender.rewardTokenConfig();
      expect(config.gateway).to.eq(await lZEndpointMockL1.getAddress());
      expect(config.receiver).to.eq(await l2MessageReceiver.getAddress());
      expect(config.receiverChainId).to.eq(receiverChainId);
      expect(config.zroPaymentAddress).to.eq(await SECOND.getAddress());
      expect(config.adapterParams).to.eq('0x1234');
    });
    it('should revert if not called by the owner', async () => {
      await expect(l1ArbSender.connect(SECOND).setRewardTokenLZParams(SECOND, '0x1234')).to.be.revertedWith(
        'Ownable: caller is not the owner',
      );
    });
  });

  describe('sendDepositToken', () => {
    it('should send tokens to another address', async () => {
      const l1SenderAddress = await l1ArbSender.getAddress();
      await unwrappedToken.mint(l1SenderAddress, '100');

      await l1ArbSender.sendDepositToken(1, 1, 1);

      expect(await depositToken.balanceOf(SECOND)).to.eq('100');
    });
    it('should revert if not called by the owner', async () => {
      await expect(l1ArbSender.connect(SECOND).sendDepositToken(1, 1, 1)).to.be.revertedWith('L1S: invalid sender');
    });
  });

  describe('sendMintMessage', () => {
    it('should send mint message', async () => {
      await l1ArbSender.sendMintMessage(SECOND, '999', OWNER, { value: ethers.parseEther('0.1') });
      expect(await rewardToken.balanceOf(SECOND)).to.eq('999');
    });
    it('should revert if not called by the owner', async () => {
      await expect(
        l1ArbSender.connect(SECOND).sendMintMessage(SECOND, '999', OWNER, { value: ethers.parseEther('0.1') }),
      ).to.be.revertedWith('L1S: invalid sender');
    });
  });
});

// npx hardhat test "test/L1/L1ArbSender.test.ts"
// npx hardhat coverage --solcoverjs ./.solcover.ts --testfiles "test/L1/L1ArbSender.test.ts"
