import { Deployer, Reporter } from '@solarity/hardhat-migrate';

import { configEthSepoliaToBaseSepolia } from './data/configEthSepoliaToBaseSepolia';

import {
  DistributionToBase__factory,
  ERC1967Proxy__factory,
  FeeConfig__factory,
  L1BaseSender__factory,
  L1FactoryToBase__factory,
} from '@/generated-types/ethers';
import { PoolTypesL1 } from '@/test/helpers/helper';

const deployImplementations = async (deployer: Deployer) => {
  const distributionToBaseImpl = await deployer.deploy(DistributionToBase__factory);
  const l1BaseSenderImpl = await deployer.deploy(L1BaseSender__factory);

  const l1FactoryImpl = await deployer.deploy(L1FactoryToBase__factory);
  const l1FactoryProxy = await deployer.deploy(ERC1967Proxy__factory, [await l1FactoryImpl.getAddress(), '0x'], {
    name: 'L1FactoryProxy',
  });
  const l1Factory = await deployer.deployed(L1FactoryToBase__factory, await l1FactoryProxy.getAddress());

  const feeConfigImpl = await deployer.deploy(FeeConfig__factory);
  const feeConfigProxy = await deployer.deploy(ERC1967Proxy__factory, [await feeConfigImpl.getAddress(), '0x'], {
    name: 'FeeConfigProxy',
  });
  const feeConfig = await deployer.deployed(FeeConfig__factory, await feeConfigProxy.getAddress());

  return { distributionToBaseImpl, l1BaseSenderImpl, feeConfig, l1Factory };
};

module.exports = async function (deployer: Deployer) {
  const { lzExternalDepsForL1, baseExternalDeps, feeConfig, depositTokenExternalDeps } = configEthSepoliaToBaseSepolia;

  const { distributionToBaseImpl, l1BaseSenderImpl, feeConfig: fee, l1Factory } = await deployImplementations(deployer);

  await l1Factory.L1FactoryToBase_init();
  await fee.FeeConfig_init(feeConfig.treasury, feeConfig.baseFee);

  await l1Factory.setDepositTokenExternalDeps(depositTokenExternalDeps);
  await l1Factory.setLzExternalDeps(lzExternalDepsForL1);
  await l1Factory.setBaseExternalDeps(baseExternalDeps);
  await l1Factory.setFeeConfig(await fee.getAddress());
  await l1Factory.setImplementations(
    [PoolTypesL1.DISTRIBUTION, PoolTypesL1.L1_SENDER],
    [distributionToBaseImpl, l1BaseSenderImpl],
  );

  Reporter.reportContracts(
    ['L1 Factory', await l1Factory.getAddress()],
    ['Fee Config', await fee.getAddress()],
    ['Distribution To Base Implementation', await distributionToBaseImpl.getAddress()],
    ['L1 Base Sender Implementation', await l1BaseSenderImpl.getAddress()],
  );
};

// npx hardhat migrate --network localhost --only 1
