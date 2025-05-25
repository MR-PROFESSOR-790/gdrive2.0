const hre = require("hardhat");

async function main() {
  const gdvTokenAddress = "0xa078Adba3D5B184196A60724905034824cf39aeA";
  const gdvToken = await hre.ethers.getContractAt("GDVToken", gdvTokenAddress);

  // Amount of ETH to send (0.1 ETH)
  const ethAmount = hre.ethers.parseEther("0.1");
  
  console.log("Buying GDV tokens...");
  try {
    const tx = await gdvToken.buyTokens({ value: ethAmount });
    await tx.wait();
    
    // Get the token amount you'll receive
    const tokenAmount = await gdvToken.getTokenAmount(ethAmount);
    console.log(`Successfully bought ${hre.ethers.formatUnits(tokenAmount, 18)} GDV tokens`);
    console.log(`Transaction hash: ${tx.hash}`);
  } catch (error) {
    console.error("Error buying tokens:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 