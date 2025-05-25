import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth/useScaffoldReadContract";
import { notification } from "~~/utils/scaffold-eth";

interface File {
  name: string;
  fileType: string;
  cid: string;
  size: number;
  uploadDate: number;
  isEncrypted: boolean;
  owner: string;
  description: string;
  expiryDate: number;
  downloadCount: number;
  version: number;
}

export const FileList = () => {
  const [files, setFiles] = useState<File[]>([]);
  const { address } = useAccount();

  const { data: userStats } = useScaffoldReadContract({
    contractName: "GDrive",
    functionName: "getUserStats",
    args: [address],
  });

  useEffect(() => {
    const fetchFiles = async () => {
      if (!address) return;

      try {
        // TODO: Replace this mock with real contract call to get user files
        const mockFiles: File[] = [
          {
            name: "Example File",
            fileType: "application/pdf",
            cid: "QmExampleCID",
            size: 1024 * 1024,
            uploadDate: Date.now() / 1000,
            isEncrypted: false,
            owner: address,
            description: "This is an example file.",
            expiryDate: Date.now() / 1000 + 30 * 24 * 60 * 60,
            downloadCount: 0,
            version: 1,
          },
        ];
        setFiles(mockFiles);
      } catch (error) {
        console.error("Error fetching files:", error);
        notification.error("Failed to fetch files");
      }
    };

    fetchFiles();
  }, [address]);

  const handleDownload = async (fileCid: string) => {
    if (!fileCid) {
      notification.error("Invalid file ID");
      return;
    }

    try {
      const downloadUrl = `https://ipfs.io/ipfs/${fileCid}`;
      window.open(downloadUrl, "_blank");
      notification.success("Download started!");
    } catch (error) {
      console.error("Download error:", error);
      notification.error("Failed to download file");
    }
  };

  const handleShare = async (fileCid: string) => {
    if (!fileCid) {
      notification.error("Invalid file ID");
      return;
    }

    try {
      const shareLink = `${window.location.origin}/share/${fileCid}`;
      await navigator.clipboard.writeText(shareLink);
      notification.success("Share link copied to clipboard!");
    } catch (error) {
      console.error("Share error:", error);
      notification.error("Failed to create share link");
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-base-200 rounded-lg">
      <h2 className="text-xl font-bold">Your Files</h2>
      {userStats && (
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">Storage Used</div>
            <div className="stat-value">{Number(userStats[0]) / (1024 * 1024 * 1024)} GB</div>
            <div className="stat-desc">of {Number(userStats[1]) / (1024 * 1024 * 1024)} GB</div>
          </div>
          <div className="stat">
            <div className="stat-title">Bandwidth Used</div>
            <div className="stat-value">{Number(userStats[2]) / (1024 * 1024 * 1024)} GB</div>
            <div className="stat-desc">of {Number(userStats[3]) / (1024 * 1024 * 1024)} GB</div>
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="table w-full">
          <thead>
            <tr>
              <th>Name</th>
              <th>Size</th>
              <th>Type</th>
              <th>Upload Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {files.map((file, index) => (
              <tr key={index}>
                <td>{file.name}</td>
                <td>{(file.size / 1024 / 1024).toFixed(2)} MB</td>
                <td>{file.fileType}</td>
                <td>{new Date(file.uploadDate * 1000).toLocaleDateString()}</td>
                <td>
                  <div className="flex gap-2">
                    <button className="btn btn-sm btn-primary" onClick={() => handleDownload(file.cid)}>
                      Download
                    </button>
                    <button className="btn btn-sm btn-secondary" onClick={() => handleShare(file.cid)}>
                      Share
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
