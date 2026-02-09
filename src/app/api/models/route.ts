import { NextResponse } from 'next/server';
import { getModels, getStorageInfo } from '@/lib/storage';

export async function GET() {
  try {
    const [models, storageInfo] = await Promise.all([
      getModels(),
      getStorageInfo(),
    ]);

    return NextResponse.json({
      models: models.map(m => ({
        id: m.id,
        name: m.name,
        size: m.size,
        createdAt: m.createdAt,
        viewUrl: m.viewUrl,
      })),
      storage: storageInfo,
    });
  } catch (error) {
    console.error('Failed to get models:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve models' },
      { status: 500 }
    );
  }
}
