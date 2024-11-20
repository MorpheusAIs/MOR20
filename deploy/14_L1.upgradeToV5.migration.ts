import { Deployer, Reporter } from '@solarity/hardhat-migrate';

// import { ethers } from 'hardhat';
import {
  DistributionToArbV5__factory,
  DistributionToBaseV5__factory,
  L1FactoryToArb__factory,
  L1FactoryToBase__factory,
} from '@/generated-types/ethers';
import { PoolTypesL1 } from '@/test/helpers/helper';

const l1FactoryToBaseAddress = '0x890BfA255E6EE8DB5c67aB32dc600B14EBc4546c';
const l1FactoryToArbAddress = '0x969c0f87623dc33010b4069fea48316ba2e45382';

module.exports = async function (deployer: Deployer) {
  // TODO: remove on real call
  // const OWNER = await ethers.getImpersonatedSigner('0x040EF6Fb6592A70291954E2a6a1a8F320FF10626');

  const distributionToBaseImpl = await deployer.deploy(DistributionToBaseV5__factory);
  const distributionToArbImpl = await deployer.deploy(DistributionToArbV5__factory);

  const l1FactoryToBase = await deployer.deployed(L1FactoryToBase__factory, l1FactoryToBaseAddress);
  const l1FactoryToArb = await deployer.deployed(L1FactoryToArb__factory, l1FactoryToArbAddress);

  // TODO: remove `.connect(OWNER)` on real call
  await l1FactoryToBase.setImplementations([PoolTypesL1.DISTRIBUTION], [distributionToBaseImpl]);
  await l1FactoryToArb.setImplementations([PoolTypesL1.DISTRIBUTION], [distributionToArbImpl]);

  Reporter.reportContracts(['Distribution To Base V5 Implementation', await distributionToBaseImpl.getAddress()]);
  Reporter.reportContracts(['Distribution To Arb V5 Implementation', await distributionToArbImpl.getAddress()]);
};

// npx hardhat migrate --only 14
// npx hardhat migrate --network ethereum --only 14 --verify
