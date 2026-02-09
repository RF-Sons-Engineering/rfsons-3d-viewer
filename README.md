# RF Sons 3D Viewer

Simple 3D model viewer with API for RF Sons Engineering.

## Features

- 📦 Upload GLB, STL, OBJ files via web UI or API
- 👁️ Three.js viewer with orbit controls
- 🔗 Shareable view URLs
- 🗑️ Auto-cleanup: oldest models deleted when 1GB limit reached
- 🌙 Dark theme (construction-friendly)

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/RF-Sons-Engineering/rfsons-3d-viewer)

1. Click "Deploy with Vercel" above
2. Connect your GitHub account
3. Add environment variable: `BLOB_READ_WRITE_TOKEN` (from Vercel Blob)
4. Deploy!

### Get Blob Token

1. In Vercel dashboard, go to Storage → Create → Blob
2. Create a new Blob store
3. Copy the `BLOB_READ_WRITE_TOKEN`
4. Add it to your project's environment variables

## API Usage

### Upload a Model

```bash
curl -X POST https://your-app.vercel.app/api/upload \
  -F "file=@model.glb" \
  -F "name=My Model"
```

Response:
```json
{
  "id": "abc123",
  "url": "https://...",
  "viewUrl": "/view/abc123"
}
```

### List Models

```bash
curl https://your-app.vercel.app/api/models
```

### Get Model Info

```bash
curl https://your-app.vercel.app/api/model/abc123
```

### Delete Model

```bash
curl -X DELETE https://your-app.vercel.app/api/model/abc123
```

## Local Development

```bash
npm install
npm run dev
```

Note: You'll need a `BLOB_READ_WRITE_TOKEN` in `.env.local` for storage to work.

## Storage Behavior

- **Limit:** 1GB total
- **Auto-cleanup:** When uploading exceeds limit, oldest models are deleted
- **FIFO queue:** First in, first out

## Tech Stack

- Next.js 14 (App Router)
- Three.js + @react-three/fiber
- Vercel Blob storage
- TypeScript

---

Built for RF Sons Engineering 🏗️
