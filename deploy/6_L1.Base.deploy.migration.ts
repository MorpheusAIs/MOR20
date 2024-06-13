import { Deployer, Reporter } from '@solarity/hardhat-migrate';

import { configEthToBase } from './data/configEthToBase';

import { IL1Factory, L1FactoryToBase__factory } from '@/generated-types/ethers';

const l1FactoryAddress = '0x890BfA255E6EE8DB5c67aB32dc600B14EBc4546c';

const l2MessageReceiver = '0x2f1C55b06FE644C8b4213dCaBC12aa44e5D6635B';
const l2TokenReceiver = '0x17fA243D84fbffC4c8A78B886EdD574c0102bFb3';

module.exports = async function (deployer: Deployer) {
  const { l1Params } = configEthToBase;
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
// npx hardhat migrate --network sepolia --only 6 --verify
