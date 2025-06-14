import React, { useState } from "react";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";
import { PinataFile } from "./types";

interface ShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFile: PinataFile | null;
  onCreate: () => void;
}

const ShareLinkModal: React.FC<ShareLinkModalProps> = ({ isOpen, onClose, selectedFile, onCreate }) => {
  const [sharePassword, setSharePassword] = useState("");
  const [shareExpiryDays, setShareExpiryDays] = useState("7");
  const [shareMaxAccess, setShareMaxAccess] = useState("10");

  const { writeContractAsync: writeGDrive } = useScaffoldWriteContract({
    contractName: "GDrive",
  });

  const handleCreateShareLink = async () => {
    if (!selectedFile || !shareExpiryDays || !shareMaxAccess) return;

    try {
      const fileId = cidToBytes32(selectedFile.ipfs_pin_hash);
      const expiryDate = BigInt(Math.floor(Date.now() / 1000) + Number(shareExpiryDays) * 24 * 60 * 60);
      const maxAccess = Number(shareMaxAccess);

      const linkId = await writeGDrive({
        functionName: "createShareLink",
        args: [fileId, expiryDate, maxAccess, sharePassword],
      });

      notification.success(`Share link created! Link ID: ${linkId}`);
      onClose();
      onCreate();
    } catch (error: any) {
      console.error("Error creating share link:", error);
      notification.error(`Failed to create share link: ${error.message}`);
    }
  };

  function cidToBytes32(cid: string): `0x${string}` {
    if (typeof Buffer === "undefined") {
      console.error("Buffer is not available. Cannot convert CID to bytes32.");
      return "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;
    }
    const buffer = Buffer.from(cid);
    let hex = buffer.toString("hex");
    if (hex.length > 64) {
      hex = hex.slice(0, 64);
    } else if (hex.length < 64) {
      hex = hex.padEnd(64, "0");
    }
    return `0x${hex}` as `0x${string}`;
  }

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
            <label className="block text-gray-400 mb-2">Password (Optional)</label>
            <input
              type="text"
              value={sharePassword}
              onChange={(e) => setSharePassword(e.target.value)}
              className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-200"
              placeholder="Enter password for access (optional)"
            />
          </div>
          <div>
            <label className="block text-gray-400 mb-2">Expiry (Days)</label>
            <input
              type="number"
              value={shareExpiryDays}
              onChange={(e) => setShareExpiryDays(e.target.value)}
              className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-200"
              placeholder="Enter expiry in days"
              min="1"
            />
          </div>
          <div>
            <label className="block text-gray-400 mb-2">Max Access Count</label>
            <input
              type="number"
              value={shareMaxAccess}
              onChange={(e) => setShareMaxAccess(e.target.value)}
              className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-200"
              placeholder="Enter max access count"
              min="1"
            />
          </div>
          <button
            className="btn w-full bg-gradient-to-r from-blue-600 to-blue-800 text-white border-none hover:from-blue-700 hover:to-blue-900"
            onClick={handleCreateShareLink}
          >
            Create Share Link
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareLinkModal;