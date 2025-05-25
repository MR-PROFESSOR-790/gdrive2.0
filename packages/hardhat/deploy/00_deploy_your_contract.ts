import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";

/**
 * Deploys the GDV token and GDrive contracts, initializes them with proper configuration,
 * and sets up the token integration.
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployContracts: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log("\n🚀 Starting deployment process...");
  console.log("👤 Deployer address:", deployer);

  // Deploy GDV Token
  console.log("\n📝 Deploying GDV Token...");
  const initialExchangeRate = hre.ethers.parseUnits("1000", 18); // 1000 GDV per ETH
  const gdvTokenDeployment = await deploy("GDVToken", {
    from: deployer,
    args: [deployer, initialExchangeRate],
    log: true,
    autoMine: true,
  });

  // Get GDV Token instance
  const gdvToken = await hre.ethers.getContract<Contract>("GDVToken", deployer);
  console.log("✅ GDV Token deployed at:", gdvTokenDeployment.address);
  console.log("💱 Initial exchange rate:", hre.ethers.formatUnits(initialExchangeRate, 0), "GDV per ETH");

  // Deploy GDrive contract
  console.log("\n📝 Deploying GDrive contract...");
  const gDriveDeployment = await deploy("GDrive", {
    from: deployer,
    args: [deployer],
    log: true,
    autoMine: true,
  });

  // Get GDrive instance
  const gDrive = await hre.ethers.getContract<Contract>("GDrive", deployer);
  console.log("✅ GDrive deployed at:", gDriveDeployment.address);

  // Initialize GDrive with GDV token
  console.log("\n🔄 Initializing GDrive with GDV token...");
  const tx = await gDrive.setGDVToken(gdvTokenDeployment.address);
  await tx.wait();
  console.log("✅ GDV token set in GDrive contract");

  // Set GDV discount (10%)
  const gdvDiscount = 1000n; // Using BigInt for better precision
  const discountTx = await gDrive.updateGDVDiscount(gdvDiscount);
  await discountTx.wait();
  console.log("✅ GDV discount set to:", Number(gdvDiscount) / 100, "%");

  // Fetch initial configuration
  const maxFileSize = await gDrive.maxFileSize();
  const storageRate = await gDrive.storageRatePerMBPerYear();
  const bandwidthRate = await gDrive.bandwidthRatePerGB();
  const minimumStoragePeriod = await gDrive.minimumStoragePeriod();

  // Get subscription tiers configuration
  const [storageLimits, bandwidthLimits, prices] = await gDrive.getSubscriptionTiers();

  console.log("\n📊 GDrive Configuration:");
  console.log("💾 Max file size:", maxFileSize.toString(), "bytes");
  console.log("💰 Storage rate per MB/year:", hre.ethers.formatEther(storageRate), "ETH");
  console.log("🌐 Bandwidth rate per GB:", hre.ethers.formatEther(bandwidthRate), "ETH");
  console.log("⏱️ Minimum storage period:", Number(minimumStoragePeriod) / (24 * 60 * 60), "days");

  console.log("\n📈 Subscription Tiers:");
  for (let i = 0; i < storageLimits.length; i++) {
    console.log(`\nTier ${i}:`);
    console.log(`   Storage Limit: ${storageLimits[i].toString()} bytes`);
    console.log(`   Bandwidth Limit: ${bandwidthLimits[i].toString()} bytes`);
    console.log(`   Price: ${hre.ethers.formatEther(prices[i])} ETH`);
  }

  // Verify GDV token integration
  const gdvEnabled = await gDrive.gdvEnabled();
  const gdvTokenAddress = await gDrive.gdvToken();
  const currentDiscount = await gDrive.gdvDiscount();

  console.log("\n🔍 GDV Integration Status:");
  console.log("✅ GDV payments enabled:", gdvEnabled);
  console.log("📝 GDV token address:", gdvTokenAddress);
  console.log("💎 GDV discount:", Number(currentDiscount) / 100, "%");

  // Example of how to use the contracts
  console.log("\n📖 Usage Examples:");
  console.log(`
1. Buy GDV tokens:
   await gdvToken.buyTokens({ value: ethers.parseEther("1") });

2. Upload file with GDV:
   await gdvToken.approve(gDrive.address, amount);
   await gDrive.uploadFileWithGDV(params);

3. Buy subscription with GDV:
   await gdvToken.approve(gDrive.address, amount);
   await gDrive.purchaseSubscriptionWithGDV(tier, duration, referrer);

4. Convert GDV to ETH:
   await gdvToken.approve(gDrive.address, amount);
   await gDrive.convertGDVToEth(amount);
  `);
};

export default deployContracts;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags GDrive
deployContracts.tags = ["GDrive", "GDVToken"];
