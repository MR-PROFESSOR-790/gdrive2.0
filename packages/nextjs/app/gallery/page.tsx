import { FileGallery } from "~~/components/GDrive/FileGallery";

export default function GalleryPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-4xl font-bold mb-8 text-center">My Files Gallery</h1>
      <FileGallery />
    </div>
  );
}
