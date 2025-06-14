import React, { useState } from "react";
import { parseEther } from "viem";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchase: () => void;
}

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose, onPurchase }) => {
  const [subscriptionTier, setSubscriptionTier] = useState("1");
  const [subscriptionDurationDays, setSubscriptionDurationDays] = useState("30");
  const [referrerAddress, setReferrerAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"ETH" | "Token" | "GDV">("ETH");
  const [tokenAddress, setTokenAddress] = useState("");

  const { writeContractAsync: writeGDrive } = useScaffoldWriteContract({
    contractName: "GDrive",
  });

  const handlePurchaseSubscription = async () => {
    try {
      const duration = BigInt(Number(subscriptionDurationDays) * 24 * 60 * 60);
      if (paymentMethod === "ETH") {
        await writeGDrive({
          functionName: "purchaseSubscription",
          args: [Number(subscriptionTier), duration, referrerAddress || "0x0000000000000000000000000000000000000000"],
          value: parseEther("0.01"),
        });
      } else if (paymentMethod === "Token") {
        if (!tokenAddress) throw new Error("Token address required");
        await writeGDrive({
          functionName: "purchaseSubscriptionWithToken",
          args: [
            Number(subscriptionTier),
            duration,
            referrerAddress || "0x0000000000000000000000000000000000000000",
            tokenAddress,
          ],
        });
      } else if (paymentMethod === "GDV") {
        await writeGDrive({
          functionName: "purchaseSubscriptionWithGDV",
          args: [Number(subscriptionTier), duration, referrerAddress || "0x0000000000000000000000000000000000000000"],
        });
      }

      notification.success("Subscription purchased successfully!");
      onClose();
      onPurchase();
    } catch (error: any) {
      console.error("Error purchasing subscription:", error);
      notification.error(`Failed to purchase subscription: ${error.message}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open animate-fade-in">
      <div className="modal-box bg-gray-800/90 border border-gray-700 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-200">Purchase Subscription</h3>
          <button className="btn btn-sm btn-circle bg-gray-700 text-gray-200" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-gray-400 mb-2">Tier (0-3)</label>
            <input
              type="number"
              value={subscriptionTier}
              onChange={(e) => setSubscriptionTier(e.target.value)}
              className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-200"
              placeholder="Enter tier (0-3)"
              min="0"
              max="3"
            />
          </div>
          <div>
            <label className="block text-gray-400 mb-2">Duration (Days)</label>
            <input
              type="number"
              value={subscriptionDurationDays}
              onChange={(e) => setSubscriptionDurationDays(e.target.value)}
              className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-200"
              placeholder="Enter duration in days"
              min="30"
            />
          </div>
          <div>
            <label className="block text-gray-400 mb-2">Referrer Address (Optional)</label>
            <input
              type="text"
              value={referrerAddress}
              onChange={(e) => setReferrerAddress(e.target.value)}
              className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-200"
              placeholder="Enter referrer address"
            />
          </div>
          <div>
            <label className="block text-gray-400 mb-2">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as "ETH" | "Token" | "GDV")}
              className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-200"
            >
              <option value="ETH">ETH</option>
              <option value="Token">Token</option>
              <option value="GDV">GDV</option>
            </select>
          </div>
          {paymentMethod === "Token" && (
            <div>
              <label className="block text-gray-400 mb-2">Token Address</label>
              <input
                type="text"
                value={tokenAddress}
                onChange={(e) => setTokenAddress(e.target.value)}
                className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-200"
                placeholder="Enter token address"
              />
            </div>
          )}
          <button
            className="btn w-full bg-gradient-to-r from-teal-600 to-teal-800 text-white border-none hover:from-teal-700 hover:to-teal-900"
            onClick={handlePurchaseSubscription}
          >
            Purchase Subscription
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionModal;