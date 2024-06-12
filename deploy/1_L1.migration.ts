import { Deployer, Reporter } from '@solarity/hardhat-migrate';

import { parseConfig } from './helpers/config-parser';

import {
  Distribution__factory,
  ERC1967Proxy__factory,
  FeeConfig__factory,
  L1Factory__factory,
  L1Sender__factory,
} from '@/generated-types/ethers';
import { PoolTypesL1 } from '@/test/helpers/helper';

module.exports = async function (deployer: Deployer) {
  const config = parseConfig(await deployer.getChainId());

  const distributionImpl = await deployer.deploy(Distribution__factory);
  const L1SenderImpl = await deployer.deploy(L1Sender__factory);

  const feeConfigImpl = await deployer.deploy(FeeConfig__factory);
  const feeConfigProxy = await deployer.deploy(ERC1967Proxy__factory, [await feeConfigImpl.getAddress(), '0x'], {
    name: 'FeeConfigProxy',
  });

  const feeConfig = await deployer.deployed(FeeConfig__factory, await feeConfigProxy.getAddress());

  await feeConfig.FeeConfig_init(config.feeConfig.treasury, config.feeConfig.baseFee);

  const l1FactoryImpl = await deployer.deploy(L1Factory__factory);
  const l1FactoryProxy = await deployer.deploy(ERC1967Proxy__factory, [await l1FactoryImpl.getAddress(), '0x'], {
    name: 'L1FactoryProxy',
  });
  const l1Factory = await deployer.deployed(L1Factory__factory, await l1FactoryProxy.getAddress());

  await l1Factory.L1Factory_init();

  await l1Factory.setDepositTokenExternalDeps(config.depositTokenExternalDeps);
  await l1Factory.setLzExternalDeps(config.lzExternalDeps);
  await l1Factory.setArbExternalDeps(config.arbExternalDeps);

  await l1Factory.setFeeConfig(feeConfig);

  await l1Factory.setImplementations(
    [PoolTypesL1.DISTRIBUTION, PoolTypesL1.L1_SENDER],
    [distributionImpl, L1SenderImpl],
  );

  Reporter.reportContracts(
    ['l1Factory', await l1Factory.getAddress()],
    ['FeeConfig', await feeConfig.getAddress()],
    ['DistributionImpl', await distributionImpl.getAddress()],
    ['L1SenderImpl', await L1SenderImpl.getAddress()],
  );
};
