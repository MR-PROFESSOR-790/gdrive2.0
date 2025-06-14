import React from "react";
import { FaEye, FaDownload, FaShareAlt, FaDollarSign, FaLink, FaTrash } from "react-icons/fa";
import { PinataFile } from "./types";

interface FileCardProps {
  file: PinataFile;
  onCopy: (text: string, cid: string) => Promise<void>;
  onDelete: (cid: string) => Promise<void>;
  onShare: (file: PinataFile) => void;
  onPaidShare: (file: PinataFile) => void;
  copiedCid: string | null;
  viewMode: "grid" | "list";
}

// Helper to get appropriate icon based on file type
const getFileIcon = (fileType: string) => {
  if (!fileType) return <FaDownload className="text-gray-400" />;
  if (fileType.startsWith("image/")) return <FaEye className="text-blue-400" />;
  if (fileType.startsWith("video/")) return <FaEye className="text-red-400" />;
  if (fileType.startsWith("audio/")) return <FaEye className="text-green-400" />;
  if (fileType.startsWith("application/")) return <FaDownload className="text-purple-400" />;
  if (fileType.startsWith("text/")) return <FaEye className="text-yellow-400" />;
  return <FaDownload className="text-gray-400" />;
};

const FileCard: React.FC<FileCardProps> = ({
  file,
  onCopy,
  onDelete,
  onShare,
  onPaidShare,
  copiedCid,
  viewMode,
}) => {
  const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${file.ipfs_pin_hash}`; 
  const fileSizeMB = Number(file.size) / (1024 * 1024);
  const fileType = file.metadata?.keyvalues?.fileType || "unknown";
  const fileName = file.metadata?.name || "Unnamed File";

  const handleView = () => {
    window.open(ipfsUrl, "_blank");
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = ipfsUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className={`bg-gray-800/40 backdrop-blur-xl border border-gray-700/30 rounded-xl p-4 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20 ${
        viewMode === "grid" ? "w-full" : "flex items-center justify-between"
      }`}
      aria-label={`File: ${fileName}`}
    >
      <div className={viewMode === "grid" ? "flex flex-col items-center text-center" : "flex items-center gap-4 flex-1"}>
        <div className="text-3xl mb-2">{getFileIcon(fileType)}</div>
        <div>
          <h4 className="text-white font-semibold truncate max-w-xs" title={fileName}>
            {fileName}
          </h4>
          <p className="text-gray-400 text-sm">
            {fileType} | {fileSizeMB.toFixed(2)} MB | {new Date(file.date_pinned).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className={viewMode === "grid" ? "mt-4 flex justify-center gap-2" : "flex items-center gap-2"}>
        <button
          onClick={handleView}
          className="p-2 text-gray-400 hover:text-blue-400 transition-colors rounded-full"
          aria-label="Preview file"
        >
          <FaEye />
        </button>

        <button
          onClick={handleDownload}
          className="p-2 text-gray-400 hover:text-green-400 transition-colors rounded-full"
          aria-label="Download file"
        >
          <FaDownload />
        </button>

        <button
          onClick={() => onShare(file)}
          className="p-2 text-gray-400 hover:text-purple-400 transition-colors rounded-full"
          aria-label="Share file"
        >
          <FaShareAlt />
        </button>

        <button
          onClick={() => onPaidShare(file)}
          className="p-2 text-gray-400 hover:text-yellow-400 transition-colors rounded-full"
          aria-label="Share as paid"
        >
          <FaDollarSign />
        </button>

        <button
          onClick={() => onCopy(ipfsUrl, file.ipfs_pin_hash)}
          className="p-2 text-gray-400 hover:text-teal-400 transition-colors rounded-full relative group"
          aria-label="Copy IPFS link"
        >
          <FaLink />
          {copiedCid === file.ipfs_pin_hash && (
            <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-teal-400 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
              Copied!
            </span>
          )}
        </button>

        <button
          onClick={() => onDelete(file.ipfs_pin_hash)}
          className="p-2 text-gray-400 hover:text-red-400 transition-colors rounded-full"
          aria-label="Delete file"
        >
          <FaTrash />
        </button>
      </div>
    </div>
  );
};

export default FileCard;