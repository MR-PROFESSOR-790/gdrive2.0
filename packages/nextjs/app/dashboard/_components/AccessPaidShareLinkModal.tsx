import React, { useState } from "react";
import { parseEther } from "viem";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

interface AccessPaidShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccess: () => void;
}

const AccessPaidShareLinkModal: React.FC<AccessPaidShareLinkModalProps> = ({ isOpen, onClose, onAccess }) => {
  const [accessPaidShareLinkId, setAccessPaidShareLinkId] = useState("");
  const [accessPaidSharePassword, setAccessPaidSharePassword] = useState("");
  const [price, setPrice] = useState("0.01"); // New state for price input

  const { writeContractAsync: writeGDrive } = useScaffoldWriteContract({
    contractName: "GDrive",
  });

  const handleAccessPaidShareLink = async () => {
    try {
      const cid = await writeGDrive({
        functionName: "accessPaidShareLink",
        args: [accessPaidShareLinkId as `0x${string}`, accessPaidSharePassword],
        value: parseEther(price), // Use user-provided price
      });

      notification.success(`Paid file accessed! CID: ${cid}`);
      onClose();
      onAccess();
    } catch (error: any) {
      console.error("Error accessing paid share link:", error);
      notification.error(`Failed to access paid share link: ${error.message}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open animate-fade-in">
      <div className="modal-box bg-gray-800/90 border border-gray-700 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-200">Access Paid Share Link</h3>
          <button className="btn btn-sm btn-circle bg-gray-700 text-gray-200" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-gray-400 mb-2">Paid Share Link ID</label>
            <input
              type="text"
              value={accessPaidShareLinkId}
              onChange={(e) => setAccessPaidShareLinkId(e.target.value)}
              className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-200"
              placeholder="Enter paid share link ID"
            />
          </div>
          <div>
            <label className="block text-gray-400 mb-2">Price (ETH)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-200"
              placeholder="Enter price in ETH"
              step="0.001"
              min="0"
            />
          </div>
          <div>
            <label className="block text-gray-400 mb-2">Password</label>
            <input
              type="text"
              value={accessPaidSharePassword}
              onChange={(e) => setAccessPaidSharePassword(e.target.value)}
              className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-200"
              placeholder="Enter password"
            />
          </div>
          <button
            className="btn w-full bg-gradient-to-r from-yellow-600 to-yellow-800 text-white border-none hover:from-yellow-700 hover:to-yellow-900"
            onClick={handleAccessPaidShareLink}
          >
            Access Paid File
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccessPaidShareLinkModal;