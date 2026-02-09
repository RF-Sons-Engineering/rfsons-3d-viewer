import { NextRequest, NextResponse } from 'next/server';
import { uploadModel } from '@/lib/storage';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const name = formData.get('name') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const validExtensions = ['glb', 'gltf', 'stl', 'obj'];
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !validExtensions.includes(extension)) {
      return NextResponse.json(
        { error: `Invalid file type. Supported: ${validExtensions.join(', ')}` },
        { status: 400 }
      );
    }

    const model = await uploadModel(file, name || file.name);

    return NextResponse.json({
      id: model.id,
      url: model.fileUrl,
      viewUrl: model.viewUrl,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Upload failed' },
      { status: 500 }
    );
  }
}
