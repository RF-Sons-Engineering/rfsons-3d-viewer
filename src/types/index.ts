export interface Model {
  id: string;
  name: string;
  fileName: string;
  fileUrl: string;
  size: number;
  createdAt: string;
  viewUrl: string;
}

export interface StorageInfo {
  used: number;
  limit: number;
  available: number;
  modelCount: number;
}

export interface UploadResponse {
  id: string;
  url: string;
  viewUrl: string;
}
