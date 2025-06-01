"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FaBars, FaCube, FaFileAlt, FaFileUpload, FaFolderPlus, FaShareAlt, FaWallet } from "react-icons/fa";
import { useAccount } from "wagmi";
import FileExplorer from "~~/components/GDrive/FileExplorer";
import { FileGallery } from "~~/components/GDrive/FileGallery";
import { FileList } from "~~/components/GDrive/FileList";
import { FileUpload } from "~~/components/GDrive/FileUpload";
import SharedLinks from "~~/components/GDrive/SharedLinks";
import Sidebar from "~~/components/GDrive/Sidebar";
import { Subscription } from "~~/components/GDrive/Subscription";
import { Address } from "~~/components/scaffold-eth";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth/RainbowKitCustomConnectButton";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

// Interface for File Data (simplified for UI)
interface FileData {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadDate: number;
  isPublic: boolean;
  cid: string;
}

const Dashboard = () => {
  const { address: connectedAddress, isConnected } = useAccount();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("files");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [files, setFiles] = useState<FileData[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Fetch user stats for sidebar
  const { data: userStats } = useScaffoldReadContract({
    contractName: "GDrive",
    functionName: "getUserStats",
    args: [connectedAddress],
  });

  // Fetch user files (simplified for UI demonstration)
  useEffect(() => {
    const fetchFiles = async () => {
      if (!connectedAddress) return;
      // This is a placeholder; replace with actual contract calls as in FileExplorer.tsx
      const mockFiles: FileData[] = [
        {
          id: "1",
          name: "Capture.PNG",
          type: "image/png",
          size: 1024000,
          uploadDate: Date.now() / 1000,
          isPublic: true,
          cid: "Qm1",
        },
        {
          id: "2",
          name: "encoder.py",
          type: "text/x-python",
          size: 512000,
          uploadDate: Date.now() / 1000,
          isPublic: false,
          cid: "Qm2",
        },
        {
          id: "3",
          name: "adaptive_attack.py",
          type: "text/x-python",
          size: 768000,
          uploadDate: Date.now() / 1000,
          isPublic: true,
          cid: "Qm3",
        },
      ];
      setFiles(mockFiles);
    };
    fetchFiles();
  }, [connectedAddress]);

  const handleDownload = (cid: string) => {
    window.open(`https://ipfs.io/ipfs/${cid}`, "_blank");
  };

  const showToast = (message: string, type: "success" | "error") => {
    return (
      <div className="toast toast-top toast-end">
        <div className={`alert alert-${type}`}>
          <span>{message}</span>
        </div>
      </div>
    );
  };

  if (!isConnected) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-gray-200 flex">
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 bg-gray-900/95 border-r border-gray-700/50 transform ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:static lg:w-64 p-6 flex flex-col gap-4 transition-transform duration-300 ease-in-out z-20`}
      >
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-100">GDrive 2.0</h1>
          <button className="lg:hidden text-gray-400" onClick={() => setIsSidebarOpen(false)}>
            <FaBars className="text-xl" />
          </button>
        </div>

        {/* User Stats */}
        {userStats && (
          <div className="bg-gray-800/50 p-4 rounded-lg text-sm text-gray-400">
            <p className="flex items-center gap-2">
              <span className="font-medium text-gray-200">Storage:</span>
              {(Number(userStats[0]) / (1024 * 1024 * 1024)).toFixed(2)} GB /{" "}
              {(Number(userStats[1]) / (1024 * 1024 * 1024)).toFixed(2)} GB
            </p>
            <p className="flex items-center gap-2 mt-1">
              <span className="font-medium text-gray-200">Bandwidth:</span>
              {(Number(userStats[2]) / (1024 * 1024 * 1024)).toFixed(2)} GB /{" "}
              {(Number(userStats[3]) / (1024 * 1024 * 1024)).toFixed(2)} GB
            </p>
            <p className="flex items-center gap-2 mt-1">
              <span className="font-medium text-gray-200">Tier:</span> {userStats[6]}
            </p>
            <p className="flex items-center gap-2 mt-1">
              <span className="font-medium text-gray-200">Expires:</span>{" "}
              {new Date(Number(userStats[7]) * 1000).toLocaleDateString()}
            </p>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 space-y-2">
          <Link
            href="#files"
            onClick={() => setActiveTab("files")}
            className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ${
              activeTab === "files"
                ? "bg-gray-700 text-gray-100"
                : "text-gray-400 hover:bg-gray-800 hover:text-gray-100"
            }`}
          >
            <FaFileAlt className="text-lg" />
            My Files
          </Link>
          <Link
            href="#gallery"
            onClick={() => setActiveTab("gallery")}
            className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ${
              activeTab === "gallery"
                ? "bg-gray-700 text-gray-100"
                : "text-gray-400 hover:bg-gray-800 hover:text-gray-100"
            }`}
          >
            <FaCube className="text-lg" />
            3D Gallery
          </Link>
          <Link
            href="#subscription"
            onClick={() => setActiveTab("subscription")}
            className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ${
              activeTab === "subscription"
                ? "bg-gray-700 text-gray-100"
                : "text-gray-400 hover:bg-gray-800 hover:text-gray-100"
            }`}
          >
            <FaWallet className="text-lg" />
            Subscription
          </Link>
          <Link
            href="#shared-links"
            onClick={() => setActiveTab("shared-links")}
            className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ${
              activeTab === "shared-links"
                ? "bg-gray-700 text-gray-100"
                : "text-gray-400 hover:bg-gray-800 hover:text-gray-100"
            }`}
          >
            <FaShareAlt className="text-lg" />
            Shared Links
          </Link>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 lg:p-8">
        {/* Mobile Sidebar Toggle */}
        <button className="lg:hidden mb-4 text-gray-400" onClick={() => setIsSidebarOpen(true)}>
          <FaBars className="text-2xl" />
        </button>

        {/* Tabs */}
        <div className="flex border-b border-gray-700 mb-6">
          <button
            className={`px-4 py-2 text-sm font-medium transition-all duration-300 ${
              activeTab === "files" ? "border-b-2 border-blue-500 text-blue-400" : "text-gray-400 hover:text-gray-200"
            }`}
            onClick={() => setActiveTab("files")}
          >
            My Files
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium transition-all duration-300 ${
              activeTab === "gallery" ? "border-b-2 border-blue-500 text-blue-400" : "text-gray-400 hover:text-gray-200"
            }`}
            onClick={() => setActiveTab("gallery")}
          >
            3D Gallery
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium transition-all duration-300 ${
              activeTab === "subscription"
                ? "border-b-2 border-blue-500 text-blue-400"
                : "text-gray-400 hover:text-gray-200"
            }`}
            onClick={() => setActiveTab("subscription")}
          >
            Subscription
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium transition-all duration-300 ${
              activeTab === "shared-links"
                ? "border-b-2 border-blue-500 text-blue-400"
                : "text-gray-400 hover:text-gray-200"
            }`}
            onClick={() => setActiveTab("shared-links")}
          >
            Shared Links
          </button>
        </div>

        {/* Search Bar */}
        {activeTab === "files" && (
          <div className="flex justify-between items-center mb-6">
            <div className="relative w-1/3">
              <input
                type="text"
                placeholder="Search files..."
                className="w-full p-2 pl-10 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-blue-500 transition-all duration-300"
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <button
              className="btn bg-gradient-to-r from-blue-600 to-blue-500 text-white border-none hover:from-blue-700 hover:to-blue-600 transition-all duration-300"
              onClick={() => setIsUploadModalOpen(true)}
            >
              <FaFileUpload className="mr-2" />
              Upload File
            </button>
          </div>
        )}

        {/* Content Sections */}
        {activeTab === "files" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-fade-in">
            {files.length === 0 && !connectedAddress ? (
              <div className="col-span-full text-center text-gray-500">
                {/* Loading placeholder */}
                <div className="grid grid-cols-4 gap-6">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-gray-800/50 h-32 rounded-lg animate-pulse"></div>
                  ))}
                </div>
              </div>
            ) : files.length === 0 ? (
              <div className="col-span-full text-center text-gray-500">No files found. Start uploading!</div>
            ) : (
              files.map(file => (
                <div
                  key={file.id}
                  className="bg-gray-800/50 border border-gray-700/50 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 animate-slide-up"
                >
                  <div className="p-4 flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      {/* File Icon */}
                      {file.type.includes("image") ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-8 w-8 text-blue-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M4 16l4-4m0 0l4 4m-4-4v10m-6-6h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-8 w-8 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      )}
                      <div>
                        <h3 className="text-sm font-medium text-gray-200">{file.name}</h3>
                        <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        className="btn btn-sm bg-blue-600 text-white border-none hover:bg-blue-700 transition-all duration-300"
                        aria-label="Download file"
                        onClick={() => handleDownload(file.cid)}
                      >
                        Download
                      </button>
                      <button className="btn btn-sm bg-gray-600 text-white border-none hover:bg-gray-700 transition-all duration-300">
                        Share
                      </button>
                      <button className="btn btn-sm bg-red-600 text-white border-none hover:bg-red-700 transition-all duration-300">
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "gallery" && <FileGallery />}
        {activeTab === "subscription" && <Subscription />}
        {activeTab === "shared-links" && (
          <div className="bg-gray-800/50 p-6 rounded-lg shadow-md animate-fade-in">
            <h2 className="text-lg font-semibold text-gray-200 mb-4">Shared Links</h2>
            <p className="text-gray-500">Shared links feature coming soon...</p>
          </div>
        )}

        {/* Upload Modal */}
        {isUploadModalOpen && (
          <div className="modal modal-open animate-fade-in">
            <div className="modal-box bg-gray-800/90 border border-gray-700 shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-200">Upload File</h3>
                <button
                  className="btn btn-sm btn-circle bg-gray-700 text-gray-200"
                  onClick={() => setIsUploadModalOpen(false)}
                >
                  ✕
                </button>
              </div>
              <FileUpload onUploadSuccess={() => setIsUploadModalOpen(false)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
