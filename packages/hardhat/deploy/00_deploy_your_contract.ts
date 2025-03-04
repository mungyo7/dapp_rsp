import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
// import { Contract } from "ethers";

/**
 * Deploys a contract named "YourContract" using the deployer account and
 * constructor arguments set to the deployer address
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployYourContract: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  /*
    On localhost, the deployer account is the one that comes with Hardhat, which is already funded.

    When deploying to live networks (e.g `yarn deploy --network sepolia`), the deployer account
    should have sufficient balance to pay for the gas fees for contract creation.

    You can generate a random account with `yarn generate` which will fill DEPLOYER_PRIVATE_KEY
    with a random private key in the .env file (then used on hardhat.config.ts)
    You can run the `yarn account` command to check your balance in every network.
  */
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // 기본 네트워크가 arbitrum인지 확인
  console.log("Deploying to network:", hre.network.name);

  // Arbitrum 특정 설정 추가 (필요한 경우)
  if (hre.network.name === "arbitrum") {
    // Arbitrum 특정 로직
  }

  await deploy("RockPaperScissors", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });

  // // Get the deployed contract to interact with it after deploying.
  // const blockNumber = await hre.ethers.getContract<Contract>("BlockNumber", deployer);
};

export default deployYourContract;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags YourContract
deployYourContract.tags = ["RockPaperScissors"];
