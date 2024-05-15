import { Deployer, Reporter } from '@solarity/hardhat-migrate';

import { parseConfig } from './helpers/config-parser';

import {
  ERC1967Proxy__factory,
  L2Factory__factory,
  L2MessageReceiver__factory,
  L2TokenReceiver__factory,
} from '@/generated-types/ethers';
import { PoolTypesL2 } from '@/test/helpers/helper';

module.exports = async function (deployer: Deployer) {
  const config = parseConfig(await deployer.getChainId());

  const l2MessageReceiverImpl = await deployer.deploy(L2MessageReceiver__factory);
  const l2TokenReceiverImpl = await deployer.deploy(L2TokenReceiver__factory);

  const l2FactoryImpl = await deployer.deploy(L2Factory__factory);
  const l2FactoryProxy = await deployer.deploy(ERC1967Proxy__factory, [await l2FactoryImpl.getAddress(), '0x'], {
    name: 'L2FactoryProxy',
  });
  const l2Factory = await deployer.deployed(L2Factory__factory, await l2FactoryProxy.getAddress());

  await l2Factory.L2Factory_init();

  await l2Factory.setLzExternalDeps(config.lzTokenExternalDeps);
  await l2Factory.setUniswapExternalDeps(config.uniswapExternalDeps);

  await l2Factory.setImplementations(
    [PoolTypesL2.L2_MESSAGE_RECEIVER, PoolTypesL2.L2_TOKEN_RECEIVER],
    [l2MessageReceiverImpl, l2TokenReceiverImpl],
  );

  Reporter.reportContracts(
    ['l2Factory', await l2Factory.getAddress()],
    ['L2MessageReceiverImpl', await l2MessageReceiverImpl.getAddress()],
    ['L2TokenReceiverImpl', await l2TokenReceiverImpl.getAddress()],
  );
};
