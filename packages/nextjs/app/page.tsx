"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { Address } from "~~/components/scaffold-eth";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth/RainbowKitCustomConnectButton";

const Home = () => {
  const { address: connectedAddress, isConnected } = useAccount();
  const router = useRouter();

  useEffect(() => {
    if (isConnected) {
      router.push("/dashboard");
    }
  }, [isConnected, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-base-300 to-base-100">
      <div className="max-w-4xl w-full p-8 text-center">
        <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          GDrive 2.0
        </h1>
        <p className="text-2xl mb-12 text-base-content/80">Decentralized Storage Solution Powered by Blockchain</p>

        <div className="bg-base-200 p-8 rounded-2xl shadow-xl">
          <h2 className="text-3xl font-semibold mb-6">Welcome to GDrive 2.0</h2>
          <p className="text-lg mb-8 text-base-content/70">
            Connect your wallet to access your decentralized storage space
          </p>

          <div className="flex flex-col items-center gap-6">
            <RainbowKitCustomConnectButton />
            {connectedAddress && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-base-content/70">Connected as:</span>
                <Address address={connectedAddress} />
              </div>
            )}
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-base-100 rounded-xl">
              <h3 className="text-xl font-semibold mb-2">Secure Storage</h3>
              <p className="text-base-content/70">Your files are encrypted and stored on the blockchain</p>
            </div>
            <div className="p-4 bg-base-100 rounded-xl">
              <h3 className="text-xl font-semibold mb-2">Decentralized</h3>
              <p className="text-base-content/70">No central authority, complete control over your data</p>
            </div>
            <div className="p-4 bg-base-100 rounded-xl">
              <h3 className="text-xl font-semibold mb-2">Easy Access</h3>
              <p className="text-base-content/70">Access your files from anywhere, anytime</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
