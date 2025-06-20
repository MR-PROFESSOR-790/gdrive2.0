import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FaSearch, FaPlus, FaRegFolderOpen } from "react-icons/fa";
import { useAccount } from "wagmi";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import FileCard from "./FileCard";
import UploadFileModal from "./UploadFileModal";
import UploadZone from "./UploadZone";
import { PinataFile } from "./types";
import { notification } from "~~/utils/scaffold-eth";

// Modal components
import ShareLinkModal from "./ShareLinkModal";
import PaidShareLinkModal from "./PaidShareLinkModal";
import AccessShareLinkModal from "./AccessShareLinkModal";
import AccessPaidShareLinkModal from "./AccessPaidShareLinkModal";
import SubscriptionModal from "./SubscriptionModal";
import CreateFolderModal from "./CreateFolderModal";

interface GDriveManagerProps {
  refreshTrigger: number;
}

const GDriveManager: React.FC<GDriveManagerProps> = ({ refreshTrigger }) => {
  const [files, setFiles] = useState<PinataFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedCid, setCopiedCid] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFileType, setSelectedFileType] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "date" | "size">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [cidToDelete, setCidToDelete] = useState<string | null>(null);  // Modal states
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isPaidShareModalOpen, setIsPaidShareModalOpen] = useState(false);
  const [isAccessShareModalOpen, setIsAccessShareModalOpen] = useState(false);
  const [isAccessPaidShareModalOpen, setIsAccessPaidShareModalOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<PinataFile | null>(null);

  const { address } = useAccount();
  
  const { data: fileData, isLoading: isFetching, refetch } = useScaffoldReadContract({
    contractName: "GDrive",
    functionName: "getUserFiles",
    args: [address],
  });
  
  const { 
    data: fileId, 
    isLoading: isFileIdLoading, 
    error: fileIdError 
  } = useScaffoldReadContract({
    contractName: "GDrive",
    functionName: "getFileIdByCid",
    args: [cidToDelete],
    enabled: !!cidToDelete,
  });

  const { writeContractAsync: writeGDrive } = useScaffoldWriteContract({ 
    contractName: "GDrive", 
  });

  // Fetch files when address or refreshTrigger changes
  const fetchFiles = useCallback(async () => {
    if (!address) {
      setFiles([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Check if fileData has valid structure
      if (fileData && Array.isArray(fileData) && fileData.length > 0) {
        // The contract returns arrays in this order:
        // [fileIds, names, cids, sizes, uploadDates, isPublics, fileTypes]
        const [fileIds, names, cids, sizes, uploadDates, isPublics, fileTypes] = fileData;
        
        // Only proceed if we have valid arrays
        if (Array.isArray(cids) && cids.length > 0) {
          const parsedFiles = cids.map((cid: string, index: number) => ({
            ipfs_pin_hash: cid,
            size: Number(sizes[index]) || 0,
            date_pinned: new Date(Number(uploadDates[index]) * 1000).toISOString(),
            metadata: {
              name: names[index] || "",
              keyvalues: {
                isPublic: isPublics[index]?.toString() || "false",
                fileType: fileTypes[index] || "unknown",
                uploadedBy: address,
                originalSize: sizes[index]?.toString() || "0",
              },
            },
          }));
          
          console.log(`Fetched ${parsedFiles.length} files for address: ${address}`);
          setFiles(parsedFiles);
        } else {
          console.warn("Invalid or empty cids array received");
          setFiles([]);
        }
      } else {
        console.warn("No file data available for address:", address);
        setFiles([]);
      }
    } catch (err: any) {
      console.error("Fetch error:", err);
      setError(`Failed to load files: ${err.message}`);
      notification.error(`Failed to load files: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [address, fileData]);
  
  // Load files when component mounts or refreshes
  useEffect(() => {
    fetchFiles();
  }, [fetchFiles, refreshTrigger, address]);
  
  // Effect for handling file deletion
  useEffect(() => {
    if (cidToDelete && fileId && !isFileIdLoading && !fileIdError) {
      if (fileId === "0x0000000000000000000000000000000000000000000000000000000000000000") {
        notification.error(`File ID not found for CID: ${cidToDelete}. Ensure it was uploaded by ${address}.`);
        console.error(`Zero fileId for CID: ${cidToDelete}, address: ${address}`);
        setCidToDelete(null);
        return;
      }
      
      const deleteFile = async () => {
        try {
          console.log(`Deleting file with CID: ${cidToDelete}, File ID: ${fileId}, Address: ${address}`);
          await writeGDrive({
            functionName: "deleteFile",
            args: [fileId as `0x${string}`],
          });
          setFiles(prev => prev.filter(file => file.ipfs_pin_hash !== cidToDelete));
          notification.success("File deleted successfully");
          refetch();
        } catch (err: any) {
          console.error("Delete error:", err, { cid: cidToDelete, fileId, address });
          let errorMessage = err.message || "Unknown error";
          if (err.reason) {
            errorMessage = err.reason;
          } else if (err.data?.message) {
            errorMessage = err.data.message;
          }
          notification.error(`Failed to delete file: ${errorMessage}`);
        } finally {
          setCidToDelete(null);
        }
      };
      
      deleteFile();
    } else if (cidToDelete && fileIdError) {
      console.error("File ID fetch error:", fileIdError, { cid: cidToDelete, address });
      let errorMessage = fileIdError.message || "Unknown error";
      
      if (fileIdError.message.includes("FileNotFound")) {
        errorMessage = `File not found for CID: ${cidToDelete}. Ensure it was uploaded by ${address}.`;
      }
      
      notification.error(`Failed to fetch file ID: ${errorMessage}`);
      setCidToDelete(null);
    }
  }, [cidToDelete, fileId, isFileIdLoading, fileIdError, writeGDrive, refetch, address]);

  // Handle copy link functionality
  const handleCopyLink = useCallback(async (text: string, cid: string) => {
    if (!text) {
      console.error("Empty text provided for copying", { cid });
      notification.error("No link available to copy");
      return;
    }
    
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        setCopiedCid(cid);
        notification.success("Link copied to clipboard!");
        setTimeout(() => setCopiedCid(null), 2000);
      } else {
        console.warn("Clipboard API not available, using textbox fallback", { cid });
        notification.info("Please copy the link from the textbox");
        setCopiedCid(cid);
        setTimeout(() => setCopiedCid(null), 5000);
      }
    } catch (err: any) {
      console.error("Failed to copy link:", err, { text, cid });
      notification.error(`Failed to copy link: ${err.message || "Clipboard not supported"}`);
      setCopiedCid(cid);
      setTimeout(() => setCopiedCid(null), 5000);
    }
  }, []);
  
  // Handle file deletion
  const handleDelete = useCallback(
    (cid: string) => {
      console.log(`Initiating deletion for CID: ${cid}, Address: ${address}`);
      setCidToDelete(cid);
    },
    [address]
  );
  
  // Handle file sharing
  const handleShare = useCallback((file: PinataFile) => {
    console.log("Opening share modal for file:", file.ipfs_pin_hash);
    setSelectedFile(file);
    setIsShareModalOpen(true);
  }, []);
  
  // Handle paid file sharing
  const handlePaidShare = useCallback((file: PinataFile) => {
    console.log("Opening paid share modal for file:", file.ipfs_pin_hash);
    setSelectedFile(file);
    setIsPaidShareModalOpen(true);
  }, []);
  
  // Handle successful uploads
  const handleUploadSuccess = useCallback(
    (uploadedFile: PinataFile) => {
      setFiles(prev => {
        const existing = prev.find(f => f.ipfs_pin_hash === uploadedFile.ipfs_pin_hash);
        if (existing) {
          console.warn(`Duplicate file upload detected: ${uploadedFile.ipfs_pin_hash}`);
          return prev;
        }
        return [uploadedFile, ...prev];
      });
      
      console.log(`File uploaded successfully: ${uploadedFile.ipfs_pin_hash}, Name: ${uploadedFile.metadata.name}, Address: ${address}`);
      notification.success("File uploaded successfully!");
      refetch();
    },
    [refetch, address]
  );

  // Filter and sort files based on UI settings
  const filteredAndSortedFiles = useMemo(() => {
    return files
      .filter(file => {
        const matchesSearch =
          file.metadata?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          file.ipfs_pin_hash.toLowerCase().includes(searchTerm.toLowerCase());
          
        const matchesFileType = selectedFileType === "all" || 
          file.metadata?.keyvalues?.fileType?.startsWith(selectedFileType);
          
        return matchesSearch && matchesFileType;
      })
      .sort((a, b) => {
        let aValue: any, bValue: any;
        
        switch (sortBy) {
          case "name":
            aValue = a.metadata?.name || "";
            bValue = b.metadata?.name || "";
            break;
          case "date":
            aValue = new Date(a.date_pinned);
            bValue = new Date(b.date_pinned);
            break;
          case "size":
            aValue = a.size;
            bValue = b.size;
            break;
          default:
            return 0;
        }
        
        return sortOrder === "asc" ? (aValue > bValue ? 1 : -1) : aValue < bValue ? 1 : -1;
      });
  }, [files, searchTerm, selectedFileType, sortBy, sortOrder]);

  // Main render
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-6">My GDrive</h1>
      
      {/* Upload Section */}
      <div className="mb-8">
        <UploadZone 
          onUpload={() => setIsUploadModalOpen(true)} 
          isUploading={isUploading} 
        />
      </div>
      
      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-300"
          />
        </div>
        <select
          value={selectedFileType}
          onChange={(e) => setSelectedFileType(e.target.value)}
          className="px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-300"
        >
          <option value="all">All Types</option>
          <option value="image/">Images</option>
          <option value="video/">Videos</option>
          <option value="audio/">Audio</option>
          <option value="application/pdf">PDFs</option>
          <option value="text/">Documents</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "name" | "date" | "size")}
          className="px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-300"
        >
          <option value="name">Name</option>
          <option value="date">Date</option>
          <option value="size">Size</option>
        </select>
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
          className="px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-300"
        >
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>
      </div>
      
      {/* File List */}
      {loading || isFetching ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-900/30 text-red-400 p-4 rounded-lg text-center">{error}</div>
      ) : filteredAndSortedFiles.length === 0 ? (
        <div className="bg-gray-800/50 backdrop-blur-md p-8 rounded-xl text-center">
          <FaRegFolderOpen className="mx-auto text-gray-400 text-5xl mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Files Found</h3>
          <p className="text-gray-400 mb-4">Get started by uploading a file</p>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="btn bg-gradient-to-r from-blue-600 to-purple-600 text-white border-none hover:from-blue-700 hover:to-purple-700"
          >
            <FaPlus className="mr-2" /> Upload File
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAndSortedFiles.map((file, index) => (
            <FileCard
              key={`${file.ipfs_pin_hash}-${index}`}
              file={file}
              onCopy={handleCopyLink}
              onDelete={() => handleDelete(file.ipfs_pin_hash)}
              onShare={() => handleShare(file)}
              onPaidShare={() => handlePaidShare(file)}
              copiedCid={copiedCid}
              viewMode={viewMode}
            />
          ))}
        </div>
      )}
      
      {/* Modals */}
      <UploadFileModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={handleUploadSuccess}
        loading={isUploading}
        setLoading={setIsUploading}
        setUploadProgress={setUploadProgress}
      />
      
      <CreateFolderModal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        onCreate={(folderName) => console.log(`Folder created: ${folderName}`)}
      />
      
      {selectedFile && (
        <>
          <ShareLinkModal
            file={selectedFile}
            isOpen={isShareModalOpen}
            onClose={() => {
              setIsShareModalOpen(false);
              setSelectedFile(null);
            }}
          />
          
          <PaidShareLinkModal
            file={selectedFile}
            isOpen={isPaidShareModalOpen}
            onClose={() => {
              setIsPaidShareModalOpen(false);
              setSelectedFile(null);
            }}
          />
        </>
      )}
      
      <AccessShareLinkModal
        isOpen={isAccessShareModalOpen}
        onClose={() => setIsAccessShareModalOpen(false)}
        onAccess={() => console.log("Access granted")}
      />
      
      <AccessPaidShareLinkModal
        isOpen={isAccessPaidShareModalOpen}
        onClose={() => setIsAccessPaidShareModalOpen(false)}
        onAccess={() => console.log("Access paid share")}
      />
      
      <SubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
        onPurchase={() => console.log("Subscription purchased")}
      />
    </div>
  );
};

export default GDriveManager;