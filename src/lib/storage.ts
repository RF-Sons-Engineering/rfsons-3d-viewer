import { put, del, list } from '@vercel/blob';
import { v4 as uuidv4 } from 'uuid';
import type { Model, StorageInfo } from '@/types';

const STORAGE_LIMIT = 1_000_000_000; // 1GB in bytes
const MODELS_PREFIX = 'models/';
const METADATA_FILE = 'metadata.json';

interface MetadataStore {
  models: Model[];
  updatedAt: string;
}

async function getMetadataUrl(): Promise<string | null> {
  try {
    const { blobs } = await list({ prefix: METADATA_FILE.split('.')[0] });
    const metadataBlob = blobs.find(b => b.pathname === METADATA_FILE || b.pathname.startsWith('metadata'));
    return metadataBlob?.url || null;
  } catch (e) {
    console.error('Failed to list blobs:', e);
    return null;
  }
}

async function loadMetadata(): Promise<Model[]> {
  try {
    const url = await getMetadataUrl();
    if (!url) {
      console.log('No metadata file found, starting fresh');
      return [];
    }
    
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      console.log('Failed to fetch metadata:', response.status);
      return [];
    }
    
    const data: MetadataStore = await response.json();
    return data.models || [];
  } catch (e) {
    console.log('Failed to load metadata:', e);
    return [];
  }
}

async function saveMetadata(models: Model[]): Promise<void> {
  // Delete old metadata file first
  const oldUrl = await getMetadataUrl();
  if (oldUrl) {
    try {
      await del(oldUrl);
    } catch (e) {
      console.log('Failed to delete old metadata:', e);
    }
  }
  
  const store: MetadataStore = {
    models,
    updatedAt: new Date().toISOString(),
  };
  
  await put(METADATA_FILE, JSON.stringify(store, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
  });
}

export async function getModels(): Promise<Model[]> {
  const models = await loadMetadata();
  // Sort by createdAt (oldest first for FIFO deletion)
  return models.sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

export async function getModel(id: string): Promise<Model | null> {
  const models = await loadMetadata();
  return models.find(m => m.id === id) || null;
}

export async function getStorageInfo(): Promise<StorageInfo> {
  const models = await loadMetadata();
  const used = models.reduce((sum, m) => sum + m.size, 0);
  
  return {
    used,
    limit: STORAGE_LIMIT,
    available: STORAGE_LIMIT - used,
    modelCount: models.length,
  };
}

export async function deleteModel(id: string): Promise<boolean> {
  const models = await loadMetadata();
  const model = models.find(m => m.id === id);
  if (!model) return false;
  
  try {
    // Delete the model file
    await del(model.fileUrl);
    
    // Update metadata
    const updatedModels = models.filter(m => m.id !== id);
    await saveMetadata(updatedModels);
    
    return true;
  } catch (e) {
    console.error(`Failed to delete model ${id}`, e);
    return false;
  }
}

async function freeSpace(requiredBytes: number): Promise<void> {
  let models = await loadMetadata();
  let totalSize = models.reduce((sum, m) => sum + m.size, 0);
  
  // Sort by oldest first
  models.sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  
  const toDelete: string[] = [];
  
  for (const model of models) {
    if (totalSize + requiredBytes <= STORAGE_LIMIT) break;
    
    console.log(`Marking for deletion: ${model.name} (${model.size} bytes)`);
    toDelete.push(model.id);
    totalSize -= model.size;
  }
  
  // Delete models
  for (const id of toDelete) {
    await deleteModel(id);
  }
}

export async function uploadModel(file: File, name: string): Promise<Model> {
  const fileSize = file.size;
  
  if (fileSize > STORAGE_LIMIT) {
    throw new Error(`File too large. Maximum size is ${STORAGE_LIMIT / 1_000_000}MB`);
  }
  
  // Free space if needed
  const storageInfo = await getStorageInfo();
  if (storageInfo.available < fileSize) {
    await freeSpace(fileSize);
  }
  
  // Generate unique ID
  const id = uuidv4();
  const extension = file.name.split('.').pop()?.toLowerCase() || 'glb';
  const fileName = `${id}.${extension}`;
  
  // Upload the model file
  const modelBlob = await put(`${MODELS_PREFIX}${fileName}`, file, {
    access: 'public',
    contentType: file.type || 'application/octet-stream',
  });
  
  // Create model entry
  const model: Model = {
    id,
    name,
    fileName,
    fileUrl: modelBlob.url,
    size: fileSize,
    createdAt: new Date().toISOString(),
    viewUrl: `/view/${id}`,
  };
  
  // Update metadata
  const models = await loadMetadata();
  models.push(model);
  await saveMetadata(models);
  
  return model;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
