import { useState } from "react";
import axios from "axios";
import { ethers } from "ethers";
import FormData from "form-data";
import { FaFileUpload } from "react-icons/fa";
import { parseEther } from "viem";
import { useAccount } from "wagmi";
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

// Define the props interface for FileUpload
interface FileUploadProps {
  onUploadSuccess?: () => void; // Make it optional
}

export const FileUpload = ({ onUploadSuccess }: FileUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { address } = useAccount();

  const { writeContractAsync: uploadFile, isPending: isUploading } = useScaffoldWriteContract({
    contractName: "GDrive",
  });
  const [paymentMethod, setPaymentMethod] = useState<"eth" | "gdv" | "token">("eth");
  const [selectedToken, setSelectedToken] = useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const uploadToPinata = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);

    // Get API key and secret from environment variables
    const apiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY;
    const apiSecret = process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY;

    if (!apiKey || !apiSecret) {
      throw new Error("Pinata API key or secret not configured in environment variables.");
    }

    const response = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        pinata_api_key: apiKey,
        pinata_secret_api_key: apiSecret,
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

      if (paymentMethod === "eth") {
        await uploadFile({ functionName: "uploadFile", args: [encodedParams], value: parseEther(storageCost) });
      } else if (paymentMethod === "gdv") {
        await uploadFile({ functionName: "uploadFileWithGDV", args: [encodedParams] });
      } else {
        await uploadFile({ functionName: "uploadFileWithToken", args: [encodedParams, selectedToken] });
      }

      notification.success("File uploaded successfully!");

      // Call the success handler if provided
      if (onUploadSuccess) {
        onUploadSuccess();
      }
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
    const months = storagePeriod / (30 * 24 * 60 * 60);

    // Calculate costs based on file size and storage period
    const sizeCost = sizeInMB * costPerMB;
    const timeCost = months * monthlyRate;
    const totalCost = baseCost + sizeCost + timeCost;

    return totalCost.toFixed(6); // Return as string for viem.parseEther
  };

  return (
    <div className="flex flex-col gap-6 p-8 bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-lg animate-fade-in">
      <h2 className="text-2xl font-bold text-white mb-4 border-b border-slate-700/50 pb-4">Upload File</h2>

      {/* Payment Method */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-300">Payment Method</label>
        <select
          className="select w-full bg-slate-700/50 border border-slate-600/50 text-white rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
          value={paymentMethod}
          onChange={e => setPaymentMethod(e.target.value as "eth" | "gdv" | "token")}
        >
          <option value="eth">ETH</option>
          <option value="gdv">GDV Token</option>
          <option value="token">Other Token</option>
        </select>
      </div>

      {/* Token Address Input (Conditional) */}
      {paymentMethod === "token" && (
        <div className="flex flex-col gap-2 animate-fade-in">
          <label className="text-sm font-medium text-gray-300">Token Address</label>
          <input
            type="text"
            placeholder="Enter Token Address"
            className="input w-full bg-slate-700/50 border border-slate-600/50 text-white rounded-xl placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
            value={selectedToken}
            onChange={e => setSelectedToken(e.target.value)}
          />
        </div>
      )}

      {/* File Input */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-300">Select File</label>
        <label className="flex items-center justify-center w-full px-4 py-8 bg-slate-700/50 border border-slate-600/50 rounded-xl cursor-pointer transition-colors hover:bg-slate-700/70">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <FaFileUpload className="text-3xl text-gray-400 mb-3" />
            {file ? (
              <p className="text-white text-sm font-semibold">
                File Selected: <span className="text-blue-400">{file.name}</span>
              </p>
            ) : (
              <p className="mb-2 text-sm text-gray-400">
                Drag and drop or <span className="font-semibold text-blue-400">choose a file</span>
              </p>
            )}
            <input type="file" className="hidden" onChange={handleFileChange} disabled={uploading} />
          </div>
        </label>
      </div>

      {/* File Info */}
      {file && (
        <div className="bg-slate-700/50 rounded-xl p-4 text-sm space-y-2 animate-fade-in">
          <p>
            <strong className="text-gray-300">Name:</strong> <span className="text-white">{file.name}</span>
          </p>
          <p>
            <strong className="text-gray-300">Size:</strong>{" "}
            <span className="text-white">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
          </p>
          <p>
            <strong className="text-gray-300">Type:</strong> <span className="text-white">{file.type || "N/A"}</span>
          </p>
        </div>
      )}

      {/* Upload Button */}
      <button
        className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-medium transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={handleUpload}
        disabled={!file || uploading || isUploading}
      >
        {uploading || isUploading ? <span className="loading loading-spinner"></span> : "Upload"}
      </button>
    </div>
  );
};
