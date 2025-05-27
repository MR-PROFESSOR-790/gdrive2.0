"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import FileExplorer from "~~/components/GDrive/FileExplorer";
import { FileList } from "~~/components/GDrive/FileList";
import { FileUpload } from "~~/components/GDrive/FileUpload";
import Sidebar from "~~/components/GDrive/Sidebar";
import { Subscription } from "~~/components/GDrive/Subscription";
import { Address } from "~~/components/scaffold-eth";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth/RainbowKitCustomConnectButton";

const Dashboard = () => {
  const { address: connectedAddress, isConnected } = useAccount();
  const router = useRouter();

  useEffect(() => {
    if (!isConnected) {
      router.push("/");
    }
  }, [isConnected, router]);

  if (!isConnected) {
    return null;
  }

  return (
    <div className="min-h-screen bg-base-100">
      {/* Header */}
      {/* This header will be moved or adapted */}
      {/* <header className="bg-base-200 border-b border-base-300">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold">GDrive 2.0</h1>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-base-content/70">Connected as:</span>
                <Address address={connectedAddress} />
              </div>
            </div>
            <RainbowKitCustomConnectButton />
          </div>
        </div>
      </header> */}

      {/* Main Content Layout */}
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="w-64 bg-base-200 p-4 border-r border-base-300 hidden md:block">
          <Sidebar />
        </aside>

        {/* Main File Explorer Area */}
        <main className="flex-1 p-8">
          <FileExplorer />
          {/* Temporarily keep other components for now */}
          {/* <FileUpload /> */}
          {/* <FileList /> */}
          {/* <Subscription /> */}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
