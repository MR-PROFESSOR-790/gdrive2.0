import { useEffect, useState } from "react";
import { useScaffoldReadContract } from "./useScaffoldReadContract";
import type { Address } from "viem";
import { ContractFunctionExecutionError } from "viem";

type FileId = `0x${string}`;

interface FileData {
  fileIds: FileId[];
  isLoading: boolean;
  error: string | null;
}

const useUserFiles = (userAddress?: Address): FileData => {
  const [fileIds, setFileIds] = useState<FileId[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [finishedFetchingIds, setFinishedFetchingIds] = useState<boolean>(false);

  const {
    data: fileId,
    isLoading: isLoadingId,
    error: errorLoadingId,
  } = useScaffoldReadContract({
    contractName: "GDrive",
    functionName: "userFiles",
    args: userAddress && !finishedFetchingIds ? [userAddress, BigInt(currentIndex)] : undefined,
  });

  useEffect(() => {
    if (!userAddress || finishedFetchingIds || isLoadingId || currentIndex < 0) return;

    if (errorLoadingId) {
      if (errorLoadingId instanceof ContractFunctionExecutionError) {
        console.log(`Contract reverted while fetching file ID at index ${currentIndex}. Assuming end of files.`);
        setFinishedFetchingIds(true);
        if (fileIds.length === 0) setIsLoading(false);
      } else {
        console.error("Error fetching file IDs:", errorLoadingId);
        setError(
          typeof errorLoadingId === "string"
            ? errorLoadingId
            : (errorLoadingId as Error).message || "Unknown error fetching file IDs",
        );
        setFinishedFetchingIds(true);
        setIsLoading(false);
      }
      return;
    }

    if (fileId !== undefined && fileId !== null) {
      const newId = fileId as FileId;
      setFileIds(prevIds => {
        if (prevIds.includes(newId)) return prevIds;
        return [...prevIds, newId];
      });
      setCurrentIndex(prev => prev + 1);
    } else {
      console.log(`Received null or undefined for file ID at index ${currentIndex}. Assuming end of files.`);
      setFinishedFetchingIds(true);
      if (fileIds.length === 0) setIsLoading(false);
    }
  }, [fileId, isLoadingId, errorLoadingId, currentIndex, userAddress, finishedFetchingIds, fileIds.length]);

  useEffect(() => {
    setIsLoading(!finishedFetchingIds && isLoadingId);
  }, [isLoadingId, finishedFetchingIds]);

  useEffect(() => {
    if (userAddress) {
      setFileIds([]);
      setIsLoading(true);
      setError(null);
      setCurrentIndex(0);
      setFinishedFetchingIds(false);
    }
  }, [userAddress]);

  return { fileIds, isLoading, error };
};

export default useUserFiles;
