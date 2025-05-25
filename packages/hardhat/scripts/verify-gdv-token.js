import { run } from "hardhat";

async function main() {
  const contractAddress = "0xa078Adba3D5B184196A60724905034824cf39aeA";
  const initialOwner = "0xdeFe84043EA9eC2E14747685d7295574b6bFbde7";
  const initialExchangeRate = hre.ethers.parseUnits("1000", 18); // 1000 GDV per ETH

  console.log("Verifying GDV Token contract...");
  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: [initialOwner, initialExchangeRate],
    });
    console.log("GDV Token contract verified successfully");
  } catch (error) {
    console.error("Error verifying GDV Token contract:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
