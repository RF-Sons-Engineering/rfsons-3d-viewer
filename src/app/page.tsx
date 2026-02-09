'use client';

import { useState, useEffect } from 'react';
import { formatBytes } from '@/lib/storage';

interface Model {
  id: string;
  name: string;
  size: number;
  createdAt: string;
  viewUrl: string;
}

interface StorageInfo {
  used: number;
  limit: number;
  available: number;
  modelCount: number;
}

export default function Home() {
  const [models, setModels] = useState<Model[]>([]);
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const loadModels = async () => {
    try {
      const res = await fetch('/api/models');
      const data = await res.json();
      setModels(data.models || []);
      setStorage(data.storage);
    } catch (e) {
      console.error('Failed to load models', e);
    }
  };

  useEffect(() => {
    loadModels();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', name || file.name);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setFile(null);
      setName('');
      loadModels();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this model?')) return;

    try {
      await fetch(`/api/model/${id}`, { method: 'DELETE' });
      loadModels();
    } catch (e) {
      console.error('Failed to delete', e);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 40 }}>
      <h1 style={{ marginBottom: 8, fontSize: 28 }}>RF Sons 3D Viewer</h1>
      <p style={{ color: '#888', marginBottom: 32 }}>
        Upload and share 3D models (GLB, STL, OBJ)
      </p>

      {/* Storage Info */}
      {storage && (
        <div style={{
          background: '#1a1a1a',
          padding: 16,
          borderRadius: 8,
          marginBottom: 24,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span>Storage</span>
            <span>{formatBytes(storage.used)} / {formatBytes(storage.limit)}</span>
          </div>
          <div style={{
            height: 8,
            background: '#333',
            borderRadius: 4,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${(storage.used / storage.limit) * 100}%`,
              background: storage.used / storage.limit > 0.9 ? '#ef4444' : '#3b82f6',
              transition: 'width 0.3s',
            }} />
          </div>
          <p style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
            {storage.modelCount} models • Oldest deleted when full
          </p>
        </div>
      )}

      {/* Upload Form */}
      <form onSubmit={handleUpload} style={{ marginBottom: 40 }}>
        <div style={{ marginBottom: 16 }}>
          <input
            type="text"
            placeholder="Model name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              width: '100%',
              padding: 12,
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: 8,
              color: 'white',
              fontSize: 14,
            }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <input
            type="file"
            accept=".glb,.gltf,.stl,.obj"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            style={{
              width: '100%',
              padding: 12,
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: 8,
              color: 'white',
            }}
          />
        </div>
        {error && (
          <p style={{ color: '#ef4444', marginBottom: 16 }}>{error}</p>
        )}
        <button
          type="submit"
          disabled={!file || uploading}
          style={{
            width: '100%',
            padding: 14,
            background: uploading ? '#333' : '#3b82f6',
            border: 'none',
            borderRadius: 8,
            color: 'white',
            fontSize: 16,
            fontWeight: 600,
            cursor: uploading ? 'not-allowed' : 'pointer',
          }}
        >
          {uploading ? 'Uploading...' : 'Upload Model'}
        </button>
      </form>

      {/* Model List */}
      <h2 style={{ marginBottom: 16, fontSize: 20 }}>Recent Models</h2>
      {models.length === 0 ? (
        <p style={{ color: '#666' }}>No models yet. Upload one above!</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {models.map((model) => (
            <div
              key={model.id}
              style={{
                background: '#1a1a1a',
                padding: 16,
                borderRadius: 8,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <a
                  href={model.viewUrl}
                  style={{ color: '#3b82f6', fontWeight: 500, fontSize: 16 }}
                >
                  {model.name}
                </a>
                <p style={{ color: '#666', fontSize: 12, marginTop: 4 }}>
                  {formatBytes(model.size)} • {new Date(model.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <a
                  href={model.viewUrl}
                  style={{
                    padding: '8px 12px',
                    background: '#333',
                    borderRadius: 6,
                    fontSize: 14,
                  }}
                >
                  View
                </a>
                <button
                  onClick={() => handleDelete(model.id)}
                  style={{
                    padding: '8px 12px',
                    background: '#333',
                    border: 'none',
                    borderRadius: 6,
                    color: '#ef4444',
                    cursor: 'pointer',
                    fontSize: 14,
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
