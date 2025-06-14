import React, { useState } from "react";
import { FaFolderPlus } from "react-icons/fa";
import axios from "axios";
import { ethers } from "ethers";
import FormData from "form-data";
import { parseEther } from "ethers";
import { useAccount } from "wagmi";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
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

interface UploadFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess?: () => void;
  loading: boolean;
  setLoading: (value: boolean) => void;
  setUploadProgress: (value: number) => void;
}

const UploadFileModal: React.FC<UploadFileModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
  loading,
  setLoading,
  setUploadProgress,
}) => {
  const { address } = useAccount();
  const { writeContractAsync: writeGDrive } = useScaffoldWriteContract({
    contractName: "GDrive",
  });

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [folderId, setFolderId] = useState("");
  const [storagePeriodDays, setStoragePeriodDays] = useState("30");
  const [paymentMethod, setPaymentMethod] = useState<"ETH" | "Token" | "GDV">("ETH");
  const [tokenAddress, setTokenAddress] = useState("");

  if (!isOpen) return null;

  const uploadToPinata = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);

    const apiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY;
    const apiSecret = process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY;

    if (!apiKey || !apiSecret) {
      throw new Error("Pinata API key or secret not configured in environment variables.");
    }

    try {
      const response = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          pinata_api_key: apiKey,
          pinata_secret_api_key: apiSecret,
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          setUploadProgress(percentCompleted);
        },
      });

      const { IpfsHash } = response.data;
      if (!IpfsHash) {
        throw new Error("Pinata upload failed: Invalid CID.");
      }

      console.log("File uploaded to Pinata with CID:", IpfsHash);
      return IpfsHash;
    } catch (error: any) {
      console.error("Pinata upload error:", error.response?.data || error.message);
      throw new Error(`Failed to upload to Pinata: ${error.message}`);
    }
  };

  const encodeParams = (uploadParams: UploadParams): `0x${string}` => {
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
      ]
    );
    return encodedData as `0x${string}`;
  };

  const calculateStorageCost = (fileSize: number, storagePeriodDays: number): string => {
    const BYTES_PER_MB = 1048576;
    const storageRatePerMBPerYear = parseEther("0.00001");
    const sizeInMB = Math.ceil(fileSize / BYTES_PER_MB);
    const periodInSeconds = BigInt(storagePeriodDays * 24 * 60 * 60);
    const periodInYears = periodInSeconds * BigInt(1e18) / BigInt(365 * 24 * 60 * 60);
    const costInWei = (BigInt(sizeInMB) * storageRatePerMBPerYear * periodInYears) / BigInt(1e18);
    const minPayment = parseEther("0.0001");
    const finalCost = costInWei > minPayment ? ethers.formatEther(costInWei) : "0.0001";
    console.log("Calculated storage cost in ether:", finalCost);
    return finalCost;
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !address) {
      notification.error("Please connect your wallet and select a file");
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      const cid = await uploadToPinata(uploadFile);
      const storagePeriod = BigInt(parseInt(storagePeriodDays) * 24 * 60 * 60);
      const uploadParams: UploadParams = {
        name: uploadFile.name,
        fileType: uploadFile.type || "application/octet-stream",
        cid,
        size: BigInt(uploadFile.size),
        description,
        isEncrypted,
        isPublic,
        tags,
        folderId: folderId || ethers.ZeroHash,
        storagePeriod,
      };

      const encodedParams = encodeParams(uploadParams);
      const storageCost = calculateStorageCost(Number(uploadFile.size), parseInt(storagePeriodDays));
      const valueToSend = parseEther(storageCost);

      let txHash;
      if (paymentMethod === "ETH") {
        txHash = await writeGDrive({
          functionName: "batchUploadFiles",
          args: [[encodedParams]],
          value: valueToSend,
        }).catch((error) => {
          console.error("Transaction error:", error);
          throw error;
        });
      } else if (paymentMethod === "GDV") {
        txHash = await writeGDrive({
          functionName: "uploadFileWithGDV",
          args: [encodedParams],
        }).catch((error) => {
          console.error("Transaction error:", error);
          throw error;
        });
      } else if (paymentMethod === "Token") {
        if (!tokenAddress) throw new Error("Token address required");
        txHash = await writeGDrive({
          functionName: "uploadFileWithToken",
          args: [encodedParams, tokenAddress],
        }).catch((error) => {
          console.error("Transaction error:", error);
          throw error;
        });
      }

      if (txHash) {
        console.log("Transaction hash:", txHash);
        const provider = new ethers.BrowserProvider(window.ethereum);
        const receipt = await provider.waitForTransaction(txHash);
        if (receipt.status === 1) {
          notification.success("File uploaded and recorded on-chain successfully!");
          if (onUploadSuccess) onUploadSuccess();
          onClose();
        } else {
          throw new Error("Transaction failed on-chain.");
        }
      } else {
        throw new Error("Transaction failed or was not executed.");
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      notification.error(`Failed to upload file: ${error.message || "Unknown error"}`);
    } finally {
      setLoading(false);
      setUploadProgress(100);
      setUploadFile(null);
    }
  };

  return (
    <div className="modal modal-open animate-fade-in" onSubmit={handleUpload}>
      <div className="modal-box bg-gray-800/90 border border-gray-700 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-200">Upload File</h3>
          <button
            type="button"
            className="btn btn-sm btn-circle bg-gray-700 text-gray-200 hover:bg-gray-600"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-gray-400 mb-2">File</label>
            <input
              type="file"
              onChange={(e) => e.target.files && setUploadFile(e.target.files[0])}
              className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-200"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-gray-400 mb-2">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-200"
              placeholder="File description"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-gray-400 mb-2">Tags (comma-separated)</label>
            <input
              type="text"
              value={tags.join(",")}
              onChange={(e) => setTags(e.target.value.split(",").map((tag) => tag.trim()))}
              className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-200"
              placeholder="e.g., document, work"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-gray-400 mb-2">Folder ID (Optional)</label>
            <input
              type="text"
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-200"
              placeholder="Enter folder ID"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-gray-400 mb-2">Storage Period (Days)</label>
            <input
              type="number"
              value={storagePeriodDays}
              onChange={(e) => setStoragePeriodDays(e.target.value)}
              className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-200"
              min="30"
              disabled={loading}
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded"
                disabled={loading}
              />
              <span className="text-gray-200">Public</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isEncrypted}
                onChange={(e) => setIsEncrypted(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded"
                disabled={loading}
              />
              <span className="text-gray-200">Encrypted</span>
            </label>
          </div>
          <div>
            <label className="block text-gray-400 mb-2">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as "ETH" | "Token" | "GDV")}
              className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-200"
              disabled={loading}
            >
              <option value="ETH">ETH</option>
              <option value="Token">Token</option>
              <option value="GDV">GDV</option>
            </select>
          </div>
          {paymentMethod === "Token" && (
            <div>
              <label className="block text-gray-400 mb-2">Token Address</label>
              <input
                type="text"
                value={tokenAddress}
                onChange={(e) => setTokenAddress(e.target.value)}
                className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-200"
                placeholder="Enter token address"
                disabled={loading}
              />
            </div>
          )}
          <button
            type="submit"
            className="btn w-full bg-gradient-to-r from-blue-600 to-blue-800 text-white border-none hover:from-blue-700 hover:to-blue-900 transition-all duration-300"
            disabled={loading || !uploadFile}
          >
            {loading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadFileModal;