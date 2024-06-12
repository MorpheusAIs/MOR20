import { Deployer, Reporter } from '@solarity/hardhat-migrate';

import { configEthSepoliaToArbitrumSepolia } from './data';

import {
  DistributionToArb__factory,
  ERC1967Proxy__factory,
  FeeConfig__factory,
  L1ArbSender__factory,
  L1FactoryToArb__factory,
} from '@/generated-types/ethers';
import { PoolTypesL1 } from '@/test/helpers/helper';

const deployImplementations = async (deployer: Deployer) => {
  const distributionToArbImpl = await deployer.deploy(DistributionToArb__factory);
  const l1ArbSenderImpl = await deployer.deploy(L1ArbSender__factory);

  const l1FactoryImpl = await deployer.deploy(L1FactoryToArb__factory);
  const l1FactoryProxy = await deployer.deploy(ERC1967Proxy__factory, [await l1FactoryImpl.getAddress(), '0x'], {
    name: 'L1FactoryProxy',
  });
  const l1Factory = await deployer.deployed(L1FactoryToArb__factory, await l1FactoryProxy.getAddress());

  const feeConfigImpl = await deployer.deploy(FeeConfig__factory);
  const feeConfigProxy = await deployer.deploy(ERC1967Proxy__factory, [await feeConfigImpl.getAddress(), '0x'], {
    name: 'FeeConfigProxy',
  });
  const feeConfig = await deployer.deployed(FeeConfig__factory, await feeConfigProxy.getAddress());

  return { distributionToArbImpl, l1ArbSenderImpl, feeConfig, l1Factory };
};

module.exports = async function (deployer: Deployer) {
  const { lzExternalDepsForL1, arbitrumExternalDeps, feeConfig, depositTokenExternalDeps } =
    configEthSepoliaToArbitrumSepolia;

  const { distributionToArbImpl, l1ArbSenderImpl, feeConfig: fee, l1Factory } = await deployImplementations(deployer);

  await l1Factory.L1FactoryToArb_init();
  await fee.FeeConfig_init(feeConfig.treasury, feeConfig.baseFee);

  await l1Factory.setDepositTokenExternalDeps(depositTokenExternalDeps);
  await l1Factory.setLzExternalDeps(lzExternalDepsForL1);
  await l1Factory.setArbExternalDeps(arbitrumExternalDeps);
  await l1Factory.setFeeConfig(await fee.getAddress());
  await l1Factory.setImplementations(
    [PoolTypesL1.DISTRIBUTION, PoolTypesL1.L1_SENDER],
    [distributionToArbImpl, l1ArbSenderImpl],
  );

  Reporter.reportContracts(
    ['L1 Factory', await l1Factory.getAddress()],
    ['Fee Config', await fee.getAddress()],
    ['Distribution To Arb Implementation', await distributionToArbImpl.getAddress()],
    ['L1 Arb Sender Implementation', await l1ArbSenderImpl.getAddress()],
  );
};

// npx hardhat migrate --network localhost --only 1
