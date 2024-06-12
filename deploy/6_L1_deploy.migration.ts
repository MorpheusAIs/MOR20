import { Deployer, Reporter } from '@solarity/hardhat-migrate';

import { configEthSepoliaToBaseSepolia } from './data/configEthSepoliaToBaseSepolia';

import {
  DistributionToBase__factory,
  ERC1967Proxy__factory,
  FeeConfig__factory,
  L1BaseSender__factory,
  L1FactoryToBase__factory,
  L2Factory__factory,
} from '@/generated-types/ethers';

const l1FactoryAddress = '0x5081a39b8A5f0E35a8D959395a630b68B74Dd30f';
const l2MessageReceiver = '0x4826533B4897376654Bb4d4AD88B7faFD0C98528';
const l2TokenReceiver = '0x6480af441A4aCb209753E7aD97f2aF2FFAe9A3bB';

module.exports = async function (deployer: Deployer) {
  const { l1Params } = configEthSepoliaToBaseSepolia;

  const l1Factory = await deployer.deployed(L1FactoryToBase__factory, l1FactoryAddress);

  const signer = await deployer.getSigner();
  const signerAddress = await signer.getAddress();

  l1Params.l2MessageReceiver = l2MessageReceiver;
  l1Params.l2TokenReceiver = l2TokenReceiver;

  // await l1Factory.deploy(l1Params);

  const a = await l1Factory.getDeployedPools(signerAddress, 0, 100);
  console.log(a);

  Reporter.reportContracts(
    ['L1 Factory', await l1Factory.getAddress()],
    // ['Fee Config', await fee.getAddress()],
    // ['Distribution To Base Implementation', await distributionToBaseImpl.getAddress()],
    // ['L1 Base Sender Implementation', await l1BaseSenderImpl.getAddress()],
  );
};

// npx hardhat migrate --network localhost --only 6
