import { useState } from "react";
import axios from "axios";
import { ethers } from "ethers";
import FormData from "form-data";
import { parseEther } from "viem";
import { useAccount } from "wagmi";
import { PINATA_CONFIG } from "~~/config/pinata";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth/useScaffoldWriteContract";
import { notification } from "~~/utils/scaffold-eth";

interface UploadParams {
  name: string;
  fileType: string;
  cid: string;
  size: bigint;
  description: string;
  isEncrypted: boolean;
  isPublic: boolean;
  tags: string[];
  folderId: string;
  storagePeriod: bigint;
}

export const FileUpload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { address } = useAccount();

  const { writeContractAsync: uploadFile, isPending: isUploading } = useScaffoldWriteContract({
    contractName: "GDrive",
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const uploadToPinata = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        pinata_api_key: PINATA_CONFIG.apiKey,
        pinata_secret_api_key: PINATA_CONFIG.apiSecret,
      },
    });

    return response.data.IpfsHash;
  };

  const encodeParams = (uploadParams: UploadParams): `0x${string}` => {
    // ABI encode the parameters in the correct order
    const abiCoder = new ethers.AbiCoder();
    const encodedData = abiCoder.encode(
      ["string", "string", "string", "uint128", "string", "bool", "bool", "string[]", "bytes32", "uint64"],
      [
        uploadParams.name,
        uploadParams.fileType,
        uploadParams.cid,
        uploadParams.size,
        uploadParams.description,
        uploadParams.isEncrypted,
        uploadParams.isPublic,
        uploadParams.tags,
        uploadParams.folderId,
        uploadParams.storagePeriod,
      ],
    );
    return encodedData as `0x${string}`;
  };

  const handleUpload = async () => {
    if (!file || !address) {
      notification.error("Please connect your wallet and select a file");
      return;
    }

    try {
      setUploading(true);

      // Upload to Pinata first
      const fileCid = await uploadToPinata(file);
      console.log("File uploaded to Pinata with CID:", fileCid);

      const uploadParams: UploadParams = {
        name: file.name,
        fileType: file.type || "application/octet-stream",
        cid: fileCid,
        size: BigInt(file.size),
        description: "",
        isEncrypted: false,
        isPublic: true,
        tags: [],
        folderId: "0x0000000000000000000000000000000000000000000000000000000000000000",
        storagePeriod: BigInt(30 * 24 * 60 * 60), // 30 days in seconds
      };

      const encodedParams = encodeParams(uploadParams);
      const storageCost = calculateStorageCost(file.size, Number(uploadParams.storagePeriod));

      console.log("Uploading with params:", {
        ...uploadParams,
        size: uploadParams.size.toString(),
        storagePeriod: uploadParams.storagePeriod.toString(),
      });
      console.log("Encoded params:", encodedParams);
      console.log("Storage cost:", storageCost, "ETH");

      const result = await uploadFile({
        functionName: "uploadFile",
        args: [encodedParams],
        value: parseEther(storageCost),
      });

      console.log("Transaction submitted:", result);
      notification.success("File uploaded successfully!");
    } catch (error) {
      console.error("Upload error:", error);
      if (error instanceof Error) {
        notification.error(`Failed to upload file: ${error.message}`);
      } else {
        notification.error("Failed to upload file: Unknown error");
      }
    } finally {
      setUploading(false);
    }
  };

  const calculateStorageCost = (fileSize: number, storagePeriod: number): string => {
    const baseCost = 0.01; // ETH
    const sizeInMB = fileSize / (1024 * 1024);
    const costPerMB = 0.001; // ETH per MB
    const monthlyRate = 0.005; // ETH per month
    const months = storagePeriod / (30 * 24 * 60 * 60); // Convert seconds to months

    // Calculate costs based on file size and storage period
    const sizeCost = sizeInMB * costPerMB;
    const timeCost = months * monthlyRate;
    const totalCost = baseCost + sizeCost + timeCost;

    return totalCost.toFixed(6); // Return as string for viem.parseEther
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-base-200 rounded-lg">
      <h2 className="text-xl font-bold">Upload File</h2>
      <input
        type="file"
        onChange={handleFileChange}
        className="file-input file-input-bordered w-full"
        disabled={uploading}
      />
      {file && (
        <div className="text-sm">
          <p>Name: {file.name}</p>
          <p>Size: {(file.size / 1024 / 1024).toFixed(2)} MB</p>
          <p>Type: {file.type}</p>
        </div>
      )}
      <button className="btn btn-primary" onClick={handleUpload} disabled={!file || uploading || isUploading}>
        {uploading || isUploading ? "Uploading..." : "Upload"}
      </button>
    </div>
  );
};
