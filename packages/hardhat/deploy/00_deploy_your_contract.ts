import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";

/**
 * Deploys the GDrive contract using the deployer account as the initial owner.
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployGDrive: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log("Deploying GDrive contract with owner:", deployer);

  // Deploy the GDrive contract
  const gDriveDeployment = await deploy("GDrive", {
    from: deployer,
    args: [deployer], // Initial owner passed to constructor
    log: true,
    autoMine: true, // Speeds up local deployments
  });

  // Get the deployed contract instance
  const gDrive = await hre.ethers.getContract<Contract>("GDrive", deployer);

  // Example interaction: fetch subscription tiers or file limit
  const maxFileSize = await gDrive.maxFileSize();
  const storageRate = await gDrive.storageRatePerMBPerYear();

  console.log("✅ GDrive deployed at:", gDriveDeployment.address);
  console.log("💾 Max file size allowed:", maxFileSize.toString(), "bytes");
  console.log("💰 Storage rate per MB/year (in ETH):", hre.ethers.formatEther(storageRate));
};

export default deployGDrive;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags GDrive
deployGDrive.tags = ["GDrive"];
