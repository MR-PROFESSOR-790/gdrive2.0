const hre = require("hardhat");

async function main() {
  const contractAddress = "0xBB5A4C9538B384F42D7f517ea25c15CFFB1BEE0c";
  const initialOwner = "0x92bce0933124a954d2b070b7acd248ca02087bcb3aa92aa182d11ac5c3eeccd3";

  console.log("Verifying contract...");
  try {
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: [initialOwner],
    });
    console.log("Contract verified successfully");
  } catch (error) {
    console.error("Error verifying contract:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 