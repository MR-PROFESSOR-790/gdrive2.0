"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import GDriveManager from "./_components/GDriveManager";
// Import the new component
import { FaBars, FaCloud, FaCube, FaShareAlt, FaTimes, FaWallet } from "react-icons/fa";
import { useAccount } from "wagmi";
import { FileGallery } from "~~/components/GDrive/FileGallery";
import SharedLinks from "~~/components/GDrive/SharedLinks";
import { Subscription } from "~~/components/GDrive/Subscription";
import { Address } from "~~/components/scaffold-eth";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth/RainbowKitCustomConnectButton";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

// Interface for File Data (can be removed if GDriveManager handles all file data)
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [fileListRefreshTrigger, setFileListRefreshTrigger] = useState(0);

  // Fetch user stats for sidebar
  const { data: userStats } = useScaffoldReadContract({
    contractName: "GDrive",
    functionName: "getUserStats",
    args: [connectedAddress],
  });

  // Function to trigger file list refresh
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
        {/* Header */}
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

        {/* User Stats */}
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

        {/* Navigation */}
        <nav className="flex-1 space-y-2">
          {[
            {
              id: "files",
              icon: FaCloud,
              label: "My Files",
            },
            {
              id: "gallery",
              icon: FaCube,
              label: "3D Gallery",
            },
            {
              id: "subscription",
              icon: FaWallet,
              label: "Subscription",
            },
            {
              id: "shared-links",
              icon: FaShareAlt,
              label: "Shared Links",
            },
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
        </nav>

        {/* Wallet Address */}
        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-600/30">
          <p className="text-xs text-gray-400 mb-2">Connected Wallet</p>
          <Address address={connectedAddress} />
        </div>
      </div>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen relative z-10">
        {/* Header */}
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
                  {activeTab === "files" && "Manage your decentralized files"}
                  {activeTab === "gallery" && "Immersive file viewing experience"}
                  {activeTab === "subscription" && "Manage your storage plan"}
                  {activeTab === "shared-links" && "Share files securely"}
                </p>
              </div>
            </div>

            {/* Removed the Upload File button since GDriveManager includes it */}
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          {activeTab === "files" && (
            <div className="space-y-6">
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
              <p className="text-gray-400">
                This feature is coming soon. You&apos;ll be able to share files securely with others.
              </p>
            </div>
          )}
        </main>
      </div>

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
