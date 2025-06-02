import React, { useCallback, useEffect, useState } from "react";
import {
  FaCheck,
  FaCopy,
  FaDollarSign,
  FaDownload,
  FaFolderPlus,
  FaLock,
  FaShareAlt,
  FaTrash,
  FaUnlock,
  FaUserPlus,
  FaWallet,
} from "react-icons/fa";
import { encodeAbiParameters, parseAbiParameters, parseEther } from "viem";
import { useAccount } from "wagmi";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

interface PinataFile {
  ipfs_pin_hash: string;
  metadata?: {
    name?: string;
    keyvalues?: {
      isPublic?: string;
      uploadedBy?: string;
      originalSize?: string;
      fileType?: string;
    };
  };
  date_pinned: string;
  size: number;
}

interface GDriveManagerProps {
  refreshTrigger: number;
}

const GDriveManager: React.FC<GDriveManagerProps> = ({ refreshTrigger }) => {
  const [files, setFiles] = useState<PinataFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedCid, setCopiedCid] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isPaidShareModalOpen, setIsPaidShareModalOpen] = useState(false);
  const [isAccessShareModalOpen, setIsAccessShareModalOpen] = useState(false);
  const [isAccessPaidShareModalOpen, setIsAccessPaidShareModalOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<PinataFile | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [folderId, setFolderId] = useState("");
  const [storagePeriodDays, setStoragePeriodDays] = useState("30");
  const [folderName, setFolderName] = useState("");
  const [parentFolderId, setParentFolderId] = useState("");
  const [folderIsPublic, setFolderIsPublic] = useState(true);
  const [sharePassword, setSharePassword] = useState("");
  const [shareExpiryDays, setShareExpiryDays] = useState("7");
  const [shareMaxAccess, setShareMaxAccess] = useState("10");
  const [paidSharePassword, setPaidSharePassword] = useState("");
  const [paidSharePrice, setPaidSharePrice] = useState("0.01");
  const [paidShareExpiryDays, setPaidShareExpiryDays] = useState("7");
  const [paidShareMaxAccess, setPaidShareMaxAccess] = useState("10");
  const [accessShareLinkId, setAccessShareLinkId] = useState("");
  const [accessSharePassword, setAccessSharePassword] = useState("");
  const [accessPaidShareLinkId, setAccessPaidShareLinkId] = useState("");
  const [accessPaidSharePassword, setAccessPaidSharePassword] = useState("");
  const [subscriptionTier, setSubscriptionTier] = useState("1");
  const [subscriptionDurationDays, setSubscriptionDurationDays] = useState("30");
  const [referrerAddress, setReferrerAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"ETH" | "Token" | "GDV">("ETH");
  const [tokenAddress, setTokenAddress] = useState("");
  const { address } = useAccount();

  const { writeContractAsync: writeGDrive } = useScaffoldWriteContract({
    contractName: "GDrive",
  });

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    const apiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY;
    const apiSecret = process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY;

    if (!apiKey || !apiSecret) {
      setError("Pinata API key or secret not configured in environment variables.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("https://api.pinata.cloud/data/pinList", {
        headers: {
          pinata_api_key: apiKey,
          pinata_secret_api_key: apiSecret,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const userFiles = data.rows.filter((file: PinataFile) => file.metadata?.keyvalues?.uploadedBy === address);

      setFiles(userFiles);
    } catch (err: any) {
      setError(`Failed to fetch files: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [address]);

  const handleUploadFile = async () => {
    if (!uploadFile) return;

    setLoading(true);
    const apiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY;
    const apiSecret = process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY;

    if (!apiKey || !apiSecret) {
      notification.error("Pinata API credentials not configured");
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", uploadFile);

      const metadata = {
        name: uploadFile.name,
        keyvalues: {
          isPublic: isPublic.toString(),
          uploadedBy: address || "unknown",
          originalSize: uploadFile.size.toString(),
          fileType: uploadFile.type || "unknown",
        },
      };

      formData.append("pinataMetadata", JSON.stringify(metadata));
      formData.append(
        "pinataOptions",
        JSON.stringify({
          cidVersion: 1,
          wrapWithDirectory: false,
        }),
      );

      const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: {
          pinata_api_key: apiKey,
          pinata_secret_api_key: apiSecret,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();

      const params = encodeAbiParameters(
        parseAbiParameters("string, string, string, uint128, string, bool, bool, string[], bytes32, uint64"),
        [
          uploadFile.name,
          uploadFile.type || "unknown",
          result.IpfsHash,
          BigInt(uploadFile.size),
          description,
          isEncrypted,
          isPublic,
          tags,
          (folderId || "0x0000000000000000000000000000000000000000000000000000000000000000") as `0x${string}`,
          BigInt(Number(storagePeriodDays) * 24 * 60 * 60),
        ],
      );

      if (paymentMethod === "ETH") {
        await writeGDrive({
          functionName: "batchUploadFiles",
          args: [[params]],
          value: parseEther("0.001"), // Adjust based on storage cost
        });
      } else if (paymentMethod === "Token") {
        if (!tokenAddress) throw new Error("Token address required");
        await writeGDrive({
          functionName: "uploadFileWithToken",
          args: [params, tokenAddress],
        });
      } else if (paymentMethod === "GDV") {
        await writeGDrive({
          functionName: "uploadFileWithGDV",
          args: [params],
        });
      }

      notification.success(`File "${uploadFile.name}" uploaded successfully!`);
      setIsUploadModalOpen(false);
      fetchFiles();
    } catch (error: any) {
      console.error("Upload error:", error);
      notification.error(`Upload failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolder = async () => {
    try {
      await writeGDrive({
        functionName: "createFolder",
        args: [
          folderName,
          (parentFolderId || "0x0000000000000000000000000000000000000000000000000000000000000000") as `0x${string}`,
          folderIsPublic,
        ],
      });

      notification.success(`Folder "${folderName}" created successfully!`);
      setIsFolderModalOpen(false);
      setFolderName("");
      setParentFolderId("");
      setFolderIsPublic(true);
    } catch (error: any) {
      console.error("Error creating folder:", error);
      notification.error(`Failed to create folder: ${error.message}`);
    }
  };

  const handleDeleteFile = async (cid: string) => {
    try {
      const fileId = cidToBytes32(cid);
      await writeGDrive({
        functionName: "deleteFile",
        args: [fileId],
      });

      const apiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY;
      const apiSecret = process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY;

      if (apiKey && apiSecret) {
        await fetch(`https://api.pinata.cloud/pinning/unpin/${cid}`, {
          method: "DELETE",
          headers: {
            pinata_api_key: apiKey,
            pinata_secret_api_key: apiSecret,
          },
        });
      }

      notification.success("File deleted successfully.");
      fetchFiles();
    } catch (error: any) {
      console.error("Error deleting file:", error);
      notification.error(`Failed to delete file: ${error.message}`);
    }
  };

  const handleCreateShareLink = async () => {
    if (!selectedFile || !shareExpiryDays || !shareMaxAccess) return;

    try {
      const fileId = cidToBytes32(selectedFile.ipfs_pin_hash);
      const expiryDate = BigInt(Math.floor(Date.now() / 1000) + Number(shareExpiryDays) * 24 * 60 * 60);
      const maxAccess = Number(shareMaxAccess);

      const linkId = await writeGDrive({
        functionName: "createShareLink",
        args: [fileId, expiryDate, maxAccess, sharePassword],
      });

      notification.success(`Share link created! Link ID: ${linkId}`);
      setIsShareModalOpen(false);
      setSharePassword("");
      setShareExpiryDays("7");
      setShareMaxAccess("10");
    } catch (error: any) {
      console.error("Error creating share link:", error);
      notification.error(`Failed to create share link: ${error.message}`);
    }
  };

  const handleCreatePaidShareLink = async () => {
    if (!selectedFile || !paidSharePassword || !paidSharePrice || !paidShareExpiryDays || !paidShareMaxAccess) return;

    try {
      const fileId = cidToBytes32(selectedFile.ipfs_pin_hash);
      const pricePerAccess = parseEther(paidSharePrice);
      const expiryDate = BigInt(Math.floor(Date.now() / 1000) + Number(paidShareExpiryDays) * 24 * 60 * 60);
      const maxAccess = Number(paidShareMaxAccess);

      const linkId = await writeGDrive({
        functionName: "createPaidShareLink",
        args: [fileId, pricePerAccess, expiryDate, maxAccess, paidSharePassword],
      });

      notification.success(`Paid share link created! Link ID: ${linkId}`);
      setIsPaidShareModalOpen(false);
      setPaidSharePassword("");
      setPaidSharePrice("0.01");
      setPaidShareExpiryDays("7");
      setPaidShareMaxAccess("10");
    } catch (error: any) {
      console.error("Error creating paid share link:", error);
      notification.error(`Failed to create paid share link: ${error.message}`);
    }
  };

  const handleAccessShareLink = async () => {
    try {
      const cid = await writeGDrive({
        functionName: "accessFileViaLink",
        args: [accessShareLinkId as `0x${string}`, accessSharePassword],
      });

      notification.success(`File accessed! CID: ${cid}`);
      setIsAccessShareModalOpen(false);
      setAccessShareLinkId("");
      setAccessSharePassword("");
    } catch (error: any) {
      console.error("Error accessing share link:", error);
      notification.error(`Failed to access share link: ${error.message}`);
    }
  };

  const handleAccessPaidShareLink = async () => {
    try {
      const cid = await writeGDrive({
        functionName: "accessPaidShareLink",
        args: [accessPaidShareLinkId as `0x${string}`, accessPaidSharePassword],
        value: parseEther("0.01"), // Adjust based on pricePerAccess
      });

      notification.success(`Paid file accessed! CID: ${cid}`);
      setIsAccessPaidShareModalOpen(false);
      setAccessPaidShareLinkId("");
      setAccessPaidSharePassword("");
    } catch (error: any) {
      console.error("Error accessing paid share link:", error);
      notification.error(`Failed to access paid share link: ${error.message}`);
    }
  };

  const handlePurchaseSubscription = async () => {
    try {
      const duration = BigInt(Number(subscriptionDurationDays) * 24 * 60 * 60);
      if (paymentMethod === "ETH") {
        await writeGDrive({
          functionName: "purchaseSubscription",
          args: [Number(subscriptionTier), duration, referrerAddress || "0x0000000000000000000000000000000000000000"],
          value: parseEther("0.01"), // Adjust based on tier cost
        });
      } else if (paymentMethod === "Token") {
        if (!tokenAddress) throw new Error("Token address required");
        await writeGDrive({
          functionName: "purchaseSubscriptionWithToken",
          args: [
            Number(subscriptionTier),
            duration,
            referrerAddress || "0x0000000000000000000000000000000000000000",
            tokenAddress,
          ],
        });
      } else if (paymentMethod === "GDV") {
        await writeGDrive({
          functionName: "purchaseSubscriptionWithGDV",
          args: [Number(subscriptionTier), duration, referrerAddress || "0x0000000000000000000000000000000000000000"],
        });
      }

      notification.success("Subscription purchased successfully!");
      setIsSubscriptionModalOpen(false);
      setSubscriptionTier("1");
      setSubscriptionDurationDays("30");
      setReferrerAddress("");
    } catch (error: any) {
      console.error("Error purchasing subscription:", error);
      notification.error(`Failed to purchase subscription: ${error.message}`);
    }
  };

  const handleWithdrawEarnings = async () => {
    try {
      await writeGDrive({
        functionName: "withdrawEarnings",
      });

      notification.success("Earnings withdrawn successfully!");
    } catch (error: any) {
      console.error("Error withdrawing earnings:", error);
      notification.error(`Failed to withdraw earnings: ${error.message}`);
    }
  };

  const copyToClipboard = async (text: string, cid: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCid(cid);
      notification.success("Link copied to clipboard!");
      setTimeout(() => setCopiedCid(null), 2000);
    } catch (err) {
      notification.error("Failed to copy link");
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes("image")) return "🖼️";
    if (fileType.includes("video")) return "🎥";
    if (fileType.includes("audio")) return "🎵";
    if (fileType.includes("pdf")) return "📄";
    return "📁";
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  function cidToBytes32(cid: string): `0x${string}` {
    if (typeof Buffer === "undefined") {
      console.error("Buffer is not available. Cannot convert CID to bytes32.");
      return "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;
    }
    const buffer = Buffer.from(cid);
    let hex = buffer.toString("hex");
    if (hex.length > 64) {
      hex = hex.slice(0, 64);
    } else if (hex.length < 64) {
      hex = hex.padEnd(64, "0");
    }
    return `0x${hex}` as `0x${string}`;
  }

  useEffect(() => {
    if (address) {
      fetchFiles();
      const intervalId = setInterval(fetchFiles, 30000);
      return () => clearInterval(intervalId);
    }
  }, [fetchFiles, refreshTrigger, address]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-400">Loading files...</span>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 p-4 bg-red-500/10 rounded-lg">Error: {error}</div>;
  }

  return (
    <div className="space-y-6 bg-gradient-to-br from-gray-900 to-blue-900 p-6 rounded-xl">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">My Files ({files.length})</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="btn bg-gradient-to-r from-blue-600 to-blue-800 text-white border-none hover:from-blue-700 hover:to-blue-900"
          >
            Upload File
          </button>
          <button
            onClick={() => setIsFolderModalOpen(true)}
            className="btn bg-gradient-to-r from-purple-600 to-purple-800 text-white border-none hover:from-purple-700 hover:to-purple-900"
          >
            <FaFolderPlus /> Create Folder
          </button>
          <button
            onClick={() => setIsAccessShareModalOpen(true)}
            className="btn bg-gradient-to-r from-green-600 to-green-800 text-white border-none hover:from-green-700 hover:to-green-900"
          >
            Access Share Link
          </button>
          <button
            onClick={() => setIsAccessPaidShareModalOpen(true)}
            className="btn bg-gradient-to-r from-yellow-600 to-yellow-800 text-white border-none hover:from-yellow-700 hover:to-yellow-900"
          >
            Access Paid Share
          </button>
          <button
            onClick={() => setIsSubscriptionModalOpen(true)}
            className="btn bg-gradient-to-r from-teal-600 to-teal-800 text-white border-none hover:from-teal-700 hover:to-teal-900"
          >
            <FaUserPlus /> Subscription
          </button>
          <button
            onClick={handleWithdrawEarnings}
            className="btn bg-gradient-to-r from-orange-600 to-orange-800 text-white border-none hover:from-orange-700 hover:to-orange-900"
          >
            <FaWallet /> Withdraw Earnings
          </button>
        </div>
      </div>

      {files.length === 0 ? (
        <div className="text-center py-12 bg-gray-800/50 rounded-2xl border border-gray-700/30 animate-fade-in">
          <div className="text-4xl mb-4">📁</div>
          <h3 className="text-lg font-medium text-gray-300 mb-2">No files uploaded yet</h3>
          <p className="text-gray-500">Upload your first file to get started</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {files.map(file => {
            const isPublic = file.metadata?.keyvalues?.isPublic === "true";
            const fileType = file.metadata?.keyvalues?.fileType || "";

            return (
              <div
                key={file.ipfs_pin_hash}
                className="bg-gray-800/70 backdrop-blur-md p-6 rounded-2xl border border-gray-700/50 hover:border-blue-500/50 transition-all duration-300 animate-scale-up"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="text-3xl flex-shrink-0">{getFileIcon(fileType)}</div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-white truncate">{file.metadata?.name || "Unnamed File"}</h3>
                        <div className="flex items-center gap-1">
                          {isPublic ? (
                            <FaUnlock className="text-green-400 text-sm" />
                          ) : (
                            <FaLock className="text-orange-400 text-sm" />
                          )}
                          <span className="text-xs text-gray-400">{isPublic ? "Public" : "Private"}</span>
                        </div>
                      </div>

                      <div className="space-y-1 text-sm text-gray-400">
                        <p>Size: {formatFileSize(file.size)}</p>
                        <p>Uploaded: {new Date(file.date_pinned).toLocaleDateString()}</p>
                        <p className="font-mono text-xs truncate">CID: {file.ipfs_pin_hash}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    <button
                      onClick={() =>
                        copyToClipboard(
                          isPublic
                            ? `https://ipfs.io/ipfs/${file.ipfs_pin_hash}`
                            : `https://gateway.pinata.cloud/ipfs/${file.ipfs_pin_hash}`,
                          file.ipfs_pin_hash,
                        )
                      }
                      className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-600/20 rounded-lg transition-all duration-300"
                      title="Copy Link"
                    >
                      {copiedCid === file.ipfs_pin_hash ? <FaCheck /> : <FaCopy />}
                    </button>

                    <button
                      onClick={() => window.open(`https://ipfs.io/ipfs/${file.ipfs_pin_hash}`, "_blank")}
                      className="p-2 text-gray-400 hover:text-green-400 hover:bg-green-600/20 rounded-lg transition-all duration-300"
                      title="Download"
                    >
                      <FaDownload />
                    </button>

                    <button
                      onClick={() => {
                        setSelectedFile(file);
                        setIsShareModalOpen(true);
                      }}
                      className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-600/20 rounded-lg transition-all duration-300"
                      title="Share File"
                    >
                      <FaShareAlt />
                    </button>

                    <button
                      onClick={() => {
                        setSelectedFile(file);
                        setIsPaidShareModalOpen(true);
                      }}
                      className="p-2 text-gray-400 hover:text-yellow-400 hover:bg-yellow-600/20 rounded-lg transition-all duration-300"
                      title="Create Paid Share"
                    >
                      <FaDollarSign />
                    </button>

                    <button
                      onClick={() => handleDeleteFile(file.ipfs_pin_hash)}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-600/20 rounded-lg transition-all duration-300"
                      title="Delete File"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload File Modal */}
      {isUploadModalOpen && (
        <div className="modal modal-open animate-fade-in">
          <div className="modal-box bg-gray-800/90 border border-gray-700 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-200">Upload File</h3>
              <button
                className="btn btn-sm btn-circle bg-gray-700 text-gray-200"
                onClick={() => setIsUploadModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 mb-2">File</label>
                <input
                  type="file"
                  onChange={e => e.target.files && setUploadFile(e.target.files[0])}
                  className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-200"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-2">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-200"
                  placeholder="File description"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-2">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={tags.join(",")}
                  onChange={e => setTags(e.target.value.split(",").map(tag => tag.trim()))}
                  className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-200"
                  placeholder="e.g., document, work"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-2">Folder ID (Optional)</label>
                <input
                  type="text"
                  value={folderId}
                  onChange={e => setFolderId(e.target.value)}
                  className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-200"
                  placeholder="Enter folder ID"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-2">Storage Period (Days)</label>
                <input
                  type="number"
                  value={storagePeriodDays}
                  onChange={e => setStoragePeriodDays(e.target.value)}
                  className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-200"
                  min="30"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={e => setIsPublic(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded"
                  />
                  <span className="text-gray-200">Public</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isEncrypted}
                    onChange={e => setIsEncrypted(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded"
                  />
                  <span className="text-gray-200">Encrypted</span>
                </label>
              </div>
              <div>
                <label className="block text-gray-400 mb-2">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as "ETH" | "Token" | "GDV")}
                  className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-200"
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
                    onChange={e => setTokenAddress(e.target.value)}
                    className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-200"
                    placeholder="Enter token address"
                  />
                </div>
              )}
              <button
                className="btn w-full bg-gradient-to-r from-blue-600 to-blue-800 text-white border-none hover:from-blue-700 hover:to-blue-900"
                onClick={handleUploadFile}
                disabled={loading}
              >
                {loading ? "Uploading..." : "Upload"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Folder Modal */}
      {isFolderModalOpen && (
        <div className="modal modal-open animate-fade-in">
          <div className="modal-box bg-gray-800/90 border border-gray-700 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-200">Create Folder</h3>
              <button
                className="btn btn-sm btn-circle bg-gray-700 text-gray-200"
                onClick={() => setIsFolderModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 mb-2">Folder Name</label>
                <input
                  type="text"
                  value={folderName}
                  onChange={e => setFolderName(e.target.value)}
                  className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-200"
                  placeholder="Enter folder name"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-2">Parent Folder ID (Optional)</label>
                <input
                  type="text"
                  value={parentFolderId}
                  onChange={e => setParentFolderId(e.target.value)}
                  className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-200"
                  placeholder="Enter parent folder ID"
                />
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={folderIsPublic}
                  onChange={e => setFolderIsPublic(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded"
                />
                <span className="text-gray-200">Public</span>
              </label>
              <button
                className="btn w-full bg-gradient-to-r from-purple-600 to-purple-800 text-white border-none hover:from-purple-700 hover:to-purple-900"
                onClick={handleCreateFolder}
              >
                Create Folder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Link Modal */}
      {isShareModalOpen && (
        <div className="modal modal-open animate-fade-in">
          <div className="modal-box bg-gray-800/90 border border-gray-700 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-200">Create Share Link</h3>
              <button
                className="btn btn-sm btn-circle bg-gray-700 text-gray-200"
                onClick={() => setIsShareModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 mb-2">Password (Optional)</label>
                <input
                  type="text"
                  value={sharePassword}
                  onChange={e => setSharePassword(e.target.value)}
                  className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-200"
                  placeholder="Enter password for access (optional)"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-2">Expiry (Days)</label>
                <input
                  type="number"
                  value={shareExpiryDays}
                  onChange={e => setShareExpiryDays(e.target.value)}
                  className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-200"
                  placeholder="Enter expiry in days"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-2">Max Access Count</label>
                <input
                  type="number"
                  value={shareMaxAccess}
                  onChange={e => setShareMaxAccess(e.target.value)}
                  className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-200"
                  placeholder="Enter max access count"
                  min="1"
                />
              </div>
              <button
                className="btn w-full bg-gradient-to-r from-blue-600 to-blue-800 text-white border-none hover:from-blue-700 hover:to-blue-900"
                onClick={handleCreateShareLink}
              >
                Create Share Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Paid Share Modal */}
      {isPaidShareModalOpen && (
        <div className="modal modal-open animate-fade-in">
          <div className="modal-box bg-gray-800/90 border border-gray-700 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-200">Create Paid Share Link</h3>
              <button
                className="btn btn-sm btn-circle bg-gray-700 text-gray-200"
                onClick={() => setIsPaidShareModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 mb-2">Password</label>
                <input
                  type="text"
                  value={paidSharePassword}
                  onChange={e => setPaidSharePassword(e.target.value)}
                  className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-200"
                  placeholder="Enter password for access"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-2">Price per Access (ETH)</label>
                <input
                  type="number"
                  value={paidSharePrice}
                  onChange={e => setPaidSharePrice(e.target.value)}
                  className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-200"
                  placeholder="Enter price in ETH"
                  step="0.01"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-2">Expiry (Days)</label>
                <input
                  type="number"
                  value={paidShareExpiryDays}
                  onChange={e => setPaidShareExpiryDays(e.target.value)}
                  className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-200"
                  placeholder="Enter expiry in days"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-2">Max Access Count</label>
                <input
                  type="number"
                  value={paidShareMaxAccess}
                  onChange={e => setPaidShareMaxAccess(e.target.value)}
                  className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-200"
                  placeholder="Enter max access count"
                  min="1"
                />
              </div>
              <button
                className="btn w-full bg-gradient-to-r from-blue-600 to-blue-800 text-white border-none hover:from-blue-700 hover:to-blue-900"
                onClick={handleCreatePaidShareLink}
              >
                Create Paid Share Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Access Share Link Modal */}
      {isAccessShareModalOpen && (
        <div className="modal modal-open animate-fade-in">
          <div className="modal-box bg-gray-800/90 border border-gray-700 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-200">Access Share Link</h3>
              <button
                className="btn btn-sm btn-circle bg-gray-700 text-gray-200"
                onClick={() => setIsAccessShareModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 mb-2">Share Link ID</label>
                <input
                  type="text"
                  value={accessShareLinkId}
                  onChange={e => setAccessShareLinkId(e.target.value)}
                  className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-200"
                  placeholder="Enter share link ID"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-2">Password</label>
                <input
                  type="text"
                  value={accessSharePassword}
                  onChange={e => setAccessSharePassword(e.target.value)}
                  className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-200"
                  placeholder="Enter password"
                />
              </div>
              <button
                className="btn w-full bg-gradient-to-r from-green-600 to-green-800 text-white border-none hover:from-green-700 hover:to-green-900"
                onClick={handleAccessShareLink}
              >
                Access File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Access Paid Share Link Modal */}
      {isAccessPaidShareModalOpen && (
        <div className="modal modal-open animate-fade-in">
          <div className="modal-box bg-gray-800/90 border border-gray-700 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-200">Access Paid Share Link</h3>
              <button
                className="btn btn-sm btn-circle bg-gray-700 text-gray-200"
                onClick={() => setIsAccessPaidShareModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 mb-2">Paid Share Link ID</label>
                <input
                  type="text"
                  value={accessPaidShareLinkId}
                  onChange={e => setAccessPaidShareLinkId(e.target.value)}
                  className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-200"
                  placeholder="Enter paid share link ID"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-2">Password</label>
                <input
                  type="text"
                  value={accessPaidSharePassword}
                  onChange={e => setAccessPaidSharePassword(e.target.value)}
                  className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-200"
                  placeholder="Enter password"
                />
              </div>
              <button
                className="btn w-full bg-gradient-to-r from-yellow-600 to-yellow-800 text-white border-none hover:from-yellow-700 hover:to-yellow-900"
                onClick={handleAccessPaidShareLink}
              >
                Access Paid File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Modal */}
      {isSubscriptionModalOpen && (
        <div className="modal modal-open animate-fade-in">
          <div className="modal-box bg-gray-800/90 border border-gray-700 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-200">Purchase Subscription</h3>
              <button
                className="btn btn-sm btn-circle bg-gray-700 text-gray-200"
                onClick={() => setIsSubscriptionModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 mb-2">Tier (0-3)</label>
                <input
                  type="number"
                  value={subscriptionTier}
                  onChange={e => setSubscriptionTier(e.target.value)}
                  className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-200"
                  placeholder="Enter tier (0-3)"
                  min="0"
                  max="3"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-2">Duration (Days)</label>
                <input
                  type="number"
                  value={subscriptionDurationDays}
                  onChange={e => setSubscriptionDurationDays(e.target.value)}
                  className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-200"
                  placeholder="Enter duration in days"
                  min="30"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-2">Referrer Address (Optional)</label>
                <input
                  type="text"
                  value={referrerAddress}
                  onChange={e => setReferrerAddress(e.target.value)}
                  className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-200"
                  placeholder="Enter referrer address"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-2">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as "ETH" | "Token" | "GDV")}
                  className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-200"
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
                    onChange={e => setTokenAddress(e.target.value)}
                    className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-200"
                    placeholder="Enter token address"
                  />
                </div>
              )}
              <button
                className="btn w-full bg-gradient-to-r from-teal-600 to-teal-800 text-white border-none hover:from-teal-700 hover:to-teal-900"
                onClick={handlePurchaseSubscription}
              >
                Purchase Subscription
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GDriveManager;
