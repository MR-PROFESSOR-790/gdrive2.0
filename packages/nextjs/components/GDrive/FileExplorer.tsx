import React, { useState } from "react";
import FileItem from "./FileItem";
import { FileUpload } from "./FileUpload";
import FolderCreationModal from "./FolderCreationModal";
import { Address } from "viem";
import { useAccount } from "wagmi";
import useUserFiles from "~~/hooks/scaffold-eth/useUserFiles";

const FileExplorer = () => {
  const { address: connectedAddress } = useAccount();
  const { fileIds, isLoading, error } = useUserFiles(connectedAddress);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [showAddOptions, setShowAddOptions] = useState(false);

  const handleOpenUploadModal = () => {
    setIsUploadModalOpen(true);
    setShowAddOptions(false);
  };

  const handleCloseUploadModal = () => {
    setIsUploadModalOpen(false);
  };

  const handleOpenFolderModal = () => {
    setIsFolderModalOpen(true);
    setShowAddOptions(false);
  };

  const handleCloseFolderModal = () => {
    setIsFolderModalOpen(false);
  };

  const handleAddClick = () => {
    setShowAddOptions(!showAddOptions);
  };

  // Helper function to safely get error message
  const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === "string") {
      return error;
    }
    if (error && typeof error === "object" && "message" in error) {
      return String(error.message);
    }
    return "An unknown error occurred";
  };

  if (!connectedAddress) {
    return <div className="text-center">Please connect your wallet to view files.</div>;
  }

  if (isLoading) {
    return <div className="text-center">Loading files...</div>;
  }

  if (error) {
    return <div className="text-center text-error">Error loading files: {getErrorMessage(error)}</div>;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">My Files</h2>
        <div className="flex items-center space-x-4">
          {/* Search input */}
          <input type="text" placeholder="Search" className="input input-bordered input-sm" />
          {/* Add folder/file button */}
          <div className="relative">
            <button className="btn btn-sm btn-primary" onClick={handleAddClick}>
              + Add New
            </button>
            {showAddOptions && (
              <ul className="absolute right-0 mt-2 w-40 bg-base-100 rounded-md shadow-lg z-10">
                <li>
                  <button
                    className="block w-full text-left px-4 py-2 hover:bg-base-200"
                    onClick={handleOpenUploadModal}
                  >
                    Upload File
                  </button>
                </li>
                <li>
                  <button
                    className="block w-full text-left px-4 py-2 hover:bg-base-200"
                    onClick={handleOpenFolderModal}
                  >
                    Create Folder
                  </button>
                </li>
              </ul>
            )}
          </div>
          {/* View toggle (grid/list) */}
          {/* Add icon buttons for grid/list view */}
        </div>
      </div>

      {/* File/Folder Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {fileIds.length === 0 ? (
          <div className="col-span-full text-center">No files found.</div>
        ) : (
          fileIds.map(fileId => <FileItem key={fileId} fileId={fileId} userAddress={connectedAddress as Address} />)
        )}
      </div>

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-base-100 p-8 rounded-lg shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold">Upload File</h3>
              <button className="btn btn-sm btn-circle" onClick={handleCloseUploadModal}>
                ✕
              </button>
            </div>
            <FileUpload onUploadSuccess={handleCloseUploadModal} />
          </div>
        </div>
      )}

      {/* Folder Creation Modal */}
      {isFolderModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-base-100 p-8 rounded-lg shadow-xl max-w-md w-full">
            <FolderCreationModal onClose={handleCloseFolderModal} />
          </div>
        </div>
      )}
    </div>
  );
};

export default FileExplorer;
