import { useState } from "react";
import { parseEther } from "viem";
import { Address } from "viem";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth/useScaffoldWriteContract";
import { notification } from "~~/utils/scaffold-eth";

const PaidShareLinkModal = ({ fileId, onClose }: { fileId: Address; onClose: () => void }) => {
  const [price, setPrice] = useState("0.01");
  const [expiryDays, setExpiryDays] = useState(30);
  const [maxAccess, setMaxAccess] = useState(0);
  const [password, setPassword] = useState("");
  const { writeContractAsync } = useScaffoldWriteContract({ contractName: "GDrive" });

  const handleCreate = async () => {
    try {
      const expiryDate = Math.floor(Date.now() / 1000) + expiryDays * 24 * 60 * 60;
      await writeContractAsync({
        functionName: "createPaidShareLink",
        args: [fileId as `0x${string}`, parseEther(price), BigInt(expiryDate), maxAccess, password],
      });
      notification.success("Paid share link created!");
      onClose();
    } catch (error) {
      notification.error("Failed to create share link");
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="text-lg font-bold">Create Paid Share Link</h3>
        <input
          type="number"
          placeholder="Price (ETH)"
          className="input input-bordered w-full mt-4"
          value={price}
          onChange={e => setPrice(e.target.value)}
        />
        <input
          type="number"
          placeholder="Expiry (days)"
          className="input input-bordered w-full mt-4"
          value={expiryDays}
          onChange={e => setExpiryDays(Number(e.target.value))}
        />
        <input
          type="number"
          placeholder="Max Access"
          className="input input-bordered w-full mt-4"
          value={maxAccess}
          onChange={e => setMaxAccess(Number(e.target.value))}
        />
        <input
          type="text"
          placeholder="Password"
          className="input input-bordered w-full mt-4"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        <button className="btn btn-primary w-full mt-4" onClick={handleCreate}>
          Create
        </button>
      </div>
    </div>
  );
};

export default PaidShareLinkModal;
