import { put, del, list } from '@vercel/blob';
import { v4 as uuidv4 } from 'uuid';
import type { Model, StorageInfo } from '@/types';

const STORAGE_LIMIT = 1_000_000_000; // 1GB in bytes
const METADATA_PREFIX = 'metadata/';
const MODELS_PREFIX = 'models/';

// In-memory cache for metadata (Vercel Blob doesn't have native metadata)
// In production, you'd use a database like Vercel KV or Postgres
let modelsCache: Model[] | null = null;

async function loadMetadata(): Promise<Model[]> {
  if (modelsCache) return modelsCache;
  
  try {
    const { blobs } = await list({ prefix: METADATA_PREFIX });
    const models: Model[] = [];
    
    for (const blob of blobs) {
      try {
        const response = await fetch(blob.url);
        const metadata = await response.json();
        models.push(metadata);
      } catch (e) {
        console.error(`Failed to load metadata for ${blob.pathname}`, e);
      }
    }
    
    modelsCache = models.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    return modelsCache;
  } catch (e) {
    console.error('Failed to load metadata', e);
    return [];
  }
}

function invalidateCache() {
  modelsCache = null;
}

export async function getModels(): Promise<Model[]> {
  return loadMetadata();
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
  const model = await getModel(id);
  if (!model) return false;
  
  try {
    // Delete the model file
    await del(model.fileUrl);
    
    // Delete the metadata
    await del(`${METADATA_PREFIX}${id}.json`);
    
    invalidateCache();
    return true;
  } catch (e) {
    console.error(`Failed to delete model ${id}`, e);
    return false;
  }
}

async function freeSpace(requiredBytes: number): Promise<void> {
  const models = await loadMetadata();
  let totalSize = models.reduce((sum, m) => sum + m.size, 0);
  
  // Delete oldest models until we have enough space
  for (const model of models) {
    if (totalSize + requiredBytes <= STORAGE_LIMIT) break;
    
    console.log(`Deleting oldest model to free space: ${model.name} (${model.size} bytes)`);
    await deleteModel(model.id);
    totalSize -= model.size;
  }
  
  // Reload cache after deletions
  invalidateCache();
}

export async function uploadModel(file: File, name: string): Promise<Model> {
  const fileSize = file.size;
  
  // Check if file itself is too large
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
  
  // Create metadata
  const model: Model = {
    id,
    name,
    fileName,
    fileUrl: modelBlob.url,
    size: fileSize,
    createdAt: new Date().toISOString(),
    viewUrl: `/view/${id}`,
  };
  
  // Save metadata as JSON blob
  const metadataBlob = new Blob([JSON.stringify(model)], { type: 'application/json' });
  await put(`${METADATA_PREFIX}${id}.json`, metadataBlob, {
    access: 'public',
    contentType: 'application/json',
  });
  
  invalidateCache();
  return model;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
