import React, { useEffect, useState } from "react";

interface PinataFile {
  ipfs_pin_hash: string;
  metadata?: { name?: string };
  // Add other relevant fields from Pinata API response if needed
}

const PinataFileList: React.FC = () => {
  const [files, setFiles] = useState<PinataFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = async () => {
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
      setFiles(data.rows);
    } catch (err: any) {
      setError(`Failed to fetch files: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();

    // Poll for new files every 30 seconds
    const intervalId = setInterval(fetchFiles, 30000);

    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  if (loading) {
    return <div>Loading files...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  if (files.length === 0) {
    return <div>No files found on Pinata.</div>;
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Pinned Files</h2>
      <ul>
        {files.map(file => (
          <li key={file.ipfs_pin_hash} className="mb-2">
            <strong>Name:</strong> {file.metadata?.name || "N/A"}
            <br />
            <strong>CID:</strong> {file.ipfs_pin_hash}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PinataFileList;
