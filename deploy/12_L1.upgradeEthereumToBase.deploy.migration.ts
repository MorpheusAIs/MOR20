import { Deployer, Reporter } from '@solarity/hardhat-migrate';

import { DistributionToBaseV4__factory, L1FactoryToBase__factory } from '@/generated-types/ethers';
import { PoolTypesL1 } from '@/test/helpers/helper';

const l1FactoryToBaseAddress = '0x890BfA255E6EE8DB5c67aB32dc600B14EBc4546c';

const deployNewImplementations = async (deployer: Deployer) => {
  const distributionToBaseV4Impl = await deployer.deploy(DistributionToBaseV4__factory);

  const l1Factory = await deployer.deployed(L1FactoryToBase__factory, l1FactoryToBaseAddress);

  return { distributionToBaseV4Impl, l1Factory };
};

module.exports = async function (deployer: Deployer) {
  const { distributionToBaseV4Impl, l1Factory } = await deployNewImplementations(deployer);

  await l1Factory.setImplementations([PoolTypesL1.DISTRIBUTION], [distributionToBaseV4Impl]);

  Reporter.reportContracts(['Distribution To Base V4 Implementation', await distributionToBaseV4Impl.getAddress()]);
};

// npx hardhat migrate --network localhost --only 12
// npx hardhat migrate --network sepolia --only 12 --verify
// npx hardhat migrate --network ethereum --only 12 --verify
