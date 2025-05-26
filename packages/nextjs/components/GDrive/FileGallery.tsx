import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three-stdlib";
import { useAccount } from "wagmi";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

interface FileData {
  id: `0x${string}`;
  name: string;
  type: string;
  size: number;
  uploadDate: number;
  isPublic: boolean;
  cid: string;
  description: string;
  downloadCount: number;
  version: number;
}

export const FileGallery = () => {
  const { address } = useAccount();
  const [files, setFiles] = useState<FileData[]>([]);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  const { data: userFiles } = useScaffoldReadContract({
    contractName: "GDrive",
    functionName: "userFiles",
    args: [address as `0x${string}`, 0n],
  });

  useEffect(() => {
    const fetchUserFiles = async () => {
      if (!address) return;

      // Get array length by trying to access indices until we get null
      let index = 0;
      const fileIds: `0x${string}`[] = [];

      while (true) {
        const { data: fileId } = await useScaffoldReadContract({
          contractName: "GDrive",
          functionName: "userFiles",
          args: [address as `0x${string}`, BigInt(index)],
        });

        if (!fileId) break;
        fileIds.push(fileId as `0x${string}`);
        index++;
      }

      console.log("User files:", fileIds);

      // Fetch file details for each ID
      const fetchFileDetails = async () => {
        const fileDetails = await Promise.all(
          fileIds.map(async id => {
            const { data: details } = await useScaffoldReadContract({
              contractName: "GDrive",
              functionName: "getFileDetails",
              args: [id],
            });

            if (details) {
              const [
                name,
                fileType,
                cid,
                size,
                uploadDate,
                isEncrypted,
                owner,
                description,
                expiryDate,
                downloadCount,
                version,
              ] = details as [string, string, string, bigint, bigint, boolean, string, string, bigint, number, number];

              return {
                id,
                name,
                type: fileType,
                size: Number(size),
                uploadDate: Number(uploadDate),
                isPublic: true, // TODO: Get from contract
                cid,
                description,
                downloadCount: Number(downloadCount),
                version: Number(version),
              } as FileData;
            }
            return null;
          }),
        );

        setFiles(fileDetails.filter((file): file is FileData => file !== null));
      };

      fetchFileDetails();
    };

    fetchUserFiles();
  }, [address]);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    // Create scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Create camera
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000,
    );
    camera.position.z = 5;

    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Add controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      containerRef.current?.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  // Update 3D objects when files change
  useEffect(() => {
    if (!sceneRef.current) return;

    // Clear existing objects
    while (sceneRef.current.children.length > 0) {
      const object = sceneRef.current.children[0];
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach(material => material.dispose());
        } else {
          object.material.dispose();
        }
      }
      sceneRef.current.remove(object);
    }

    // Add lights back
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    sceneRef.current.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(5, 5, 5);
    sceneRef.current.add(pointLight);

    // Create 3D objects for each file
    const filteredFiles = files.filter(file => {
      if (filter === "public" && !file.isPublic) return false;
      if (filter === "private" && file.isPublic) return false;
      if (searchQuery && !file.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });

    const gridSize = Math.ceil(Math.sqrt(filteredFiles.length));
    const spacing = 2;

    filteredFiles.forEach((file, index) => {
      const row = Math.floor(index / gridSize);
      const col = index % gridSize;

      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshPhongMaterial({
        color: file.isPublic ? 0x4caf50 : 0x2196f3,
        transparent: true,
        opacity: 0.8,
      });

      const cube = new THREE.Mesh(geometry, material);
      cube.position.x = (col - gridSize / 2) * spacing;
      cube.position.y = (row - gridSize / 2) * spacing;
      cube.userData = file;

      sceneRef.current?.add(cube);
    });
  }, [files, filter, searchQuery]);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">File Gallery</h2>
        <div className="flex gap-4">
          <select value={filter} onChange={e => setFilter(e.target.value)} className="select select-bordered">
            <option value="all">All Files</option>
            <option value="public">Public Files</option>
            <option value="private">Private Files</option>
          </select>
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="input input-bordered"
          />
        </div>
      </div>
      <div ref={containerRef} className="w-full h-[600px] bg-base-200 rounded-lg overflow-hidden" />
    </div>
  );
};
