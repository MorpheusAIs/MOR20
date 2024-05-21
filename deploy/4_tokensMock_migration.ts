import { Deployer, Reporter } from '@solarity/hardhat-migrate';

import { StETHMock__factory, WStETHMock__factory } from '@/generated-types/ethers';
import { wei } from '@/scripts/utils/utils';

module.exports = async function (deployer: Deployer) {
  const stETH = await deployer.deploy(StETHMock__factory);
  const wStETH = await deployer.deploy(WStETHMock__factory, [await stETH.getAddress()]);

  await stETH.mint((await deployer.getSigner()).getAddress(), wei('1000'));
  await wStETH.mint((await deployer.getSigner()).getAddress(), wei('1000'));

  Reporter.reportContracts(['stETH', await stETH.getAddress()], ['wStETH', await wStETH.getAddress()]);
};
