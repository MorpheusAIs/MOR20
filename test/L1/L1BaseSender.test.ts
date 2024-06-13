import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import {
  IL1BaseSender,
  L1BaseSender,
  L1ERC20TokenBridgeMock,
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

describe('L1BaseSender', () => {
  const senderChainId = 101;
  const receiverChainId = 184;

  const reverter = new Reverter();

  let OWNER: SignerWithAddress;
  let SECOND: SignerWithAddress;

  let unwrappedToken: StETHMock;
  let depositToken: WStETHMock;
  let depositTokenL2: WStETHMock;

  let lZEndpointMockL1: LZEndpointMock;
  let lZEndpointMockL2: LZEndpointMock;
  let lZEndpointMockOFT: LayerZeroEndpointV2Mock;

  let baseGateway: L1ERC20TokenBridgeMock;

  let l1BaseSender: L1BaseSender;
  let l2MessageReceiver: L2MessageReceiver;

  let rewardToken: MOR20;
  before(async () => {
    [OWNER, SECOND] = await ethers.getSigners();

    const [
      ERC1967ProxyFactory,
      LZEndpointMock,
      Mor,
      L1BaseSenderFactory,
      BaseGatewayMock,
      StETHMock,
      WStETHMock,
      L2MessageReceiver,
      LZEndpointMockOFT,
    ] = await Promise.all([
      ethers.getContractFactory('ERC1967Proxy'),
      ethers.getContractFactory('LZEndpointMock'),
      ethers.getContractFactory('MOR20'),
      ethers.getContractFactory('L1BaseSender'),
      ethers.getContractFactory('L1ERC20TokenBridgeMock'),
      ethers.getContractFactory('StETHMock'),
      ethers.getContractFactory('WStETHMock'),
      ethers.getContractFactory('L2MessageReceiver'),
      ethers.getContractFactory('LayerZeroEndpointV2Mock'),
    ]);

    lZEndpointMockOFT = await LZEndpointMockOFT.deploy(receiverChainId, OWNER);

    let l1BaseSenderImplementation: L1BaseSender;
    let l2MessageReceiverImplementation: L2MessageReceiver;

    [
      lZEndpointMockL1,
      lZEndpointMockL2,
      l1BaseSenderImplementation,
      unwrappedToken,
      l2MessageReceiverImplementation,
      baseGateway,
    ] = await Promise.all([
      LZEndpointMock.deploy(senderChainId),
      LZEndpointMock.deploy(receiverChainId),
      L1BaseSenderFactory.deploy(),
      StETHMock.deploy(),
      L2MessageReceiver.deploy(),
      BaseGatewayMock.deploy(),
    ]);
    depositToken = await WStETHMock.deploy(unwrappedToken);
    depositTokenL2 = await WStETHMock.deploy(unwrappedToken);

    const l2MessageReceiverProxy = await ERC1967ProxyFactory.deploy(l2MessageReceiverImplementation, '0x');
    l2MessageReceiver = L2MessageReceiver.attach(l2MessageReceiverProxy) as L2MessageReceiver;

    rewardToken = await Mor.deploy('MOR', 'MOR', lZEndpointMockOFT, OWNER, l2MessageReceiver);

    const rewardTokenConfig: IL1Sender.RewardTokenConfigStruct = {
      gateway: lZEndpointMockL1,
      receiver: l2MessageReceiver,
      receiverChainId: receiverChainId,
      zroPaymentAddress: ZERO_ADDR,
      adapterParams: '0x',
    };
    const depositTokenConfig: IL1BaseSender.DepositTokenConfigStruct = {
      gateway: baseGateway,
      l1Token: depositToken,
      l2Token: depositTokenL2,
      receiver: SECOND,
    };

    const l1BaseSenderProxy = await ERC1967ProxyFactory.deploy(l1BaseSenderImplementation, '0x');
    l1BaseSender = L1BaseSenderFactory.attach(l1BaseSenderProxy) as L1BaseSender;
    await l1BaseSender.L1BaseSender__init(OWNER, rewardTokenConfig, depositTokenConfig);

    await l2MessageReceiver.L2MessageReceiver__init(rewardToken, {
      gateway: lZEndpointMockL2,
      sender: l1BaseSender,
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
    let rewardTokenConfig: IL1Sender.RewardTokenConfigStruct;
    let depositTokenConfig: IL1BaseSender.DepositTokenConfigStruct;

    before(async () => {
      rewardTokenConfig = {
        gateway: lZEndpointMockL1,
        receiver: l2MessageReceiver,
        receiverChainId: receiverChainId,
        zroPaymentAddress: ZERO_ADDR,
        adapterParams: '0x',
      };
      depositTokenConfig = {
        gateway: baseGateway,
        l1Token: depositToken,
        l2Token: depositTokenL2,
        receiver: SECOND,
      };
    });

    describe('#constructor', () => {
      it('should disable initialize function', async () => {
        const reason = 'Initializable: contract is already initialized';

        const l1BaseSender = await (await ethers.getContractFactory('L1BaseSender')).deploy();

        await expect(l1BaseSender.L1BaseSender__init(OWNER, rewardTokenConfig, depositTokenConfig)).to.be.rejectedWith(
          reason,
        );
      });
    });

    describe('#L1BaseSender__init', () => {
      it('should revert if try to call init function twice', async () => {
        const reason = 'Initializable: contract is already initialized';

        await expect(l1BaseSender.L1BaseSender__init(OWNER, rewardTokenConfig, depositTokenConfig)).to.be.rejectedWith(
          reason,
        );
      });
      it('should setup config', async () => {
        expect(await l1BaseSender.distribution()).to.be.equal(OWNER.address);

        expect(await l1BaseSender.rewardTokenConfig()).to.be.deep.equal([
          await lZEndpointMockL1.getAddress(),
          await l2MessageReceiver.getAddress(),
          receiverChainId,
          ZERO_ADDR,
          '0x',
        ]);

        expect(await l1BaseSender.depositTokenConfig()).to.be.deep.equal([
          await baseGateway.getAddress(),
          await depositToken.getAddress(),
          await depositTokenL2.getAddress(),
          SECOND.address,
        ]);

        expect(await unwrappedToken.allowance(l1BaseSender, depositToken)).to.be.equal(ethers.MaxUint256);
        expect(await depositToken.allowance(l1BaseSender, baseGateway)).to.be.equal(ethers.MaxUint256);
      });
      it('should revert if receiver is zero address', async () => {
        const [ERC1967ProxyFactory, L1BaseSender] = await Promise.all([
          ethers.getContractFactory('ERC1967Proxy'),
          ethers.getContractFactory('L1BaseSender'),
        ]);
        const l1BaseSenderImplementation = await L1BaseSender.deploy();
        const l1BaseSenderProxy = await ERC1967ProxyFactory.deploy(l1BaseSenderImplementation, '0x');
        const l1BaseSender = L1BaseSender.attach(l1BaseSenderProxy) as L1BaseSender;

        await expect(
          l1BaseSender.L1BaseSender__init(OWNER, rewardTokenConfig, {
            ...depositTokenConfig,
            receiver: ZERO_ADDR,
          }),
        ).to.be.rejectedWith('L1S: invalid receiver');
      });
    });
  });

  describe('supportsInterface', () => {
    it('should support IL1BaseSender interface', async () => {
      expect(await l1BaseSender.supportsInterface('0x2e33e7c2')).to.be.true;
    });
    it('should support IERC165', async () => {
      expect(await l1BaseSender.supportsInterface('0x01ffc9a7')).to.be.true;
    });
  });

  describe('setRewardTokenLZParams', () => {
    it('should update lz params', async () => {
      await l1BaseSender.setRewardTokenLZParams(SECOND, '0x1234');

      const config = await l1BaseSender.rewardTokenConfig();
      expect(config.gateway).to.eq(await lZEndpointMockL1.getAddress());
      expect(config.receiver).to.eq(await l2MessageReceiver.getAddress());
      expect(config.receiverChainId).to.eq(receiverChainId);
      expect(config.zroPaymentAddress).to.eq(await SECOND.getAddress());
      expect(config.adapterParams).to.eq('0x1234');
    });
    it('should revert if not called by the owner', async () => {
      await expect(l1BaseSender.connect(SECOND).setRewardTokenLZParams(SECOND, '0x1234')).to.be.revertedWith(
        'Ownable: caller is not the owner',
      );
    });
  });

  describe('sendDepositToken', () => {
    it('should send tokens to another address', async () => {
      const l1SenderAddress = await l1BaseSender.getAddress();
      await unwrappedToken.mint(l1SenderAddress, '100');

      await l1BaseSender.sendDepositToken(1, '0x');

      expect(await depositToken.balanceOf(SECOND)).to.eq('100');
    });
    it('should revert if not called by the owner', async () => {
      await expect(l1BaseSender.connect(SECOND).sendDepositToken(1, '0x')).to.be.revertedWith('L1S: invalid sender');
    });
  });

  describe('sendMintMessage', () => {
    it('should send mint message', async () => {
      await l1BaseSender.sendMintMessage(SECOND, '999', OWNER, { value: ethers.parseEther('0.1') });
      expect(await rewardToken.balanceOf(SECOND)).to.eq('999');
    });
    it('should revert if not called by the owner', async () => {
      await expect(
        l1BaseSender.connect(SECOND).sendMintMessage(SECOND, '999', OWNER, { value: ethers.parseEther('0.1') }),
      ).to.be.revertedWith('L1S: invalid sender');
    });
  });
});

// npx hardhat test "test/L1/L1BaseSender.test.ts"
// npx hardhat coverage --solcoverjs ./.solcover.ts --testfiles "test/L1/L1BaseSender.test.ts"
