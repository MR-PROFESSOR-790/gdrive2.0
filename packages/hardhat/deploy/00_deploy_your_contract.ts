import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";

/**
 * Deploys the GDrive contract using the deployer account as the initial owner.
 * The contract will be initialized with subscription tiers and the deployer will get a free subscription.
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

  // Fetch initial configuration
  const maxFileSize = await gDrive.maxFileSize();
  const storageRate = await gDrive.storageRatePerMBPerYear();
  const bandwidthRate = await gDrive.bandwidthRatePerGB();
  const minimumStoragePeriod = await gDrive.minimumStoragePeriod();

  // Get subscription tiers configuration
  const [storageLimits, bandwidthLimits, prices] = await gDrive.getSubscriptionTiers();

  console.log("\n✅ GDrive deployed successfully!");
  console.log("📝 Contract address:", gDriveDeployment.address);
  console.log("👤 Initial owner:", deployer);

  console.log("\n📊 Initial Configuration:");
  console.log("💾 Max file size:", hre.ethers.formatUnits(maxFileSize, 0), "bytes");
  console.log("💰 Storage rate per MB/year:", hre.ethers.formatEther(storageRate), "ETH");
  console.log("🌐 Bandwidth rate per GB:", hre.ethers.formatEther(bandwidthRate), "ETH");
  console.log("⏱️ Minimum storage period:", Number(minimumStoragePeriod) / (24 * 60 * 60), "days");

  console.log("\n📈 Subscription Tiers:");
  for (let i = 0; i < storageLimits.length; i++) {
    console.log(`\nTier ${i}:`);
    console.log(`   Storage Limit: ${hre.ethers.formatUnits(storageLimits[i], 0)} bytes`);
    console.log(`   Bandwidth Limit: ${hre.ethers.formatUnits(bandwidthLimits[i], 0)} bytes`);
    console.log(`   Price: ${hre.ethers.formatEther(prices[i])} ETH`);
  }
};

export default deployGDrive;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags GDrive
deployGDrive.tags = ["GDrive"];
