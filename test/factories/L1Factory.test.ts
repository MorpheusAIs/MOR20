import {
  FeeConfig,
  GatewayRouterMock,
  IL1Factory,
  IL1FactoryToArb,
  L1FactoryToArb,
  LZEndpointMock,
  LinearDistributionIntervalDecrease,
  StETHMock,
  WStETHMock,
} from '@ethers-v6';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import { PoolTypesL1 } from '../helpers/helper';
import { Reverter } from '../helpers/reverter';

import { L1FactoryV2 } from '@/generated-types/ethers/contracts/mock/L1FactoryV2';
import { ZERO_ADDR } from '@/scripts/utils/constants';
import { wei } from '@/scripts/utils/utils';

describe('L1Factory', () => {
  const senderChainId = 101;

  const reverter = new Reverter();

  let OWNER: SignerWithAddress;
  let SECOND: SignerWithAddress;

  let l1Factory: L1FactoryToArb;

  let feeConfig: FeeConfig;
  let stEthMock: StETHMock;
  let wstEthMock: WStETHMock;
  let gatewayRouterMock: GatewayRouterMock;
  let lzEndpoint: LZEndpointMock;

  before(async () => {
    [OWNER, SECOND] = await ethers.getSigners();

    const [
      libFactory,
      l1FactoryFactory,
      stEthMockFactory,
      wstEthMockFactory,
      gatewayRouterMockFactory,
      feeConfigFactory,
      ERC1967ProxyFactory,
      LZEndpointMockFactory,
    ] = await Promise.all([
      ethers.getContractFactory('LinearDistributionIntervalDecrease'),
      ethers.getContractFactory('L1FactoryToArb'),
      ethers.getContractFactory('StETHMock'),
      ethers.getContractFactory('WStETHMock'),
      ethers.getContractFactory('GatewayRouterMock'),
      ethers.getContractFactory('FeeConfig'),
      ethers.getContractFactory('ERC1967Proxy'),
      ethers.getContractFactory('LZEndpointMock'),
    ]);

    const [l1SenderFactory] = await Promise.all([ethers.getContractFactory('L1ArbSender')]);

    let lib: LinearDistributionIntervalDecrease;
    [lib, stEthMock, gatewayRouterMock, lzEndpoint] = await Promise.all([
      libFactory.deploy(),
      stEthMockFactory.deploy(),
      gatewayRouterMockFactory.deploy(),
      LZEndpointMockFactory.deploy(senderChainId),
    ]);
    const [l1SenderImplementation] = await Promise.all([l1SenderFactory.deploy()]);
    wstEthMock = await wstEthMockFactory.deploy(stEthMock);

    const feeConfigImpl = await feeConfigFactory.deploy();
    const feeConfigProxy = await ERC1967ProxyFactory.deploy(feeConfigImpl, '0x');
    feeConfig = feeConfigFactory.attach(feeConfigProxy) as FeeConfig;

    await feeConfig.FeeConfig_init(OWNER, wei(0.1, 25));

    const distributionFactory = await ethers.getContractFactory('DistributionToArb', {
      libraries: {
        LinearDistributionIntervalDecrease: lib,
      },
    });
    const distributionImplementation = await distributionFactory.deploy();

    const factoryImpl = await l1FactoryFactory.deploy();
    const factoryProxy = await ERC1967ProxyFactory.deploy(factoryImpl, '0x');
    l1Factory = l1FactoryFactory.attach(factoryProxy) as L1FactoryToArb;

    await l1Factory.L1FactoryToArb_init();

    const poolTypes = [PoolTypesL1.DISTRIBUTION, PoolTypesL1.L1_SENDER];
    const poolImplementations = [
      await distributionImplementation.getAddress(),
      await l1SenderImplementation.getAddress(),
    ];

    await l1Factory.setImplementations(poolTypes, poolImplementations);

    await reverter.snapshot();
  });

  afterEach(reverter.revert);

  function getL1FactoryParams() {
    const depositTokenExternalDeps: IL1Factory.DepositTokenExternalDepsStruct = {
      token: stEthMock,
      wToken: wstEthMock,
    };

    const lzExternalDeps: IL1Factory.LzExternalDepsStruct = {
      endpoint: lzEndpoint,
      zroPaymentAddress: ZERO_ADDR,
      adapterParams: '0x',
      destinationChainId: 2,
    };

    const arbExternalDeps: IL1FactoryToArb.ArbExternalDepsStruct = {
      endpoint: gatewayRouterMock,
    };

    return { depositTokenExternalDeps, lzExternalDeps, arbExternalDeps };
  }

  describe('UUPS proxy functionality', () => {
    describe('#L1Factory_init', () => {
      it('should revert if try to call init function twice', async () => {
        const reason = 'Initializable: contract is already initialized';

        await expect(l1Factory.L1FactoryToArb_init()).to.be.rejectedWith(reason);
      });

      describe('#_authorizeUpgrade', () => {
        it('should correctly upgrade', async () => {
          const l1FactoryV2Factory = await ethers.getContractFactory('FactoryMockV2');
          const l1FactoryV2Implementation = await l1FactoryV2Factory.deploy();

          await l1Factory.upgradeTo(l1FactoryV2Implementation);

          const l1factoryV2 = l1FactoryV2Factory.attach(await l1FactoryV2Implementation.getAddress()) as L1FactoryV2;

          expect(await l1factoryV2.version()).to.eq(2);
        });
        it('should revert if caller is not the owner', async () => {
          await expect(l1Factory.connect(SECOND).upgradeTo(ZERO_ADDR)).to.be.revertedWith(
            'Ownable: caller is not the owner',
          );
        });
      });
    });
  });

  describe('setDepositTokenExternalDeps', () => {
    it('should set deposit token external deps', async () => {
      const { depositTokenExternalDeps } = getL1FactoryParams();

      await l1Factory.setDepositTokenExternalDeps(depositTokenExternalDeps);

      const actualDepositTokenExternalDeps = await l1Factory.depositTokenExternalDeps();
      expect(actualDepositTokenExternalDeps.token).to.equal(depositTokenExternalDeps.token);
      expect(actualDepositTokenExternalDeps.wToken).to.equal(depositTokenExternalDeps.wToken);
    });
    it('should revert if called by non-owner', async () => {
      const { depositTokenExternalDeps } = getL1FactoryParams();

      await expect(l1Factory.connect(SECOND).setDepositTokenExternalDeps(depositTokenExternalDeps)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      );
    });
    it('should revert if token is zero address', async () => {
      const { depositTokenExternalDeps } = getL1FactoryParams();
      depositTokenExternalDeps.token = ZERO_ADDR;

      await expect(l1Factory.setDepositTokenExternalDeps(depositTokenExternalDeps)).to.be.revertedWith(
        'L1F: invalid token',
      );
    });
    it('should revert if wToken is zero address', async () => {
      const { depositTokenExternalDeps } = getL1FactoryParams();
      depositTokenExternalDeps.wToken = ZERO_ADDR;

      await expect(l1Factory.setDepositTokenExternalDeps(depositTokenExternalDeps)).to.be.revertedWith(
        'L1F: invalid wtoken',
      );
    });
  });

  describe('#lzExternalDeps', () => {
    it('should set lz external deps', async () => {
      const { lzExternalDeps } = getL1FactoryParams();

      await l1Factory.setLzExternalDeps(lzExternalDeps);

      const actualLzExternalDeps = await l1Factory.lzExternalDeps();
      expect(actualLzExternalDeps.endpoint).to.equal(lzExternalDeps.endpoint);
      expect(actualLzExternalDeps.zroPaymentAddress).to.equal(lzExternalDeps.zroPaymentAddress);
      expect(actualLzExternalDeps.adapterParams).to.equal(lzExternalDeps.adapterParams);
      expect(actualLzExternalDeps.destinationChainId).to.equal(lzExternalDeps.destinationChainId);
    });
    it('should revert if called by non-owner', async () => {
      const { lzExternalDeps } = getL1FactoryParams();

      await expect(l1Factory.connect(SECOND).setLzExternalDeps(lzExternalDeps)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      );
    });
    it('should revert if endpoint is zero address', async () => {
      const { lzExternalDeps } = getL1FactoryParams();
      lzExternalDeps.endpoint = ZERO_ADDR;

      await expect(l1Factory.setLzExternalDeps(lzExternalDeps)).to.be.revertedWith('L1F: invalid LZ endpoint');
    });
    it('should revert if destinationChainId is zero', async () => {
      const { lzExternalDeps } = getL1FactoryParams();
      lzExternalDeps.destinationChainId = 0;

      await expect(l1Factory.setLzExternalDeps(lzExternalDeps)).to.be.revertedWith('L1F: invalid chain ID');
    });
  });

  describe('#setFeeConfig', () => {
    it('should set fee config', async () => {
      await l1Factory.setFeeConfig(feeConfig);

      expect(await l1Factory.feeConfig()).to.equal(await feeConfig.getAddress());
    });
    it('should revert if provided fee config is zero address', async () => {
      await expect(l1Factory.setFeeConfig(ZERO_ADDR)).to.be.revertedWith('L1F: invalid fee config');
    });
    it('should revert if called by non-owner', async () => {
      await expect(l1Factory.connect(SECOND).setFeeConfig(feeConfig)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      );
    });
  });
});

// npx hardhat test "test/factories/L1Factory.test.ts"
// npx hardhat coverage --solcoverjs ./.solcover.ts --testfiles "test/factories/L1Factory.test.ts"
