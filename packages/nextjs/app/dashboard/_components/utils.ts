import { parseEther } from "viem";
import { notification } from "~~/utils/scaffold-eth";

export const fetchFiles = async (uploadedBy?: string): Promise<PinataFile[]> => {
  const apiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY;
  const apiSecret = process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY;

  if (!apiKey || !apiSecret) {
    throw new Error("Pinata API key or secret not configured in environment variables.");
  }

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
  return uploadedBy ? data.rows.filter((file: PinataFile) => file.metadata?.keyvalues?.uploadedBy === uploadedBy) : data.rows;
};

export const cidToBytes32 = (cid: string): `0x${string}` => {
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
};

export const getFileIcon = (fileType: string) => {
  if (fileType.includes("image")) return "🖼️";
  if (fileType.includes("video")) return "🎥";
  if (fileType.includes("audio")) return "🎵";
  if (fileType.includes("pdf")) return "📄";
  return "📁";
};

export const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export const copyToClipboard = async (text: string, cid: string, setCopiedCid: (cid: string | null) => void) => {
  try {
    await navigator.clipboard.writeText(text);
    setCopiedCid(cid);
    notification.success("Link copied to clipboard!");
    setTimeout(() => setCopiedCid(null), 2000);
  } catch (err) {
    notification.error("Failed to copy link");
  }
};