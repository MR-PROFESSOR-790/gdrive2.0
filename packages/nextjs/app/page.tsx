"use client";

import { useAccount } from "wagmi";
import { FileList } from "~~/components/GDrive/FileList";
import { FileUpload } from "~~/components/GDrive/FileUpload";
import { Subscription } from "~~/components/GDrive/Subscription";
import { Address } from "~~/components/scaffold-eth";

const Home = () => {
  const { address: connectedAddress } = useAccount();

  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2">GDrive 2.0</h1>
        <p className="text-xl mb-4">Decentralized Storage Solution</p>
        {connectedAddress && (
          <div className="flex justify-center items-center space-x-2">
            <p className="font-medium">Connected Address:</p>
            <Address address={connectedAddress} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="flex flex-col gap-8">
          <FileUpload />
          <FileList />
        </div>
        <div className="flex flex-col gap-8">
          <Subscription />
        </div>
      </div>
    </div>
  );
};

export default Home;
