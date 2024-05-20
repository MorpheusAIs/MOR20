import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import {
  ERC1967Proxy__factory,
  L2MessageReceiver,
  L2MessageReceiver__factory,
  LayerZeroEndpointV2Mock,
  LayerZeroEndpointV2Mock__factory,
  MOR20,
  MOR20__factory,
} from '@/generated-types/ethers';
import { ZERO_ADDR, ZERO_BYTES32 } from '@/scripts/utils/constants';
import { wei } from '@/scripts/utils/utils';
import { Reverter } from '@/test/helpers/reverter';

describe('L2MessageReceiver', () => {
  const reverter = new Reverter();

  let OWNER: SignerWithAddress;
  let SECOND: SignerWithAddress;
  let THIRD: SignerWithAddress;

  let l2MessageReceiver: L2MessageReceiver;
  let l2MessageReceiverFactory: L2MessageReceiver__factory;
  let ERC1967ProxyFactory: ERC1967Proxy__factory;

  let mor: MOR20;
  let lZEndpointMock: LayerZeroEndpointV2Mock;

  before(async () => {
    [OWNER, SECOND, THIRD] = await ethers.getSigners();

    let MOR: MOR20__factory;
    let LayerZeroEndpointV2Mock: LayerZeroEndpointV2Mock__factory;
    [ERC1967ProxyFactory, l2MessageReceiverFactory, MOR, LayerZeroEndpointV2Mock] = await Promise.all([
      ethers.getContractFactory('ERC1967Proxy'),
      ethers.getContractFactory('L2MessageReceiver'),
      ethers.getContractFactory('MOR20'),
      ethers.getContractFactory('LayerZeroEndpointV2Mock'),
    ]);

    const l2MessageReceiverImplementation = await l2MessageReceiverFactory.deploy();
    const l2MessageReceiverProxy = await ERC1967ProxyFactory.deploy(l2MessageReceiverImplementation, '0x');
    l2MessageReceiver = l2MessageReceiverFactory.attach(l2MessageReceiverProxy) as L2MessageReceiver;

    // Setup ERC20MOR token
    lZEndpointMock = await LayerZeroEndpointV2Mock.deploy(1, SECOND);
    mor = await MOR.deploy('MOR', 'MOR', lZEndpointMock, OWNER, l2MessageReceiver);

    await l2MessageReceiver.L2MessageReceiver__init(mor, {
      gateway: THIRD,
      sender: OWNER,
      senderChainId: 2,
    });

    await reverter.snapshot();
  });

  beforeEach(async () => {
    await reverter.revert();
  });

  describe('initialization', () => {
    describe('#constructor', () => {
      it('should disable initialize function', async () => {
        const reason = 'Initializable: contract is already initialized';

        const l2MessageReceiver = await (await ethers.getContractFactory('L2MessageReceiver')).deploy();

        await expect(
          l2MessageReceiver.L2MessageReceiver__init(ZERO_ADDR, {
            gateway: ZERO_ADDR,
            sender: ZERO_ADDR,
            senderChainId: 0,
          }),
        ).to.be.rejectedWith(reason);
      });
    });

    describe('#L2MessageReceiver__init', () => {
      it('should revert if try to call init function twice', async () => {
        const reason = 'Initializable: contract is already initialized';

        await expect(
          l2MessageReceiver.L2MessageReceiver__init(ZERO_ADDR, {
            gateway: ZERO_ADDR,
            sender: ZERO_ADDR,
            senderChainId: 0,
          }),
        ).to.be.rejectedWith(reason);
      });
    });
  });

  describe('#setLzSender', async () => {
    it('should set the sender', async () => {
      await l2MessageReceiver.setLzSender(SECOND);
      expect((await l2MessageReceiver.config()).sender).to.eq(SECOND);
    });
    it('should revert if not called by the owner', async () => {
      await expect(l2MessageReceiver.connect(SECOND).setLzSender(SECOND)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      );
    });
    it('should revert if provided zero address', async () => {
      await expect(l2MessageReceiver.setLzSender(ZERO_ADDR)).to.be.revertedWith('L2MR: invalid sender');
    });
  });

  describe('#lzReceive', () => {
    it('should mint tokens', async () => {
      const address = ethers.solidityPacked(
        ['address', 'address'],
        [OWNER.address, await l2MessageReceiver.getAddress()],
      );
      const payload = ethers.AbiCoder.defaultAbiCoder().encode(['address', 'uint256'], [SECOND.address, wei(1)]);
      const tx = await l2MessageReceiver.connect(THIRD).lzReceive(2, address, 5, payload);
      await expect(tx).to.changeTokenBalance(mor, SECOND, wei(1));
    });
    it('should mint tokens, MOR', async () => {
      const address = ethers.solidityPacked(
        ['address', 'address'],
        [OWNER.address, await l2MessageReceiver.getAddress()],
      );
      let payload = ethers.AbiCoder.defaultAbiCoder().encode(['address', 'uint256'], [SECOND.address, wei(95)]);
      let tx = await l2MessageReceiver.connect(THIRD).lzReceive(2, address, 5, payload);
      await expect(tx).to.changeTokenBalance(mor, SECOND, wei(95));
      payload = ethers.AbiCoder.defaultAbiCoder().encode(['address', 'uint256'], [SECOND.address, wei(2)]);
      tx = await l2MessageReceiver.connect(THIRD).lzReceive(2, address, 6, payload);
      await expect(tx).to.changeTokenBalance(mor, SECOND, wei(2));
      payload = ethers.AbiCoder.defaultAbiCoder().encode(['address', 'uint256'], [SECOND.address, wei(5)]);
      tx = await l2MessageReceiver.connect(THIRD).lzReceive(2, address, 7, payload);
    });
    it('should mint tokens, ERC20MOR', async () => {
      const l2MessageReceiverImplementation = await l2MessageReceiverFactory.deploy();
      const l2MessageReceiverProxy = await ERC1967ProxyFactory.deploy(l2MessageReceiverImplementation, '0x');
      const l2MessageReceiver = l2MessageReceiverFactory.attach(l2MessageReceiverProxy) as L2MessageReceiver;
      await mor.updateMinter(l2MessageReceiver, true);
      await l2MessageReceiver.L2MessageReceiver__init(mor, {
        gateway: THIRD,
        sender: OWNER,
        senderChainId: 2,
      });

      const address = ethers.solidityPacked(
        ['address', 'address'],
        [OWNER.address, await l2MessageReceiver.getAddress()],
      );
      let payload = ethers.AbiCoder.defaultAbiCoder().encode(['address', 'uint256'], [SECOND.address, wei(95)]);
      let tx = await l2MessageReceiver.connect(THIRD).lzReceive(2, address, 5, payload);
      await expect(tx).to.changeTokenBalance(mor, SECOND, wei(95));
      payload = ethers.AbiCoder.defaultAbiCoder().encode(['address', 'uint256'], [SECOND.address, wei(2)]);
      tx = await l2MessageReceiver.connect(THIRD).lzReceive(2, address, 6, payload);
      await expect(tx).to.changeTokenBalance(mor, SECOND, wei(2));
      payload = ethers.AbiCoder.defaultAbiCoder().encode(['address', 'uint256'], [SECOND.address, wei(5)]);
    });
    it('should revert if provided wrong lzEndpoint', async () => {
      await expect(l2MessageReceiver.lzReceive(0, '0x', 1, '0x')).to.be.revertedWith('L2MR: invalid gateway');
    });
  });

  describe('#nonblockingLzReceive', () => {
    it('should revert if invalid caller', async () => {
      await expect(l2MessageReceiver.nonblockingLzReceive(2, '0x', '0x')).to.be.revertedWith('L2MR: invalid caller');
    });
  });

  describe('#retryMessage', () => {
    let payload = '';
    const chainId = 2;

    beforeEach(async () => {
      payload = ethers.AbiCoder.defaultAbiCoder().encode(['address', 'uint256'], [SECOND.address, wei(99)]);
    });
    it('should have one blocked message', async () => {
      const senderAndReceiverAddresses = ethers.solidityPacked(
        ['address', 'address'],
        [SECOND.address, await l2MessageReceiver.getAddress()],
      );
      // Fail this call
      await l2MessageReceiver.connect(THIRD).lzReceive(chainId, senderAndReceiverAddresses, 999, payload);

      expect(await l2MessageReceiver.failedMessages(chainId, senderAndReceiverAddresses, 999)).to.eq(
        ethers.keccak256(payload),
      );
    });
    it('should retry failed message', async () => {
      const l2MessageReceiverImplementation = await l2MessageReceiverFactory.deploy();
      const l2MessageReceiverProxy = await ERC1967ProxyFactory.deploy(l2MessageReceiverImplementation, '0x');
      const l2MessageReceiver = l2MessageReceiverFactory.attach(l2MessageReceiverProxy) as L2MessageReceiver;
      await l2MessageReceiver.L2MessageReceiver__init(mor, {
        gateway: THIRD,
        sender: SECOND,
        senderChainId: 2,
      });

      const senderAndReceiverAddresses = ethers.solidityPacked(
        ['address', 'address'],
        [SECOND.address, await l2MessageReceiver.getAddress()],
      );
      // Fail this call
      await l2MessageReceiver.connect(THIRD).lzReceive(chainId, senderAndReceiverAddresses, 999, payload);

      await mor.updateMinter(l2MessageReceiver, true);

      const tx = await l2MessageReceiver.retryMessage(chainId, senderAndReceiverAddresses, 999, payload);
      await expect(tx).to.changeTokenBalance(mor, SECOND, wei(99));

      expect(await l2MessageReceiver.failedMessages(chainId, senderAndReceiverAddresses, 999)).to.eq(ZERO_BYTES32);
    });
    it('should revert if invalid caller', async () => {
      await expect(l2MessageReceiver.nonblockingLzReceive(chainId, '0x', '0x')).to.be.revertedWith(
        'L2MR: invalid caller',
      );
    });
    it('should revert if provided wrong chainId', async () => {
      const l2MessageReceiverImplementation = await l2MessageReceiverFactory.deploy();
      const l2MessageReceiverProxy = await ERC1967ProxyFactory.deploy(l2MessageReceiverImplementation, '0x');
      const l2MessageReceiver = l2MessageReceiverFactory.attach(l2MessageReceiverProxy) as L2MessageReceiver;
      await mor.updateMinter(l2MessageReceiver, true);
      await l2MessageReceiver.L2MessageReceiver__init(mor, {
        gateway: THIRD,
        sender: SECOND,
        senderChainId: 3,
      });

      const senderAndReceiverAddresses = ethers.solidityPacked(
        ['address', 'address'],
        [SECOND.address, await l2MessageReceiver.getAddress()],
      );
      // Fail this call
      await l2MessageReceiver.connect(THIRD).lzReceive(chainId, senderAndReceiverAddresses, 999, payload);

      await expect(
        l2MessageReceiver.retryMessage(chainId, senderAndReceiverAddresses, 999, payload),
      ).to.be.revertedWith('L2MR: invalid sender chain ID');
    });
    it('should revert if provided wrong sender', async () => {
      const senderAndReceiverAddresses = ethers.solidityPacked(
        ['address', 'address'],
        [SECOND.address, await l2MessageReceiver.getAddress()],
      );
      // Fail this call
      await l2MessageReceiver.connect(THIRD).lzReceive(chainId, senderAndReceiverAddresses, 999, payload);

      await expect(
        l2MessageReceiver.retryMessage(chainId, senderAndReceiverAddresses, 999, payload),
      ).to.be.revertedWith('L2MR: invalid sender address');
    });
    it('should revert if provided wrong message', async () => {
      const senderAndReceiverAddresses = ethers.solidityPacked(
        ['address', 'address'],
        [SECOND.address, await l2MessageReceiver.getAddress()],
      );
      await expect(
        l2MessageReceiver.retryMessage(chainId, senderAndReceiverAddresses, 998, payload),
      ).to.be.revertedWith('L2MR: no stored message');
    });
    it('should revert if provided wrong payload', async () => {
      const senderAndReceiverAddresses = ethers.solidityPacked(
        ['address', 'address'],
        [SECOND.address, await l2MessageReceiver.getAddress()],
      );
      // Fail this call
      await l2MessageReceiver.connect(THIRD).lzReceive(chainId, senderAndReceiverAddresses, 999, payload);

      await expect(l2MessageReceiver.retryMessage(chainId, senderAndReceiverAddresses, 999, '0x')).to.be.revertedWith(
        'L2MR: invalid payload',
      );
    });
    it('should revert if try to retry already retried message', async () => {
      const l2MessageReceiverImplementation = await l2MessageReceiverFactory.deploy();
      const l2MessageReceiverProxy = await ERC1967ProxyFactory.deploy(l2MessageReceiverImplementation, '0x');
      const l2MessageReceiver = l2MessageReceiverFactory.attach(l2MessageReceiverProxy) as L2MessageReceiver;
      await l2MessageReceiver.L2MessageReceiver__init(mor, {
        gateway: THIRD,
        sender: SECOND,
        senderChainId: 2,
      });

      const senderAndReceiverAddresses = ethers.solidityPacked(
        ['address', 'address'],
        [SECOND.address, await l2MessageReceiver.getAddress()],
      );
      // Fail this call
      await l2MessageReceiver.connect(THIRD).lzReceive(chainId, senderAndReceiverAddresses, 999, payload);
      await mor.updateMinter(l2MessageReceiver, true);

      await l2MessageReceiver.retryMessage(chainId, senderAndReceiverAddresses, 999, payload);

      await expect(
        l2MessageReceiver.retryMessage(chainId, senderAndReceiverAddresses, 999, payload),
      ).to.be.revertedWith('L2MR: no stored message');
    });
  });
});

// npx hardhat test "test/L2MessageReceiver.test.ts"
// npx hardhat coverage --solcoverjs ./.solcover.ts --testfiles "test/L2MessageReceiver.test.ts"
