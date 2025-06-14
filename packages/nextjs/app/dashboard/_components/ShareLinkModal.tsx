import React, { useState } from "react";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { PinataFile } from "./types";
import { notification } from "~~/utils/scaffold-eth";

interface ShareLinkModalProps {
  file: PinataFile;
  isOpen: boolean;
  onClose: () => void;
}

const ShareLinkModal: React.FC<ShareLinkModalProps> = ({ file, isOpen, onClose }) => {
  const [expiryDays, setExpiryDays] = useState("7");
  const [maxAccess, setMaxAccess] = useState("10");
  const [password, setPassword] = useState("");

  const { writeContractAsync: writeGDrive } = useScaffoldWriteContract({ contractName: "GDrive" });
  const { data: fileId } = useScaffoldReadContract({
    contractName: "GDrive",
    functionName: "getFileIdByCid",
    args: [file.ipfs_pin_hash],
  });

  const handleCreateShareLink = async () => {
    if (!fileId) {
      notification.error("File ID not found. Please try again.");
      return;
    }

    try {
      const expiryDate = Math.floor(Date.now() / 1000) + parseInt(expiryDays) * 24 * 60 * 60;
      const txHash = await writeGDrive({
        functionName: "createShareLink",
        args: [
          fileId as `0x${string}`,
          BigInt(expiryDate),
          parseInt(maxAccess),
          password,
        ],
      });

      notification.success("Share link created successfully!");
      onClose();
    } catch (error: any) {
      console.error("Error creating share link:", error);
      notification.error(`Failed to create share link: ${error.message}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open animate-fade-in">
      <div className="modal-box bg-gray-800/90 border border-gray-700 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-200">Create Share Link</h3>
          <button className="btn btn-sm btn-circle bg-gray-700 text-gray-200" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-gray-400 mb-2">Expiry Days</label>
            <input
              type="number"
              value={expiryDays}
              onChange={(e) => setExpiryDays(e.target.value)}
              className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-200"
              placeholder="Enter expiry days"
              min="1"
            />
          </div>
          <div>
            <label className="block text-gray-400 mb-2">Max Access Count</label>
            <input
              type="number"
              value={maxAccess}
              onChange={(e) => setMaxAccess(e.target.value)}
              className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-200"
              placeholder="Enter max access count"
              min="1"
            />
          </div>
          <div>
            <label className="block text-gray-400 mb-2">Password (Optional)</label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-200"
              placeholder="Enter password"
            />
          </div>
          <button
            className="btn w-full bg-gradient-to-r from-green-600 to-green-800 text-white border-none hover:from-green-700 hover:to-green-900"
            onClick={handleCreateShareLink}
            disabled={!fileId}
          >
            Create Share Link
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareLinkModal;