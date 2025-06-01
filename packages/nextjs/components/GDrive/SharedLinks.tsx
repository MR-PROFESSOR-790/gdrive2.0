import React from "react";
import { Address } from "viem";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

// Import Address type

// Define the type for ShareLink data based on contract ABI
interface ShareLinkData {
  linkId: `0x${string}`;
  fileId: `0x${string}`;
  creator: Address;
  expiryDate: bigint; // uint64 maps to bigint in viem
  accessCount: number; // uint32 maps to number
  maxAccess: number; // uint32 maps to number
  isActive: boolean;
  isPaid: boolean; // Assuming this property exists for differentiation, adjust if needed
}

const SharedLinks = () => {
  // Note: The args for shareLinks function might need adjustment based on the actual contract implementation
  // For now, using a placeholder array as there is no contract function to list all share links.
  const shareLinks: ShareLinkData[] = [
    // Placeholder data (replace with actual contract call result when available)
    // Example placeholder:
    // {
    //   linkId: "0x123..." as `0x${string}`,
    //   fileId: "0xabc..." as `0x${string}`,
    //   creator: "0xdef..." as Address,
    //   expiryDate: BigInt(Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60), // 7 days from now
    //   accessCount: 5,
    //   maxAccess: 10,
    //   isActive: true,
    //   isPaid: false,
    // },
  ];

  // Uncomment and adjust this when a contract function to list share links is available
  // const { data: fetchedShareLinks } = useScaffoldReadContract({
  //   contractName: "GDrive",
  //   functionName: "getUserShareLinks", // Replace with actual function name
  //   args: [address], // Adjust args as needed
  //   watch: true,
  // });

  // useEffect(() => {
  //   if (fetchedShareLinks) {
  //     setShareLinks(fetchedShareLinks as ShareLinkData[]); // Assuming the fetched data matches the type
  //   }
  // }, [fetchedShareLinks]);

  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-2xl font-bold">Shared Links</h2>
      <table className="table w-full">
        <thead>
          <tr>
            <th>Link ID</th> {/* Changed from File ID to Link ID */}
            <th>File ID</th>
            <th>Creator</th> {/* Added Creator */}
            <th>Type</th>
            <th>Expiry</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {shareLinks?.map(link => (
            <tr key={link.linkId}>
              <td>{link.linkId.substring(0, 6)}...</td> {/* Display truncated Link ID */}
              <td>{link.fileId.substring(0, 6)}...</td> {/* Display truncated File ID */}
              <td>{link.creator}</td> {/* Display Creator */}
              <td>{link.isPaid ? "Paid" : "Free"}</td>
              <td>{link.expiryDate ? new Date(Number(link.expiryDate) * 1000).toLocaleDateString() : "N/A"}</td>
              <td>
                {link.isActive ? (
                  <button className="btn btn-sm btn-error">Deactivate</button>
                ) : (
                  <span className="text-sm text-gray-500">Inactive</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {shareLinks?.length === 0 && <div className="text-center">No shared links found.</div>}
    </div>
  );
};

export default SharedLinks;
