import { ethers } from 'hardhat';

async function main() {
  const owner = await ethers.getImpersonatedSigner('0x040EF6Fb6592A70291954E2a6a1a8F320FF10626');
  const rich = await ethers.getImpersonatedSigner('0xE53FFF67f9f384d20Ebea36F43b93DC49Ed22753');

  const stETH = await ethers.getContractAt('StETHMock', '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84', rich);

  const distribution = await ethers.getContractAt(
    'DistributionToBase',
    '0xcB7FdF9ccbdA5C9E9968fa021C5A5d051C4fF35e',
    owner,
  );

  console.log(await distribution.overplus());

  await stETH.transfer(distribution, 1000000000000000);

  console.log(await distribution.overplus());

  await distribution.bridgeOverplus(200_000, '0x');

  console.log(await distribution.overplus());

  console.log(')');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

// npx hardhat run scripts/bridgeOverplus.ts --network localhost
