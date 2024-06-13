import { ethers } from 'hardhat';

import { wei } from './utils/utils';

import { setTime } from '@/test/helpers/block-helper';

async function main() {
  const rich = await ethers.getImpersonatedSigner('0xE53FFF67f9f384d20Ebea36F43b93DC49Ed22753');

  const stETH = await ethers.getContractAt('StETHMock', '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84', rich);

  const distribution = await ethers.getContractAt(
    'DistributionToBase',
    '0xcB7FdF9ccbdA5C9E9968fa021C5A5d051C4fF35e',
    rich,
  );

  await stETH.approve(distribution, wei(1));
  await distribution.stake(0, wei(1));

  await setTime(1718366400 + 7776001);

  console.log('CurrentUserReward', await distribution.getCurrentUserReward(0, rich));

  await distribution.claim(0, rich, { value: wei(1) });

  console.log(')');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

// npx hardhat run scripts/stakeAndClaim.ts --network localhost
