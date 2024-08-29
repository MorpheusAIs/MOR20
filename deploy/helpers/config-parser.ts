/* eslint-disable @typescript-eslint/no-explicit-any */
import { BigNumberish } from 'ethers';
import { readFileSync } from 'fs';

import { IL1Factory, IL2Factory } from '@/generated-types/ethers';
import { IL1FactoryToArb } from '@/generated-types/ethers/contracts/interfaces/factories/IL1FactoryToArb';
import { ZERO_ADDR } from '@/scripts/utils/constants';

type FeeConfig = {
  baseFee: BigNumberish;
  treasury: string;
};

export type Config = {
  feeConfig: FeeConfig;

  depositTokenExternalDeps: IL1Factory.DepositTokenExternalDepsStruct;
  lzExternalDeps: IL1Factory.LzExternalDepsStruct;
  arbExternalDeps: IL1FactoryToArb.ArbExternalDepsStruct;

  lzTokenExternalDeps: IL2Factory.LzExternalDepsStruct;
  uniswapExternalDeps: IL2Factory.UniswapExternalDepsStruct;
};

export function parseConfig(chainId: bigint): Config {
  let configPath: string;

  if (chainId === 31337n) {
    configPath = `deploy/data/config_localhost.json`;
  } else if (chainId === 1n || chainId === 42161n) {
    configPath = `deploy/data/config.json`;
  } else if (chainId === 5n || chainId === 421613n) {
    configPath = `deploy/data/config_goerli.json`;
  } else if (chainId === 11155111n || chainId === 421614n) {
    configPath = `deploy/data/config_sepolia.json`;
  } else {
    throw new Error(`Invalid chainId`);
  }

  // configPath = `deploy/data/config.json`;

  const config: Config = JSON.parse(readFileSync(configPath, 'utf-8')) as Config;

  validateFeeConfig(config.feeConfig);

  validateDepositTokenExternalDeps(config.depositTokenExternalDeps);
  validateLzExternalDeps(config.lzExternalDeps);
  validateArbExternalDeps(config.arbExternalDeps);

  validateLzTokenExternalDeps(config.lzTokenExternalDeps);
  validateUniswapExternalDeps(config.uniswapExternalDeps);

  return config;
}

function nonNumber(value: BigNumberish) {
  return !(typeof value === 'number' || typeof value === 'bigint' || typeof BigInt(value) === 'bigint');
}

function nonZeroAddr(filedDataRaw: any, filedName: string) {
  if (isZeroAddr(filedDataRaw)) {
    throw new Error(`Invalid ${filedName} filed.`);
  }
}

function isZeroAddr(filedDataRaw: string | undefined) {
  return isEmptyField(filedDataRaw) || filedDataRaw === ZERO_ADDR;
}

function isEmptyField(filedDataRaw: any) {
  return !filedDataRaw || filedDataRaw == '';
}

function validateFeeConfig(feeConfig: FeeConfig) {
  if (feeConfig === undefined) {
    throw new Error(`Invalid feeConfig.`);
  }
  if (nonNumber(feeConfig.baseFee)) {
    throw new Error(`Invalid feeConfig.baseFee.`);
  }
  nonZeroAddr(feeConfig.treasury, 'feeConfig.treasury');
}

function validateDepositTokenExternalDeps(depositTokenExternalDeps: IL1Factory.DepositTokenExternalDepsStruct) {
  if (depositTokenExternalDeps === undefined) {
    throw new Error(`Invalid depositTokenExternalDeps.`);
  }
  nonZeroAddr(depositTokenExternalDeps.token, 'depositTokenExternalDeps.token');
  nonZeroAddr(depositTokenExternalDeps.wToken, 'depositTokenExternalDeps.wToken');
}

function validateLzExternalDeps(lzExternalDeps: IL1Factory.LzExternalDepsStruct) {
  if (lzExternalDeps === undefined) {
    throw new Error(`Invalid lzExternalDeps.`);
  }

  nonZeroAddr(lzExternalDeps.endpoint, 'lzExternalDeps.endpoint');

  if (isEmptyField(lzExternalDeps.zroPaymentAddress)) {
    throw new Error(`Invalid lzExternalDeps.zroPaymentAddress.`);
  }
  if (isEmptyField(lzExternalDeps.adapterParams)) {
    throw new Error(`Invalid lzExternalDeps.adapterParams.`);
  }
  if (nonNumber(lzExternalDeps.destinationChainId)) {
    throw new Error(`Invalid lzExternalDeps.destinationChainId.`);
  }
}

function validateArbExternalDeps(arbExternalDeps: IL1FactoryToArb.ArbExternalDepsStruct) {
  if (arbExternalDeps === undefined) {
    throw new Error(`Invalid arbExternalDeps.`);
  }
  nonZeroAddr(arbExternalDeps.endpoint, 'arbExternalDeps.endpoint');
}

function validateLzTokenExternalDeps(lzTokenExternalDeps: IL2Factory.LzExternalDepsStruct) {
  if (lzTokenExternalDeps === undefined) {
    throw new Error(`Invalid lzTokenExternalDeps.`);
  }

  nonZeroAddr(lzTokenExternalDeps.endpoint, 'lzTokenExternalDeps.endpoint');
  nonZeroAddr(lzTokenExternalDeps.oftEndpoint, 'lzTokenExternalDeps.oftEndpoint');
  if (nonNumber(lzTokenExternalDeps.senderChainId)) {
    throw new Error(`Invalid lzTokenExternalDeps.senderChainId.`);
  }
}

function validateUniswapExternalDeps(uniswapExternalDeps: IL2Factory.UniswapExternalDepsStruct) {
  if (uniswapExternalDeps === undefined) {
    throw new Error(`Invalid uniswapExternalDeps.`);
  }

  nonZeroAddr(uniswapExternalDeps.router, 'uniswapExternalDeps.router');
  nonZeroAddr(uniswapExternalDeps.nonfungiblePositionManager, 'uniswapExternalDeps.nonfungiblePositionManager');
}
