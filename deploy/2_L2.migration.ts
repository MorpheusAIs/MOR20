import { Deployer, Reporter } from '@solarity/hardhat-migrate';

import { configEthSepoliaToBaseSepolia } from './data';

import {
  ERC1967Proxy__factory,
  L2Factory__factory,
  L2MessageReceiver__factory,
  L2TokenReceiver__factory,
} from '@/generated-types/ethers';
import { PoolTypesL2 } from '@/test/helpers/helper';

const deployImplementations = async (deployer: Deployer) => {
  const l2MessageReceiverImpl = await deployer.deploy(L2MessageReceiver__factory);
  const l2TokenReceiverImpl = await deployer.deploy(L2TokenReceiver__factory);

  const l2FactoryImpl = await deployer.deploy(L2Factory__factory);
  const l2FactoryProxy = await deployer.deploy(ERC1967Proxy__factory, [await l2FactoryImpl.getAddress(), '0x'], {
    name: 'L2FactoryProxy',
  });
  const l2Factory = await deployer.deployed(L2Factory__factory, await l2FactoryProxy.getAddress());

  return { l2MessageReceiverImpl, l2TokenReceiverImpl, l2Factory };
};

module.exports = async function (deployer: Deployer) {
  const { lzExternalDepsForL2, uniswapExternalDeps } = configEthSepoliaToBaseSepolia;

  const { l2MessageReceiverImpl, l2TokenReceiverImpl, l2Factory } = await deployImplementations(deployer);

  await l2Factory.L2Factory_init();
  await l2Factory.setLzExternalDeps(lzExternalDepsForL2);
  await l2Factory.setUniswapExternalDeps(uniswapExternalDeps);

  await l2Factory.setImplementations(
    [PoolTypesL2.L2_MESSAGE_RECEIVER, PoolTypesL2.L2_TOKEN_RECEIVER],
    [l2MessageReceiverImpl, l2TokenReceiverImpl],
  );

  Reporter.reportContracts(
    ['L2 Factory', await l2Factory.getAddress()],
    ['L2 Message Receiver Implementation', await l2MessageReceiverImpl.getAddress()],
    ['L2 Token Receiver Implementation', await l2TokenReceiverImpl.getAddress()],
  );
};

// npx hardhat migrate --network localhost --only 2
