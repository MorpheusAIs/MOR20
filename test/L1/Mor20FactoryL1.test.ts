import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import { Reverter } from '../helpers/reverter';

import {
  CorePropertiesL1,
  Distribution,
  GatewayRouterMock,
  L1Sender,
  LinearDistributionIntervalDecrease,
  Mor20FactoryL1,
  StETHMock,
  WStETHMock,
} from '@/generated-types/ethers';
import { ETHER_ADDR, ZERO_ADDR } from '@/scripts/utils/constants';

enum PoolTypes {
  DISTRIBUTION,
  L1_SENDER,
}

describe.only('Mor20FactoryL1', () => {
  const reverter = new Reverter();

  let OWNER: SignerWithAddress;
  let SECOND: SignerWithAddress;

  let mor20FactoryL1: Mor20FactoryL1;

  let l1SenderImplementation: L1Sender;
  let distributionImplementation: Distribution;
  let coreProperties: CorePropertiesL1;

  let stEthMock: StETHMock;
  let wstEthMock: WStETHMock;
  let gatewayRouterMock: GatewayRouterMock;
  let poolTypes: PoolTypes[];
  let poolImplementations: string[];
  let lib: LinearDistributionIntervalDecrease;

  before(async () => {
    [OWNER, SECOND] = await ethers.getSigners();

    const [
      libFactory,
      l1SenderFactory,
      mor20FactoryL1Factory,
      stEthMockFactory,
      wstEthMockFactory,
      gatewayRouterMockFactory,
      corePropertiesFactory,
    ] = await Promise.all([
      ethers.getContractFactory('LinearDistributionIntervalDecrease'),
      ethers.getContractFactory('L1Sender'),
      ethers.getContractFactory('Mor20FactoryL1'),
      ethers.getContractFactory('StETHMock'),
      ethers.getContractFactory('WStETHMock'),
      ethers.getContractFactory('GatewayRouterMock'),
      ethers.getContractFactory('CorePropertiesL1'),
    ]);

    [lib, l1SenderImplementation, stEthMock, gatewayRouterMock] = await Promise.all([
      libFactory.deploy(),
      l1SenderFactory.deploy(),
      stEthMockFactory.deploy(),
      gatewayRouterMockFactory.deploy(),
    ]);
    wstEthMock = await wstEthMockFactory.deploy(stEthMock);
    coreProperties = await corePropertiesFactory.deploy(gatewayRouterMock, SECOND, ZERO_ADDR, 1);

    const distributionFactory = await ethers.getContractFactory('Distribution', {
      libraries: {
        LinearDistributionIntervalDecrease: lib,
      },
    });
    distributionImplementation = await distributionFactory.deploy();

    mor20FactoryL1 = await mor20FactoryL1Factory.deploy(coreProperties);

    poolTypes = [PoolTypes.DISTRIBUTION, PoolTypes.L1_SENDER];
    poolImplementations = [await distributionImplementation.getAddress(), await l1SenderImplementation.getAddress()];

    await reverter.snapshot();
  });

  afterEach(reverter.revert);

  function getMor20DeployParams() {
    const mor20DeployParams: Mor20FactoryL1.Mor20DeployParamsStruct = {
      name: 'Mor20',
      depositToken: stEthMock,
      poolsInfo: [],
      messageReceiver: ETHER_ADDR,
      zroPaymentAddress: ZERO_ADDR,
      l2EndpointId: 0,
      adapterParams: '0x',
      wrappedToken: wstEthMock,
      tokenReceiver: ETHER_ADDR,
    };

    return mor20DeployParams;
  }

  describe('#deployMor20OnL1', () => {
    it('should deploy and initialize a Mor20 on L1', async () => {
      await mor20FactoryL1.setNewImplementations(poolTypes, poolImplementations);

      const deployParams = getMor20DeployParams();

      const predictedMor20Address = await mor20FactoryL1.predictMor20Address(OWNER, deployParams.name);

      const tx = await mor20FactoryL1.deployMor20OnL1(deployParams);

      await expect(tx)
        .to.emit(mor20FactoryL1, 'Mor20Deployed')
        .withArgs(deployParams.name, ...predictedMor20Address);

      const distribution = await ethers.getContractAt('Distribution', predictedMor20Address[0]);
      const l1Sender = await ethers.getContractAt('L1Sender', predictedMor20Address[1]);

      expect(await distribution.depositToken()).to.equal(deployParams.depositToken);
      expect(await distribution.l1Sender()).to.equal(l1Sender);

      expect(await l1Sender.unwrappedDepositToken()).to.equal(deployParams.depositToken);
      expect(await l1Sender.distribution()).to.equal(distribution);
    });

    it('should revert if name is an empty string', async () => {
      const deployParams = getMor20DeployParams();
      deployParams.name = '';

      await expect(mor20FactoryL1.deployMor20OnL1(deployParams)).to.be.revertedWith(
        'BaseFactory: pool name cannot be empty',
      );
    });

    it('should revert if Mor20 with the same name already exists', async () => {
      await mor20FactoryL1.setNewImplementations(poolTypes, poolImplementations);

      const deployParams = getMor20DeployParams();

      await mor20FactoryL1.deployMor20OnL1(deployParams);

      await expect(mor20FactoryL1.deployMor20OnL1(deployParams)).to.be.revertedWith(
        'BaseFactory: pool name is already taken',
      );
    });

    it('should revert if called by a non-owner', async () => {
      const deployParams = getMor20DeployParams();

      await expect(mor20FactoryL1.connect(SECOND).deployMor20OnL1(deployParams)).to.be.revertedWith(
        'Ownable: caller is not the owner',
      );
    });
  });

  describe('#setNewImplementations', () => {
    it('should set new implementations', async () => {
      await mor20FactoryL1.setNewImplementations(poolTypes, poolImplementations);

      const deployParams = getMor20DeployParams();
      const distributionAddress = (await mor20FactoryL1.predictMor20Address(OWNER, deployParams.name)).distribution;
      await mor20FactoryL1.deployMor20OnL1(deployParams);

      const distributionV2Factory = await ethers.getContractFactory('DistributionV2', {
        libraries: {
          LinearDistributionIntervalDecrease: lib,
        },
      });
      const distributionV2Implementation = await distributionV2Factory.deploy();

      await mor20FactoryL1.setNewImplementations(poolTypes, [distributionV2Implementation, l1SenderImplementation]);

      const distribution = await ethers.getContractAt('DistributionV2', distributionAddress);

      expect(await distribution.version()).to.equal(2);
    });

    it('should revert if called by a non-owner', async () => {
      await expect(
        mor20FactoryL1.connect(SECOND).setNewImplementations(poolTypes, poolImplementations),
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });
});
