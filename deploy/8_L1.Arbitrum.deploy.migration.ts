import { Deployer, Reporter } from '@solarity/hardhat-migrate';

import { configEthSepoliaToArbitrumSepolia } from './data/configEthSepoliaToArbitrumSepolia';

import { IL1Factory, L1FactoryToArb__factory } from '@/generated-types/ethers';

const l1FactoryAddress = '';

const l2MessageReceiver = '';
const l2TokenReceiver = '';

module.exports = async function (deployer: Deployer) {
  const { l1Params } = configEthSepoliaToArbitrumSepolia;
  l1Params.l2MessageReceiver = l2MessageReceiver;
  l1Params.l2TokenReceiver = l2TokenReceiver;

  const l1Factory = await deployer.deployed(L1FactoryToArb__factory, l1FactoryAddress);

  await l1Factory.deploy(l1Params);

  const deployedPools: IL1Factory.PoolViewStructOutput[] = await l1Factory.getDeployedPools(
    await deployer.getSigner(),
    0,
    100,
  );

  const lastPool = deployedPools[deployedPools.length - 1];

  Reporter.reportContracts(
    ['L1 Factory', await l1Factory.getAddress()],
    ['Distribution', lastPool.distribution],
    ['L1 Sender', lastPool.l1Sender],
  );
};

// npx hardhat migrate --network localhost --only 8
// npx hardhat migrate --network sepolia --only 8 --verify
