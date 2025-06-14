import React, { useState } from "react";
import { FaCloud, FaUpload } from "react-icons/fa";

interface UploadZoneProps {
  onUpload: (file: File) => void;
  isUploading: boolean;
}

const UploadZone: React.FC<UploadZoneProps> = ({ onUpload, isUploading }) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files[0]);
    }
  };

  return (
    <div
      className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ${
        isDragOver
          ? "border-blue-400 bg-blue-500/10 scale-105"
          : "border-gray-600 hover:border-gray-500 hover:bg-gray-800/30"
      } ${isUploading ? "opacity-50 pointer-events-none" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isUploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 rounded-2xl z-10">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-white font-medium">Uploading to IPFS...</p>
          </div>
        </div>
      )}

      <div className={`transition-all duration-300 ${isDragOver ? "scale-110" : ""}`}>
        <FaCloud className="text-6xl text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Drop files here or click to upload</h3>
        <p className="text-gray-400 mb-6">Supports all file types, stored securely on IPFS</p>
        <label
          className="btn bg-gradient-to-r from-blue-600 to-purple-600 text-white border-none hover:from-blue-700 hover:to-purple-700 px-8 py-3 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 disabled:opacity-50 cursor-pointer"
        >
          <FaUpload className="mr-2" />
          Select Files
          <input
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            disabled={isUploading}
          />
        </label>
      </div>
    </div>
  );
};

export default UploadZone;