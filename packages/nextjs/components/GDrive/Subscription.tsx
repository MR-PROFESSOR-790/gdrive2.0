import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { parseEther } from "viem";
import { Address } from "viem";
import { useAccount } from "wagmi";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

interface TierData {
  storageLimit: bigint;
  bandwidthLimit: bigint;
  price: bigint;
}

interface SubscriptionData {
  user: Address;
  storageLimit: bigint;
  bandwidthLimit: bigint;
  expiryDate: bigint;
  tier: number;
  isActive: boolean;
}

export const Subscription = () => {
  const [selectedTier, setSelectedTier] = useState(0);
  const [duration, setDuration] = useState(30); // days
  const { address: connectedAddress } = useAccount();

  // --- Read Subscription Tiers ---
  const { data: tier0StorageLimit } = useScaffoldReadContract({
    contractName: "GDrive",
    functionName: "tierStorageLimits",
    args: [0n],
  });
  const { data: tier0BandwidthLimit } = useScaffoldReadContract({
    contractName: "GDrive",
    functionName: "tierBandwidthLimits",
    args: [0n],
  });
  const { data: tier0Price } = useScaffoldReadContract({
    contractName: "GDrive",
    functionName: "tierPrices",
    args: [0n],
  });

  const { data: tier1StorageLimit } = useScaffoldReadContract({
    contractName: "GDrive",
    functionName: "tierStorageLimits",
    args: [1n],
  });
  const { data: tier1BandwidthLimit } = useScaffoldReadContract({
    contractName: "GDrive",
    functionName: "tierBandwidthLimits",
    args: [1n],
  });
  const { data: tier1Price } = useScaffoldReadContract({
    contractName: "GDrive",
    functionName: "tierPrices",
    args: [1n],
  });

  const { data: tier2StorageLimit } = useScaffoldReadContract({
    contractName: "GDrive",
    functionName: "tierStorageLimits",
    args: [2n],
  });
  const { data: tier2BandwidthLimit } = useScaffoldReadContract({
    contractName: "GDrive",
    functionName: "tierBandwidthLimits",
    args: [2n],
  });
  const { data: tier2Price } = useScaffoldReadContract({
    contractName: "GDrive",
    functionName: "tierPrices",
    args: [2n],
  });

  const { data: tier3StorageLimit } = useScaffoldReadContract({
    contractName: "GDrive",
    functionName: "tierStorageLimits",
    args: [3n],
  });
  const { data: tier3BandwidthLimit } = useScaffoldReadContract({
    contractName: "GDrive",
    functionName: "tierBandwidthLimits",
    args: [3n],
  });
  const { data: tier3Price } = useScaffoldReadContract({
    contractName: "GDrive",
    functionName: "tierPrices",
    args: [3n],
  });

  // Combine tier data once all are loaded
  const allTiers: TierData[] = [];
  if (tier0StorageLimit !== undefined && tier0BandwidthLimit !== undefined && tier0Price !== undefined) {
    allTiers.push({
      storageLimit: BigInt(tier0StorageLimit),
      bandwidthLimit: BigInt(tier0BandwidthLimit),
      price: BigInt(tier0Price),
    });
  }
  if (tier1StorageLimit !== undefined && tier1BandwidthLimit !== undefined && tier1Price !== undefined) {
    allTiers.push({
      storageLimit: BigInt(tier1StorageLimit),
      bandwidthLimit: BigInt(tier1BandwidthLimit),
      price: BigInt(tier1Price),
    });
  }
  if (tier2StorageLimit !== undefined && tier2BandwidthLimit !== undefined && tier2Price !== undefined) {
    allTiers.push({
      storageLimit: BigInt(tier2StorageLimit),
      bandwidthLimit: BigInt(tier2BandwidthLimit),
      price: BigInt(tier2Price),
    });
  }
  if (tier3StorageLimit !== undefined && tier3BandwidthLimit !== undefined && tier3Price !== undefined) {
    allTiers.push({
      storageLimit: BigInt(tier3StorageLimit),
      bandwidthLimit: BigInt(tier3BandwidthLimit),
      price: BigInt(tier3Price),
    });
  }

  // --- Read User Subscription Status ---
  const { data: userSubscription, isLoading: isLoadingSubscription } = useScaffoldReadContract({
    contractName: "GDrive",
    functionName: "subscriptions",
    args: [connectedAddress],
    watch: true,
  });

  const { writeContractAsync: purchaseSubscription, isPending: isPurchasing } = useScaffoldWriteContract({
    contractName: "GDrive",
  });

  const handlePurchase = async () => {
    if (!connectedAddress || allTiers.length === 0) return;

    try {
      const durationInSeconds = BigInt(duration * 24 * 60 * 60);

      await purchaseSubscription({
        functionName: "purchaseSubscription",
        args: [selectedTier, durationInSeconds, "0x0000000000000000000000000000000000000000"],
        // Uncomment if payment is in ETH
        // value: selectedTierData.price,
      });

      // Use react-toastify for success notification
      toast.success("Subscription purchased successfully!");
    } catch (error) {
      console.error("Purchase error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      // Use react-toastify for error notification
      toast.error(`Failed to purchase subscription: ${errorMessage}`);
    }
  };

  // Helper function to safely parse subscription data
  const parseSubscriptionData = (data: unknown): SubscriptionData | null => {
    if (!data || typeof data !== "object") return null;

    try {
      // Handle both array and object formats
      if (Array.isArray(data)) {
        const [user, storageLimit, bandwidthLimit, expiryDate, tier, isActive] = data;
        return {
          user: user as Address,
          storageLimit: BigInt(storageLimit),
          bandwidthLimit: BigInt(bandwidthLimit),
          expiryDate: BigInt(expiryDate),
          tier: Number(tier),
          isActive: Boolean(isActive),
        };
      } else {
        // Handle object format
        const obj = data as any;
        return {
          user: obj.user as Address,
          storageLimit: BigInt(obj.storageLimit || 0),
          bandwidthLimit: BigInt(obj.bandwidthLimit || 0),
          expiryDate: BigInt(obj.expiryDate || 0),
          tier: Number(obj.tier || 0),
          isActive: Boolean(obj.isActive),
        };
      }
    } catch (error) {
      console.error("Error parsing subscription data:", error);
      return null;
    }
  };

  // Parse subscription data safely
  const currentSubscription = parseSubscriptionData(userSubscription);

  // Determine if user has an active subscription
  const hasActiveSubscription =
    currentSubscription &&
    currentSubscription.isActive &&
    currentSubscription.expiryDate > BigInt(Math.floor(Date.now() / 1000));

  // Helper function to format bytes to GB
  const formatBytesToGB = (bytes: bigint): string => {
    return (Number(bytes) / (1024 * 1024 * 1024)).toFixed(2);
  };

  // Helper function to format Wei to ETH
  const formatWeiToETH = (wei: bigint): string => {
    return (Number(wei) / 1e18).toFixed(4);
  };

  return (
    <div className="flex flex-col gap-6 p-6 bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-700/50 text-gray-100">
      <h2 className="text-2xl font-bold text-white">Subscription Plans</h2>

      {/* Display User's Current Subscription */}
      {!connectedAddress ? (
        <div className="alert alert-info bg-blue-600/20 border-blue-500/30 text-blue-300">
          Connect your wallet to see your subscription status.
        </div>
      ) : isLoadingSubscription ? (
        <div className="text-center text-gray-400">Loading subscription status...</div>
      ) : hasActiveSubscription && currentSubscription ? (
        <div className="alert alert-success bg-green-600/20 border-green-500/30 text-green-300">
          <div>
            <p>
              You have an active Tier {currentSubscription.tier} subscription expiring on{" "}
              {new Date(Number(currentSubscription.expiryDate) * 1000).toLocaleDateString()}.
            </p>
            <p>
              Storage Limit: {formatBytesToGB(currentSubscription.storageLimit)} GB, Bandwidth Limit:{" "}
              {formatBytesToGB(currentSubscription.bandwidthLimit)} GB
            </p>
          </div>
        </div>
      ) : (
        <div className="alert alert-warning bg-yellow-600/20 border-yellow-500/30 text-yellow-300">
          You do not have an active subscription. Please purchase one to upload files.
        </div>
      )}

      {/* Display Subscription Tiers */}
      {allTiers.length === 0 ? (
        // Loading placeholder for tiers
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-slate-800/50 h-40 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {allTiers.map((tier, index) => (
            <div
              key={index}
              className={`card bg-slate-800/50 shadow-xl cursor-pointer transition-all duration-300 transform hover:scale-105 border border-slate-700/50 ${
                selectedTier === index ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-900" : ""
              }`}
              onClick={() => setSelectedTier(index)}
            >
              <div className="card-body p-6 space-y-4">
                <h3 className="card-title text-xl font-semibold text-white">Tier {index}</h3>
                <div className="space-y-2 text-gray-300">
                  <p>Storage: {formatBytesToGB(tier.storageLimit)} GB</p>
                  <p>Bandwidth: {formatBytesToGB(tier.bandwidthLimit)} GB</p>
                  <p>Price: {formatWeiToETH(tier.price)} ETH/month</p>
                </div>
                <div className="card-actions justify-end mt-4">
                  <button
                    className="btn w-full bg-blue-600 text-white border-none hover:bg-blue-700 transition-all duration-300"
                    onClick={() => setSelectedTier(index)}
                    disabled={selectedTier === index}
                    aria-label={`Select Tier ${index}`}
                  >
                    {selectedTier === index ? "Selected" : "Select"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Duration Input and Purchase Button */}
      {allTiers.length > 0 && connectedAddress && (
        <div className="flex flex-col gap-4 mt-6 p-6 bg-slate-800/50 rounded-2xl border border-slate-700/50">
          <h3 className="text-xl font-semibold text-white">Select Duration and Purchase</h3>
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text text-gray-300">Duration (days)</span>
            </label>
            <input
              type="number"
              className="input input-bordered w-full bg-slate-700/50 border-slate-600/50 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-all duration-300"
              value={duration}
              onChange={e => setDuration(Math.max(30, Number(e.target.value)))}
              min="30"
              step="30"
              placeholder="Minimum 30 days"
            />
          </div>

          {allTiers[selectedTier] && (
            <div className="text-gray-300 space-y-1">
              <p>
                Total Cost:{" "}
                <span className="font-semibold text-white">
                  {formatWeiToETH(allTiers[selectedTier].price * BigInt(Math.ceil(duration / 30)))} ETH
                </span>
              </p>
              <p>
                Monthly Rate:{" "}
                <span className="font-semibold text-white">{formatWeiToETH(allTiers[selectedTier].price)} ETH</span>
              </p>
            </div>
          )}

          <button
            className="btn btn-primary w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-none transition-all duration-300 transform hover:scale-105"
            onClick={handlePurchase}
            disabled={isPurchasing || !connectedAddress}
          >
            {isPurchasing ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              `Purchase Tier ${selectedTier} for ${duration} days`
            )}
          </button>
        </div>
      )}
    </div>
  );
};
