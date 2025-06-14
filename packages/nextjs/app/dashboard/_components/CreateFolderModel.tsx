import React, { useState } from "react";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: () => void;
}

const CreateFolderModal: React.FC<CreateFolderModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [folderName, setFolderName] = useState("");
  const [parentFolderId, setParentFolderId] = useState("");
  const [folderIsPublic, setFolderIsPublic] = useState(true);

  const { writeContractAsync: writeGDrive } = useScaffoldWriteContract({
    contractName: "GDrive",
  });

  const handleCreateFolder = async () => {
    try {
      await writeGDrive({
        functionName: "createFolder",
        args: [
          folderName,
          (parentFolderId || "0x0000000000000000000000000000000000000000000000000000000000000000") as `0x${string}`,
          folderIsPublic,
        ],
      });

      notification.success("Folder created!");
      onClose();
      onCreate();
    } catch (error: any) {
      console.error("Error creating folder:", error);
      notification.error("Failed to create folder");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open animate-fade-in">
      <div className="modal-box bg-gray-800/90 border border-gray-700 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-200">Create Folder</h3>
          <button className="btn btn-sm btn-circle bg-gray-700 text-gray-200" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-gray-400 mb-2">Folder Name</label>
            <input
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-200"
              placeholder="Enter folder name"
            />
          </div>
          <div>
            <label className="block text-gray-400 mb-2">Parent Folder ID (Optional)</label>
            <input
              type="text"
              value={parentFolderId}
              onChange={(e) => setParentFolderId(e.target.value)}
              className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-200"
              placeholder="Enter parent folder ID"
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={folderIsPublic}
              onChange={(e) => setFolderIsPublic(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded"
            />
            <span className="text-gray-200">Public</span>
          </label>
          <button
            className="btn w-full bg-gradient-to-r from-purple-600 to-purple-800 text-white border-none hover:from-purple-700 hover:to-purple-900"
            onClick={handleCreateFolder}
          >
            Create Folder
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateFolderModal;