import { Deployer, Reporter } from '@solarity/hardhat-migrate';

import { NonfungiblePositionManagerMock__factory, SwapRouterMock__factory } from '@/generated-types/ethers';

module.exports = async function (deployer: Deployer) {
  const swapRouter = await deployer.deploy(SwapRouterMock__factory);

  const nonfungiblePositionManager = await deployer.deploy(NonfungiblePositionManagerMock__factory);

  Reporter.reportContracts(
    ['swapRouter', await swapRouter.getAddress()],
    ['nonfungiblePositionManager', await nonfungiblePositionManager.getAddress()],
  );
};
