import React, { useState } from "react";
import axios from "axios";
import { ethers } from "ethers";
import { useAccount } from "wagmi";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { parseEther } from "ethers";
import { notification } from "~~/utils/scaffold-eth";

export interface PinataFile {
  ipfs_pin_hash: string;
  size: number;
  date_pinned: string;
  metadata: {
    name: string;
    keyvalues?: {
      fileType?: string;
      isPublic?: string;
      uploadedBy?: string;
    };
  };
}

interface UploadParams {
  name: string;
  fileType: string;
  cid: string;
  size: number;
  description: string;
  isEncrypted: boolean;
  isPublic: boolean;
  tags: string[];
  folderId: string;
  storagePeriod: number;
}

interface UploadFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess?: (uploadedFile: PinataFile) => void;
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
  const { writeContractAsync: writeGDrive } = useScaffoldWriteContract({ contractName: "GDrive" });

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
      throw new Error("Pinata API key or secret not configured.");
    }

    try {
      const response = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          pinata_api_key: apiKey,
          pinata_secret_api_key: apiSecret,
        },
        onUploadProgress: progressEvent => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          setUploadProgress(percentCompleted);
        },
      });

      const { IpfsHash } = response.data;
      if (!IpfsHash) {
        throw new Error("Pinata upload failed: Invalid CID.");
      }
      console.log(`Pinata upload successful, CID: ${IpfsHash}, File: ${file.name}, Address: ${address}`);
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
    console.log(`Encoded params: ${encodedData}, CID: ${uploadParams.cid}, Address: ${address}`);
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
    console.log(`Storage cost: ${finalCost} ETH, Size: ${sizeInMB} MB, Period: ${storagePeriodDays} days, Address: ${address}`);
    return finalCost;
  };

  const checkBalance = async (requiredEth: string): Promise<boolean> => {
    if (!address) return false;
    const provider = new ethers.BrowserProvider(window.ethereum);
    const balance = await provider.getBalance(address);
    const requiredWei = parseEther(requiredEth);
    const hasEnough = balance >= requiredWei;
    console.log(`Balance check: ${ethers.formatEther(balance)} ETH, Required: ${requiredEth} ETH, Sufficient: ${hasEnough}, Address: ${address}`);
    return hasEnough;
  };

  const verifyCidInContract = async (cid: string): Promise<boolean> => {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(
      "0x0e14D3b0c258ca41F17Beafaca9e3339eC61d591",
      ["function getFileIdByCid(string memory cid) view returns (bytes32)"],
      provider
    );
    try {
      const fileId = await contract.getFileIdByCid(cid);
      const isStored = fileId !== ethers.ZeroHash;
      console.log(`CID verification: CID: ${cid}, FileId: ${fileId}, Stored: ${isStored}, Address: ${address}`);
      return isStored;
    } catch (err: any) {
      console.error(`CID verification error: ${err.message}, CID: ${cid}, Address: ${address}`);
      return false;
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!uploadFile || !address) {
      notification.error("Please connect wallet and select a file");
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      // Upload to Pinata
      const cid = await uploadToPinata(uploadFile);
      const storagePeriod = parseInt(storagePeriodDays) * 24 * 60 * 60;
      const uploadParams: UploadParams = {
        name: uploadFile.name,
        fileType: uploadFile.type || "application/octet-stream",
        cid,
        size: uploadFile.size,
        description,
        isEncrypted,
        isPublic,
        tags,
        folderId: folderId || ethers.ZeroHash,
        storagePeriod,
      };

      const encodedParams = encodeParams(uploadParams);
      const storageCost = calculateStorageCost(uploadFile.size, parseInt(storagePeriodDays));

      // Check balance
      if (paymentMethod === "ETH") {
        const hasEnough = await checkBalance(storageCost);
        if (!hasEnough) {
          throw new Error(`Insufficient ETH balance: need ${storageCost} ETH`);
        }
      }

      const valueToSend = parseEther(storageCost);
      let txHash: string | undefined;

      // Call contract
      try {
        if (paymentMethod === "ETH") {
          txHash = await writeGDrive({
            functionName: "uploadFile",
            args: [encodedParams],
            value: valueToSend,
          });
        } else if (paymentMethod === "GDV") {
          txHash = await writeGDrive({
            functionName: "uploadFileWithGDV",
            args: [encodedParams],
          });
        } else if (paymentMethod === "Token") {
          if (!tokenAddress) throw new Error("Token address required");
          txHash = await writeGDrive({
            functionName: "uploadFileWithToken",
            args: [encodedParams, tokenAddress],
          });
        }
      } catch (err: any) {
        console.error(`Contract call error: ${err.message}, CID: ${cid}, Address: ${address}, Revert: ${err.reason || err.data?.message || "unknown"}`);
        throw new Error(`Contract call failed: ${err.reason || err.data?.message || err.message}`);
      }

      if (txHash) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const receipt = await provider.waitForTransaction(txHash);
        console.log(`Transaction: Hash: ${txHash}, Status: ${receipt.status}, CID: ${cid}, Address: ${address}`);

        if (receipt.status === 1) {
          // Verify FileUploaded event
          const contract = new ethers.Contract(
            "0x0e14D3b0c258ca41F17Beafaca9e3339eC61d591",
            ["event FileUploaded(bytes32 fileId, address indexed owner, string cid)"],
            provider
          );
          const events = await contract.queryFilter(contract.filters.FileUploaded(), receipt.blockNumber);
          const fileUploadedEvent = events.find(e => e.args.cid === cid && e.args.owner.toLowerCase() === address.toLowerCase());
          if (!fileUploadedEvent) {
            console.error(`FileUploaded event not found, CID: ${cid}, Address: ${address}`);
            throw new Error("FileUploaded event not found. CID may not be stored.");
          }
          console.log(`FileUploaded event: FileId: ${fileUploadedEvent.args.fileId}, CID: ${cid}, Owner: ${fileUploadedEvent.args.owner}`);

          // Verify userCidToFileId
          const isCidStored = await verifyCidInContract(cid);
          if (!isCidStored) {
            console.error(`userCidToFileId not set for CID: ${cid}, Address: ${address}`);
            throw new Error("CID not registered in contract. Upload failed.");
          }

          const finalFile: PinataFile = {
            ipfs_pin_hash: cid,
            size: uploadFile.size,
            date_pinned: new Date().toISOString(),
            metadata: {
              name: uploadFile.name,
              keyvalues: {
                fileType: uploadFile.type || "unknown",
                isPublic: isPublic.toString(),
                uploadedBy: address,
              },
            },
          };

          notification.success("File uploaded and recorded on-chain!");
          if (onUploadSuccess) onUploadSuccess(finalFile);
          onClose();
        } else {
          console.error(`Transaction failed, txHash: ${txHash}, CID: ${cid}, Address: ${address}`);
          throw new Error("Transaction failed on-chain.");
        }
      }
    } catch (error: any) {
      console.error("Upload error:", error.message, { cid: uploadFile?.name, address });
      let errorMessage = error.message || "Unknown error";
      if (error.reason) errorMessage = error.reason;
      else if (error.data?.message) errorMessage = error.data.message;
      notification.error(`Upload failed: ${errorMessage}`);
    } finally {
      setLoading(false);
      setUploadProgress(100);
      setUploadFile(null);
    }
  };

  return (
    <div className="modal modal-open animate-fade-in">
      <div className="modal-box bg-gradient-to-br from-gray-900 via-gray-800 to-black border border-gray-700 shadow-2xl rounded-2xl p-6 max-w-lg mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-semibold text-white">Upload File</h3>
          <button
            type="button"
            className="btn btn-circle bg-gray-700 text-white hover:bg-gray-600"
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleUpload} className="space-y-6">
          {uploadFile && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">File Preview</label>
              {uploadFile.type.startsWith("image/") ? (
                <img
                  src={URL.createObjectURL(uploadFile)}
                  alt={uploadFile.name}
                  className="w-full h-32 object-cover rounded-lg border border-gray-600"
                />
              ) : (
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-600 text-center">
                  <p className="text-gray-300">{uploadFile.name}</p>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Select File</label>
            <input
              type="file"
              onChange={e => e.target.files && setUploadFile(e.target.files[0])}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
              disabled={loading}
              aria-label="Choose file"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
              placeholder="Enter file description"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Tags (comma-separated)</label>
            <input
              type="text"
              value={tags.join(",")}
              onChange={e => setTags(e.target.value.split(",").map(tag => tag.trim()))}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
              placeholder="e.g., document, work"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Folder ID (Optional)</label>
            <input
              type="text"
              value={folderId}
              onChange={e => setFolderId(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
              placeholder="Enter folder ID"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Storage Period (Days)</label>
            <input
              type="number"
              value={storagePeriodDays}
              onChange={e => setStoragePeriodDays(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
              min="30"
              disabled={loading}
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-gray-300">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={e => setIsPublic(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded"
                disabled={loading}
              />
              Public
            </label>
            <label className="flex items-center gap-2 text-gray-300">
              <input
                type="checkbox"
                checked={isEncrypted}
                onChange={e => setIsEncrypted(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded"
                disabled={loading}
              />
              Encrypted
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value as "ETH" | "Token" | "GDV")}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
              disabled={loading}
            >
              <option value="ETH">ETH</option>
              <option value="Token">Token</option>
              <option value="GDV">GDV</option>
            </select>
          </div>

          {paymentMethod === "Token" && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Token Address</label>
              <input
                type="text"
                value={tokenAddress}
                onChange={e => setTokenAddress(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                placeholder="Enter token address"
                disabled={loading}
              />
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 disabled:opacity-50"
            disabled={loading || !uploadFile}
          >
            {loading ? "Uploading..." : "Upload"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UploadFileModal;