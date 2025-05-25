import { useState } from "react";
import { parseEther } from "viem";
import { useAccount } from "wagmi";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

interface Tier {
  storageLimit: bigint;
  bandwidthLimit: bigint;
  price: bigint;
}

export const Subscription = () => {
  const [selectedTier, setSelectedTier] = useState(0);
  const [duration, setDuration] = useState(30); // days
  const { address } = useAccount();

  const { data: tiers } = useScaffoldReadContract({
    contractName: "GDrive",
    functionName: "getSubscriptionTiers",
  });

  const { writeContractAsync: purchaseSubscription, isPending: isPurchasing } = useScaffoldWriteContract({
    contractName: "GDrive",
  });

  const handlePurchase = async () => {
    if (!address || !tiers) return;

    try {
      const tierData = tiers as unknown as [Tier[], Tier[], Tier[]];
      const selectedTierData = tierData[selectedTier][0];
      const durationInSeconds = BigInt(duration * 24 * 60 * 60);
      const cost = (selectedTierData.price * BigInt(duration)) / BigInt(30); // Monthly price * number of months

      await purchaseSubscription({
        functionName: "purchaseSubscription",
        args: [selectedTier, durationInSeconds, "0x0000000000000000000000000000000000000000"],
        value: parseEther(cost.toString()),
      });

      notification.success("Subscription purchased successfully!");
    } catch (error) {
      console.error("Purchase error:", error);
      notification.error("Failed to purchase subscription");
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-base-200 rounded-lg">
      <h2 className="text-xl font-bold">Subscription Plans</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tiers &&
          (tiers as unknown as [Tier[], Tier[], Tier[]]).map((tier, index) => (
            <div
              key={index}
              className={`card bg-base-100 shadow-xl ${selectedTier === index ? "ring-2 ring-primary" : ""}`}
            >
              <div className="card-body">
                <h3 className="card-title">Tier {index}</h3>
                <p>Storage: {Number(tier[0]) / (1024 * 1024 * 1024)} GB</p>
                <p>Bandwidth: {Number(tier[1]) / (1024 * 1024 * 1024)} GB</p>
                <p>Price: {Number(tier[2]) / 1e18} ETH/month</p>
                <div className="card-actions justify-end">
                  <button className="btn btn-primary" onClick={() => setSelectedTier(index)}>
                    Select
                  </button>
                </div>
              </div>
            </div>
          ))}
      </div>
      <div className="flex flex-col gap-2">
        <label className="label">
          <span className="label-text">Duration (days)</span>
        </label>
        <input
          type="number"
          className="input input-bordered"
          value={duration}
          onChange={e => setDuration(Number(e.target.value))}
          min="30"
          step="30"
        />
      </div>
      <button className="btn btn-primary" onClick={handlePurchase} disabled={isPurchasing}>
        {isPurchasing ? "Processing..." : "Purchase Subscription"}
      </button>
    </div>
  );
};
