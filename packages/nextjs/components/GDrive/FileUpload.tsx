import { useState } from "react";
import { parseEther } from "viem";
import { useAccount } from "wagmi";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth/useScaffoldWriteContract";
import { notification } from "~~/utils/scaffold-eth";

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

  const handleUpload = async () => {
    if (!file || !address) return;

    try {
      setUploading(true);

      // Generate a unique CID for the file
      const fileCid = `Qm${Math.random().toString(36).substring(7)}`;

      const uploadParams: UploadParams = {
        name: file.name,
        fileType: file.type,
        cid: fileCid,
        size: file.size,
        description: "",
        isEncrypted: false,
        isPublic: true,
        tags: [],
        folderId: "0x0000000000000000000000000000000000000000000000000000000000000000",
        storagePeriod: 30 * 24 * 60 * 60, // 30 days in seconds
      };

      const encodedParams = encodeParams(uploadParams);
      const storageCost = calculateStorageCost(file.size, uploadParams.storagePeriod);

      await uploadFile({
        functionName: "uploadFile",
        args: [encodedParams],
        value: parseEther(storageCost),
      });

      notification.success("File uploaded successfully!");
    } catch (error) {
      console.error("Upload error:", error);
      notification.error("Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const encodeParams = (uploadParams: UploadParams): `0x${string}` => {
    const encodedData = JSON.stringify(uploadParams);
    return `0x${Buffer.from(encodedData).toString("hex")}` as `0x${string}`;
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
