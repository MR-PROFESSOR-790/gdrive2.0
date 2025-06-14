import React, { useState } from "react";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

interface AccessShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccess: () => void;
}

const AccessShareLinkModal: React.FC<AccessShareLinkModalProps> = ({ isOpen, onClose, onAccess }) => {
  const [accessShareLinkId, setAccessShareLinkId] = useState("");
  const [accessSharePassword, setAccessSharePassword] = useState("");

  const { writeContractAsync: writeGDrive } = useScaffoldWriteContract({
    contractName: "GDrive",
  });

  const handleAccessShareLink = async () => {
    try {
      const cid = await writeGDrive({
        functionName: "accessFileViaLink",
        args: [accessShareLinkId as `0x${string}`, accessSharePassword],
      });

      notification.success(`File accessed! CID: ${cid}`);
      onClose();
      onAccess();
    } catch (error: any) {
      console.error("Error accessing share link:", error);
      notification.error(`Failed to access share link: ${error.message}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open animate-fade-in">
      <div className="modal-box bg-gray-800/90 border border-gray-700 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-200">Access Share Link</h3>
          <button className="btn btn-sm btn-circle bg-gray-700 text-gray-200" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-gray-400 mb-2">Share Link ID</label>
            <input
              type="text"
              value={accessShareLinkId}
              onChange={(e) => setAccessShareLinkId(e.target.value)}
              className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-200"
              placeholder="Enter share link ID"
            />
          </div>
          <div>
            <label className="block text-gray-400 mb-2">Password</label>
            <input
              type="text"
              value={accessSharePassword}
              onChange={(e) => setAccessSharePassword(e.target.value)}
              className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-200"
              placeholder="Enter password"
            />
          </div>
          <button
            className="btn w-full bg-gradient-to-r from-green-600 to-green-800 text-white border-none hover:from-green-700 hover:to-green-900"
            onClick={handleAccessShareLink}
          >
            Access File
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccessShareLinkModal;