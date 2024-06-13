import { Deployer, Reporter } from '@solarity/hardhat-migrate';

import { L1ERC20TokenBridgeMock__factory } from '@/generated-types/ethers';

module.exports = async function (deployer: Deployer) {
  const gatewayToBase = await deployer.deploy(L1ERC20TokenBridgeMock__factory);

  Reporter.reportContracts(['Gateway To Base', await gatewayToBase.getAddress()]);
};

// npx hardhat migrate --network sepolia --only 5 --verify
