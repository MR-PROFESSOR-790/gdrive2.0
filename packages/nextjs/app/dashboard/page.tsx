"use client";

import React, { useState } from "react";
import GDriveManager, { FileUpload } from "./_components/GDriveManager";
import {
  FaBars,
  FaCloud,
  FaCube,
  FaDollarSign,
  FaFileAlt,
  FaFileUpload,
  FaFolder,
  FaFolderPlus,
  FaLink,
  FaLock,
  FaSearch,
  FaShareAlt,
  FaTimes,
  FaWallet,
} from "react-icons/fa";
import { useAccount } from "wagmi";
import { FileGallery } from "~~/components/GDrive/FileGallery";
import { Subscription } from "~~/components/GDrive/Subscription";
import { Address } from "~~/components/scaffold-eth";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth/RainbowKitCustomConnectButton";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

// Interface for File Data (if needed by GDriveManager)
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
  const [activeTab, setActiveTab] = useState("files");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [fileListRefreshTrigger, setFileListRefreshTrigger] = useState(0);

  // Modal states
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [isCreateShareModalOpen, setIsCreateShareModalOpen] = useState(false);
  const [isCreatePaidShareModalOpen, setIsCreatePaidShareModalOpen] = useState(false);
  const [isAccessShareModalOpen, setIsAccessShareModalOpen] = useState(false);

  // Fetch user stats for sidebar
  const { data: userStats } = useScaffoldReadContract({
    contractName: "GDrive",
    functionName: "getUserStats",
    args: [connectedAddress],
  });

  const triggerFileListRefresh = () => {
    setFileListRefreshTrigger(prev => prev + 1);
  };

  const getStoragePercentage = () => {
    if (!userStats) return 0;
    return (Number(userStats[0]) / Number(userStats[1])) * 100;
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center space-y-6 p-8 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
          <FaCloud className="text-6xl text-blue-400 mx-auto animate-bounce" />
          <h2 className="text-2xl font-bold text-white">Connect Your Wallet</h2>
          <p className="text-gray-300">Please connect your wallet to access GDrive 2.0</p>
          <RainbowKitCustomConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-gray-100 flex overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 bg-slate-900/95 backdrop-blur-xl border-r border-slate-700/50 transform ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:static lg:w-80 p-6 flex flex-col gap-6 transition-all duration-500 ease-out z-30 shadow-2xl`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <FaCloud className="text-white text-lg" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              GDrive 2.0
            </h1>
          </div>
          <button
            className="lg:hidden text-gray-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg"
            onClick={() => setIsSidebarOpen(false)}
          >
            <FaTimes className="text-lg" />
          </button>
        </div>

        {userStats && (
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 backdrop-blur-sm p-5 rounded-2xl border border-slate-600/30 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-300">Storage Usage</span>
              <span className="text-xs text-gray-400">{getStoragePercentage().toFixed(1)}%</span>
            </div>
            <div className="space-y-2">
              <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${getStoragePercentage()}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>{(Number(userStats[0]) / (1024 * 1024 * 1024)).toFixed(2)} GB</span>
                <span>{(Number(userStats[1]) / (1024 * 1024 * 1024)).toFixed(2)} GB</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-600/30">
              <div className="text-center">
                <p className="text-xs text-gray-400">Tier</p>
                <p className="text-sm font-semibold text-blue-400">{userStats[6]}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400">Expires</p>
                <p className="text-sm font-semibold text-purple-400">
                  {new Date(Number(userStats[7]) * 1000).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        )}

        <nav className="flex-1 space-y-2">
          {[
            { id: "files", icon: FaFileAlt, label: "My Files" },
            { id: "gallery", icon: FaCube, label: "3D Gallery" },
            { id: "subscription", icon: FaWallet, label: "Subscription" },
            { id: "shared-links", icon: FaShareAlt, label: "Shared Links" },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-300 transform hover:scale-105 ${
                activeTab === item.id
                  ? "bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-white border border-blue-500/30 shadow-lg"
                  : "text-gray-400 hover:bg-slate-800/50 hover:text-white"
              }`}
            >
              <item.icon className="text-lg" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
          <button
            onClick={() => setIsCreateFolderModalOpen(true)}
            className="w-full flex items-center gap-4 p-4 rounded-xl text-gray-400 hover:bg-slate-800/50 hover:text-white transition-all duration-300 transform hover:scale-105"
          >
            <FaFolderPlus className="text-lg" />
            <span className="font-medium">Create Folder</span>
          </button>
          <button
            onClick={() => setIsAccessShareModalOpen(true)}
            className="w-full flex items-center gap-4 p-4 rounded-xl text-gray-400 hover:bg-slate-800/50 hover:text-white transition-all duration-300 transform hover:scale-105"
          >
            <FaLink className="text-lg" />
            <span className="font-medium">Access Shared File</span>
          </button>
        </nav>

        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-600/30">
          <p className="text-xs text-gray-400 mb-2">Connected Wallet</p>
          <Address address={connectedAddress} />
        </div>
      </div>

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen relative z-10">
        <header className="p-6 lg:p-8 bg-slate-900/30 backdrop-blur-sm border-b border-slate-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                className="lg:hidden p-3 hover:bg-slate-800 rounded-xl transition-all duration-300 transform hover:scale-105"
                onClick={() => setIsSidebarOpen(true)}
              >
                <FaBars className="text-xl text-gray-300" />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {activeTab === "files" && "My Files"}
                  {activeTab === "gallery" && "3D Gallery"}
                  {activeTab === "subscription" && "Subscription"}
                  {activeTab === "shared-links" && "Shared Links"}
                </h2>
                <p className="text-gray-400 text-sm mt-1">
                  {activeTab === "files" && "Manage your files and folders"}
                  {activeTab === "gallery" && "Immersive file viewing experience"}
                  {activeTab === "subscription" && "Manage your storage plan"}
                  {activeTab === "shared-links" && "Share files securely"}
                </p>
              </div>
            </div>
            {activeTab === "files" && (
              <div className="flex gap-3">
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-medium transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center gap-2"
                >
                  <FaFileUpload />
                  Upload File
                </button>
                <button
                  onClick={() => setIsCreateFolderModalOpen(true)}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white rounded-xl font-medium transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center gap-2"
                >
                  <FaFolderPlus />
                  Create Folder
                </button>
              </div>
            )}
            {activeTab === "shared-links" && (
              <div className="flex gap-3">
                <button
                  onClick={() => setIsCreateShareModalOpen(true)}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-medium transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center gap-2"
                >
                  <FaShareAlt />
                  Create Share Link
                </button>
                <button
                  onClick={() => setIsCreatePaidShareModalOpen(true)}
                  className="px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white rounded-xl font-medium transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center gap-2"
                >
                  <FaDollarSign />
                  Create Paid Share Link
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          {activeTab === "files" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="relative flex-1 max-w-md">
                  <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search files..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-800/50 backdrop-blur-sm border border-slate-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-3 rounded-lg transition-all duration-300 ${
                      viewMode === "grid" ? "bg-blue-600 text-white" : "bg-slate-800/50 text-gray-400 hover:text-white"
                    }`}
                  >
                    <div className="w-4 h-4 grid grid-cols-2 gap-0.5">
                      <div className="bg-current rounded-sm"></div>
                      <div className="bg-current rounded-sm"></div>
                      <div className="bg-current rounded-sm"></div>
                      <div className="bg-current rounded-sm"></div>
                    </div>
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-3 rounded-lg transition-all duration-300 ${
                      viewMode === "list" ? "bg-blue-600 text-white" : "bg-slate-800/50 text-gray-400 hover:text-white"
                    }`}
                  >
                    <div className="w-4 h-4 space-y-1">
                      <div className="bg-current h-0.5 rounded"></div>
                      <div className="bg-current h-0.5 rounded"></div>
                      <div className="bg-current h-0.5 rounded"></div>
                    </div>
                  </button>
                </div>
              </div>
              <GDriveManager refreshTrigger={fileListRefreshTrigger} />
            </div>
          )}

          {activeTab === "gallery" && (
            <div className="animate-fade-in">
              <FileGallery />
            </div>
          )}

          {activeTab === "subscription" && (
            <div className="animate-fade-in">
              <Subscription />
            </div>
          )}

          {activeTab === "shared-links" && (
            <div className="bg-slate-800/30 backdrop-blur-sm p-8 rounded-2xl border border-slate-700/50 text-center animate-fade-in">
              <FaShareAlt className="text-5xl text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Shared Links</h3>
              <p className="text-gray-400">Manage your shared files or create new share links above.</p>
            </div>
          )}
        </main>
      </div>

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-lg transform animate-scale-in">
            <div className="flex justify-between items-center p-6 border-b border-slate-700/50">
              <h3 className="text-xl font-semibold text-white">Upload File</h3>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all duration-300"
              >
                <FaTimes />
              </button>
            </div>
            <div className="p-6">
              <FileUpload
                onUploadSuccess={() => {
                  setIsUploadModalOpen(false);
                  triggerFileListRefresh();
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Create Folder Modal */}
      {isCreateFolderModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-lg transform animate-scale-in">
            <div className="flex justify-between items-center p-6 border-b border-slate-700/50">
              <h3 className="text-xl font-semibold text-white">Create Folder</h3>
              <button
                onClick={() => setIsCreateFolderModalOpen(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all duration-300"
              >
                <FaTimes />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-400 mb-2">Folder Name</label>
                  <input
                    type="text"
                    className="w-full p-2 bg-slate-800/50 border border-slate-700 rounded-lg text-gray-200"
                    placeholder="Enter folder name"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-2">Parent Folder ID (Optional)</label>
                  <input
                    type="text"
                    className="w-full p-2 bg-slate-800/50 border border-slate-700 rounded-lg text-gray-200"
                    placeholder="Enter parent folder ID"
                  />
                </div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded" />
                  <span className="text-gray-200">Public</span>
                </label>
                <button className="w-full px-4 py-2 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 transition-all duration-300">
                  Create Folder
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Share Link Modal */}
      {isCreateShareModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-lg transform animate-scale-in">
            <div className="flex justify-between items-center p-6 border-b border-slate-700/50">
              <h3 className="text-xl font-semibold text-white">Create Share Link</h3>
              <button
                onClick={() => setIsCreateShareModalOpen(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all duration-300"
              >
                <FaTimes />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-400 mb-2">File/Folder ID</label>
                  <input
                    type="text"
                    className="w-full p-2 bg-slate-800/50 border border-slate-700 rounded-lg text-gray-200"
                    placeholder="Enter file or folder ID"
                  />
                </div>
                <button className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300">
                  Create Share Link
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Paid Share Link Modal */}
      {isCreatePaidShareModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-lg transform animate-scale-in">
            <div className="flex justify-between items-center p-6 border-b border-slate-700/50">
              <h3 className="text-xl font-semibold text-white">Create Paid Share Link</h3>
              <button
                onClick={() => setIsCreatePaidShareModalOpen(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all duration-300"
              >
                <FaTimes />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-400 mb-2">File/Folder ID</label>
                  <input
                    type="text"
                    className="w-full p-2 bg-slate-800/50 border border-slate-700 rounded-lg text-gray-200"
                    placeholder="Enter file or folder ID"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-2">Price (ETH)</label>
                  <input
                    type="number"
                    step="0.001"
                    className="w-full p-2 bg-slate-800/50 border border-slate-700 rounded-lg text-gray-200"
                    placeholder="Enter price in ETH"
                  />
                </div>
                <button className="w-full px-4 py-2 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-lg hover:from-yellow-700 hover:to-orange-700 transition-all duration-300">
                  Create Paid Share Link
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Access Shared File Modal */}
      {isAccessShareModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-lg transform animate-scale-in">
            <div className="flex justify-between items-center p-6 border-b border-slate-700/50">
              <h3 className="text-xl font-semibold text-white">Access Shared File</h3>
              <button
                onClick={() => setIsAccessShareModalOpen(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all duration-300"
              >
                <FaTimes />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-400 mb-2">Share Link ID</label>
                  <input
                    type="text"
                    className="w-full p-2 bg-slate-800/50 border border-slate-700 rounded-lg text-gray-200"
                    placeholder="Enter share link ID"
                  />
                </div>
                <button className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300">
                  Access File
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }

        .animate-scale-in {
          animation: scale-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
