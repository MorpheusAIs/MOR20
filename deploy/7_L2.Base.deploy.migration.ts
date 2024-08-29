import { Deployer, Reporter } from '@solarity/hardhat-migrate';

import { configEthToBase } from './data/configEthToBase';

import { IL2Factory, L2Factory__factory } from '@/generated-types/ethers';

const l2FactoryAddress = '0xE50009c299fD3952564Debd773b6E07F450d76AF';

const l1Sender = '0xe301AF22332C91e546a13C575292600F8A640E15';

module.exports = async function (deployer: Deployer) {
  const { l2Params } = configEthToBase;
  l2Params.l1Sender = l1Sender;

  const l2Factory = await deployer.deployed(L2Factory__factory, l2FactoryAddress);

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

// npx hardhat migrate --network localhost --only 7
// npx hardhat migrate --network base_sepolia --only 7 --verify
