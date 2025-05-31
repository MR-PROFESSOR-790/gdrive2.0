import React from "react";
import type { Address } from "viem";
import { useAccount } from "wagmi";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

// Define a type for the file details we expect from getFileDetails
interface FileDetails {
  name: string;
  fileType: string;
  cid: string;
  size: bigint;
  uploadDate: bigint;
  isEncrypted: boolean;
  owner: Address;
  description: string;
  expiryDate: bigint;
  downloadCount: number;
  version: number;
}

interface FileItemProps {
  fileId: `0x${string}`;
  userAddress?: Address;
}

const FileItem = ({ fileId, userAddress }: FileItemProps) => {
  const {
    data: fileDetails,
    isLoading,
    error,
  } = useScaffoldReadContract({
    contractName: "GDrive",
    functionName: "getFileDetails",
    args: [fileId] as const,
  });

  const { writeContractAsync } = useScaffoldWriteContract({ contractName: "GDrive" });

  const handleDelete = async () => {
    try {
      await writeContractAsync({ functionName: "deleteFile", args: [fileId] });
      notification.success("File deleted!");
    } catch (error) {
      notification.error("Failed to delete file");
    }
  };

  if (isLoading) {
    return <div>Loading file...</div>;
  }

  if (error) {
    console.error("Error fetching file details for ID", fileId, ":", error);
    return <div className="text-error">Error loading file.</div>;
  }

  if (!fileDetails) {
    return <div>File details not found.</div>;
  }

  // Convert the tuple to FileDetails object
  const [name, fileType, cid, size, uploadDate, isEncrypted, owner, description, expiryDate, downloadCount, version] =
    fileDetails as [string, string, string, bigint, bigint, boolean, Address, string, bigint, number, number];

  const file: FileDetails = {
    name,
    fileType,
    cid,
    size,
    uploadDate,
    isEncrypted,
    owner,
    description,
    expiryDate,
    downloadCount,
    version,
  };

  return (
    <div key={fileId} className="flex flex-col items-center p-4 bg-base-200 rounded-lg">
      {/* File icon - replace with appropriate icon based on file type if possible */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-12 w-12 text-gray-500"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M4 4a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
          clipRule="evenodd"
        />
      </svg>
      <span className="mt-2 text-sm text-center break-words w-full">{file.name}</span>
      {/* Optionally display file size, upload time, etc. */}
      {/* <span className="text-xs text-base-content/70">{(Number(file.size) / 1024).toFixed(2)} KB</span> */}
      <button className="btn btn-sm btn-error mt-2" onClick={handleDelete}>
        Delete
      </button>
    </div>
  );
};

export default FileItem;
