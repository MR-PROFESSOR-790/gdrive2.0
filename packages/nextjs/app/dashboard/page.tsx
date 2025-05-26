"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { FileList } from "~~/components/GDrive/FileList";
import { FileUpload } from "~~/components/GDrive/FileUpload";
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
      <header className="bg-base-200 border-b border-base-300">
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
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="flex flex-col gap-8">
            <FileUpload />
            <FileList />
          </div>
          <div className="flex flex-col gap-8">
            <Subscription />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
