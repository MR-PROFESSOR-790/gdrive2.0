const hre = require("hardhat");

async function main() {
  const gdvTokenAddress = "0xa078Adba3D5B184196A60724905034824cf39aeA";
  const gdvToken = await hre.ethers.getContractAt("GDVToken", gdvTokenAddress);
  
  // Get the owner address
  const owner = await gdvToken.owner();
  console.log("Owner address:", owner);

  // Amount to mint (1 million tokens)
  const amountToMint = hre.ethers.parseUnits("1000000", 18); // 1 million GDV tokens
  
  console.log("Minting GDV tokens...");
  try {
    const tx = await gdvToken.mint(owner, amountToMint);
    await tx.wait();
    
    // Check new balance
    const balance = await gdvToken.balanceOf(owner);
    console.log(`Successfully minted ${hre.ethers.formatUnits(amountToMint, 18)} GDV tokens`);
    console.log(`New balance: ${hre.ethers.formatUnits(balance, 18)} GDV tokens`);
    console.log(`Transaction hash: ${tx.hash}`);
  } catch (error) {
    console.error("Error minting tokens:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 