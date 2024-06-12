import { Deployer, Reporter } from '@solarity/hardhat-migrate';

import { configEthSepoliaToBaseSepolia } from './data/configEthSepoliaToBaseSepolia';

import { IL1Factory, L1FactoryToBase__factory } from '@/generated-types/ethers';

const l1FactoryAddress = '0x5081a39b8A5f0E35a8D959395a630b68B74Dd30f';

const l2MessageReceiver = '0x4826533B4897376654Bb4d4AD88B7faFD0C98528';
const l2TokenReceiver = '0x6480af441A4aCb209753E7aD97f2aF2FFAe9A3bB';

module.exports = async function (deployer: Deployer) {
  const { l1Params } = configEthSepoliaToBaseSepolia;
  l1Params.l2MessageReceiver = l2MessageReceiver;
  l1Params.l2TokenReceiver = l2TokenReceiver;

  const l1Factory = await deployer.deployed(L1FactoryToBase__factory, l1FactoryAddress);

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

// npx hardhat migrate --network localhost --only 6
