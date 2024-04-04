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

describe.only('BaseFactoryL1', () => {
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

  before(async () => {
    [OWNER, SECOND] = await ethers.getSigners();

    const [
      libFactory,
      l1SenderFactory,
      tokenDeployerFactory,
      mor20FactoryL1Factory,
      stEthMockFactory,
      wstEthMockFactory,
      gatewayRouterMockFactory,
      corePropertiesFactory,
    ] = await Promise.all([
      ethers.getContractFactory('LinearDistributionIntervalDecrease'),
      ethers.getContractFactory('L1Sender'),
      ethers.getContractFactory('RewardTokenDeployer'),
      ethers.getContractFactory('Mor20FactoryL1'),
      ethers.getContractFactory('StETHMock'),
      ethers.getContractFactory('WStETHMock'),
      ethers.getContractFactory('GatewayRouterMock'),
      ethers.getContractFactory('CorePropertiesL1'),
    ]);

    let lib: LinearDistributionIntervalDecrease;
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

  afterEach(reverter.revert);

  describe('#predictMor20Address', () => {
    it('should return zero address if name is an empty string', async () => {
      const predictedAddress = await mor20FactoryL1.predictMor20Address(OWNER, '');

      expect(predictedAddress).to.be.deep.equal([ZERO_ADDR, ZERO_ADDR]);
    });
  });

  describe('#getImplementation', () => {
    it('should return current implementation address', async () => {
      await mor20FactoryL1.setNewImplementations(poolTypes, poolImplementations);

      const implementation = await mor20FactoryL1.getImplementation(PoolTypes.DISTRIBUTION);

      expect(implementation).to.be.equal(distributionImplementation);

      const implementation2 = await mor20FactoryL1.getImplementation(PoolTypes.L1_SENDER);

      expect(implementation2).to.be.equal(l1SenderImplementation);
    });

    it('should revert if implementation is not set', async () => {
      const error = "BaseFactory: this mapping doesn't exist";

      await expect(mor20FactoryL1.getImplementation(PoolTypes.DISTRIBUTION)).to.be.revertedWith(error);

      await expect(mor20FactoryL1.getImplementation(PoolTypes.L1_SENDER)).to.be.revertedWith(error);
    });
  });

  describe('#getBeaconProxy', () => {
    it('should return beacon proxy address', async () => {
      await mor20FactoryL1.setNewImplementations(poolTypes, poolImplementations);

      const beaconProxy = await mor20FactoryL1.getBeaconProxy(PoolTypes.DISTRIBUTION);
      expect(beaconProxy).to.be.not.equal(ZERO_ADDR);

      const beaconProxy2 = await mor20FactoryL1.getBeaconProxy(PoolTypes.L1_SENDER);
      expect(beaconProxy2).to.be.not.equal(ZERO_ADDR);
    });

    it('should revert if beacon is not set', async () => {
      const error = 'BaseFactory: bad PublicBeaconProxy';

      await expect(mor20FactoryL1.getBeaconProxy(PoolTypes.DISTRIBUTION)).to.be.revertedWith(error);

      await expect(mor20FactoryL1.getBeaconProxy(PoolTypes.L1_SENDER)).to.be.revertedWith(error);
    });
  });

  describe('#countDistributions', () => {
    it('should return number of deployed distributions', async () => {
      await mor20FactoryL1.setNewImplementations(poolTypes, poolImplementations);

      let params = getMor20DeployParams();

      expect(await mor20FactoryL1.countDistributions()).to.be.equal(0);

      await mor20FactoryL1.deployMor20OnL1(params);

      expect(await mor20FactoryL1.countDistributions()).to.be.equal(1);

      params.name = 'Mor21';
      await mor20FactoryL1.deployMor20OnL1(params);

      expect(await mor20FactoryL1.countDistributions()).to.be.equal(2);
    });
  });

  describe('#listDistributions', () => {
    it('should return list of deployed distributions', async () => {
      await mor20FactoryL1.setNewImplementations(poolTypes, poolImplementations);

      let params = getMor20DeployParams();

      expect(await mor20FactoryL1.listDistributions(0, 10)).to.be.deep.equal([]);

      await mor20FactoryL1.deployMor20OnL1(params);

      expect(await mor20FactoryL1.listDistributions(0, 10)).to.be.lengthOf(1);

      expect(await mor20FactoryL1.listDistributions(1, 10)).to.be.lengthOf(0);
    });
  });
});
