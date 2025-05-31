import { useState } from "react";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth/useScaffoldWriteContract";
import { notification } from "~~/utils/scaffold-eth";

const FolderCreationModal = ({ onClose }: { onClose: () => void }) => {
  const [folderName, setFolderName] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const { writeContractAsync } = useScaffoldWriteContract({ contractName: "GDrive" });

  const handleCreate = async () => {
    try {
      await writeContractAsync({
        functionName: "createFolder",
        args: [folderName, "0x0000000000000000000000000000000000000000000000000000000000000000", isPublic],
      });
      notification.success("Folder created!");
      onClose();
    } catch (error) {
      notification.error("Failed to create folder");
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="text-lg font-bold">Create Folder</h3>
        <input
          type="text"
          placeholder="Folder Name"
          className="input input-bordered w-full mt-4"
          value={folderName}
          onChange={e => setFolderName(e.target.value)}
        />
        <label className="label">
          <span className="label-text">Public?</span>
          <input
            type="checkbox"
            className="checkbox"
            checked={isPublic}
            onChange={e => setIsPublic(e.target.checked)}
          />
        </label>
        <div className="modal-action">
          <button className="btn btn-primary" onClick={handleCreate}>
            Create
          </button>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default FolderCreationModal;
