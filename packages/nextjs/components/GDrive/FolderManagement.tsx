import React, { useEffect, useState } from "react";
import FolderCreationModal from "./FolderCreationModal";
import FolderItem from "./FolderItem.tsx";
import { Address, ContractFunctionExecutionError } from "viem";
import { useAccount } from "wagmi";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

type FolderId = `0x${string}`;

const FolderManagement = () => {
  const { address } = useAccount();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // State for fetching folders
  const [folderIds, setFolderIds] = useState<FolderId[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [finishedFetchingIds, setFinishedFetchingIds] = useState<boolean>(false);

  // Fetch folder IDs one by one
  const {
    data: folderId,
    isLoading: isLoadingId,
    error: errorLoadingId,
  } = useScaffoldReadContract({
    contractName: "GDrive",
    functionName: "userFolders",
    args: address && !finishedFetchingIds ? [address, BigInt(currentIndex)] : undefined,
    watch: true, // Watch for changes to trigger re-fetching
  });

  // Effect to handle fetching logic
  useEffect(() => {
    if (!address || finishedFetchingIds || isLoadingId || currentIndex < 0) return;

    if (errorLoadingId) {
      if (errorLoadingId instanceof ContractFunctionExecutionError) {
        console.log(`Contract reverted while fetching folder ID at index ${currentIndex}. Assuming end of folders.`);
        setFinishedFetchingIds(true);
        if (folderIds.length === 0) setIsLoading(false);
      } else {
        console.error("Error fetching folder IDs:", errorLoadingId);
        setError(
          typeof errorLoadingId === "string"
            ? errorLoadingId
            : (errorLoadingId as Error).message || "Unknown error fetching folder IDs",
        );
        setFinishedFetchingIds(true);
        setIsLoading(false);
      }
      return;
    }

    if (folderId !== undefined && folderId !== null) {
      const newId = folderId as FolderId;
      setFolderIds(prevIds => {
        if (prevIds.includes(newId)) return prevIds;
        return [...prevIds, newId];
      });
      setCurrentIndex(prev => prev + 1);
    } else {
      console.log(`Received null or undefined for folder ID at index ${currentIndex}. Assuming end of folders.`);
      setFinishedFetchingIds(true);
      if (folderIds.length === 0) setIsLoading(false);
    }
  }, [folderId, isLoadingId, errorLoadingId, address, finishedFetchingIds, currentIndex, folderIds.length]);

  // Update loading state based on id fetching
  useEffect(() => {
    if (finishedFetchingIds) {
      setIsLoading(false);
    }
  }, [finishedFetchingIds]);

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    // To refresh the list after creation, reset fetching state
    setFolderIds([]);
    setCurrentIndex(0);
    setFinishedFetchingIds(false);
    setIsLoading(true);
  };

  // Helper function to safely get error message (optional, can reuse from FileExplorer)
  const getErrorMessage = (err: unknown): string => {
    if (err instanceof Error) {
      return err.message;
    }
    if (typeof err === "string") {
      return err;
    }
    if (err && typeof err === "object" && "message" in err) {
      return String(err.message);
    }
    return "An unknown error occurred";
  };

  if (!address) {
    return <div className="text-center">Please connect your wallet to view folders.</div>;
  }

  if (isLoading) {
    return <div className="text-center">Loading folders...</div>;
  }

  if (error) {
    return <div className="text-center text-error">Error loading folders: {getErrorMessage(error)}</div>;
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-2xl font-bold">Folders</h2>
      <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
        Create Folder
      </button>
      <div className="grid grid-cols-4 gap-4">
        {folderIds.length === 0 ? (
          <div className="col-span-full text-center">No folders found.</div>
        ) : (
          folderIds.map(folderId => <FolderItem key={folderId} folderId={folderId} />)
        )}
      </div>

      {/* Folder Creation Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-base-100 p-8 rounded-lg shadow-xl max-w-md w-full">
            <FolderCreationModal onClose={handleCloseCreateModal} />
          </div>
        </div>
      )}
    </div>
  );
};

export default FolderManagement;
