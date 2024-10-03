import { Deployer, Reporter } from '@solarity/hardhat-migrate';

import { DistributionToArbV4__factory } from '@/generated-types/ethers';
import { PoolTypesL1 } from '@/test/helpers/helper';

const l1FactoryToArbitrumAddress = '0x969C0F87623dc33010b4069Fea48316Ba2e45382';

const deployNewImplementations = async (deployer: Deployer) => {
  const distributionToArbV4Impl = await deployer.deploy(DistributionToArbV4__factory);

  const l1Factory = await deployer.deployed(distributionToArbV4Impl, l1FactoryToArbitrumAddress);

  return { distributionToArbV4Impl, l1Factory };
};

module.exports = async function (deployer: Deployer) {
  const { distributionToArbV4Impl, l1Factory } = await deployNewImplementations(deployer);

  await l1Factory.setImplementations([PoolTypesL1.DISTRIBUTION], [distributionToArbV4Impl]);

  Reporter.reportContracts(['Distribution To Arbitrum V4 Implementation', await distributionToArbV4Impl.getAddress()]);
};

// npx hardhat migrate --network localhost --only 13
// npx hardhat migrate --network sepolia --only 13 --verify
// npx hardhat migrate --network ethereum --only 13 --verify
