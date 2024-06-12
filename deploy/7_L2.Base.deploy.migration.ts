import { Deployer, Reporter } from '@solarity/hardhat-migrate';

import { configEthSepoliaToBaseSepolia } from './data/configEthSepoliaToBaseSepolia';

import { IL2Factory, L1FactoryToBase__factory } from '@/generated-types/ethers';

const l2FactoryAddress = '';

const l1Sender = '';

module.exports = async function (deployer: Deployer) {
  const { l2Params } = configEthSepoliaToBaseSepolia;
  l2Params.l1Sender = l1Sender;

  const l2Factory = await deployer.deployed(L1FactoryToBase__factory, l2FactoryAddress);

  await l2Factory.deploy(l2Params);

  const deployedPools: IL2Factory.PoolViewStructOutput[] = await l2Factory.getDeployedPools(
    await deployer.getSigner(),
    0,
    100,
  );

  const lastPool = deployedPools[deployedPools.length - 1];

  Reporter.reportContracts(
    ['L2 Factory', l2FactoryAddress],
    ['L2 Message Receiver', lastPool.l2MessageReceiver],
    ['L2 Token Receiver', lastPool.l2TokenReceiver],
    ['MOR20 Token', lastPool.mor20],
  );
};

// npx hardhat migrate --network localhost --only 6
