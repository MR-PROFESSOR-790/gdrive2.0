export interface PinataFile {
    ipfs_pin_hash: string;
    metadata?: {
      name?: string;
      keyvalues?: {
        isPublic?: string;
        uploadedBy?: string;
        originalSize?: string;
        fileType?: string;
      };
    };
    date_pinned: string;
    size: number;
  }