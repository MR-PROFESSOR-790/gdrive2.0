export interface PinataFile {
    ipfs_pin_hash: string;
    size: number;
    date_pinned: string;
    metadata?: {
      name?: string;
      keyvalues?: {
        isPublic?: string;
        uploadedBy?: string;
        originalSize?: string;
        fileType?: string;
      };
    };
  }