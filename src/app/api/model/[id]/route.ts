import { NextRequest, NextResponse } from 'next/server';
import { getModel, deleteModel } from '@/lib/storage';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const model = await getModel(params.id);

    if (!model) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: model.id,
      name: model.name,
      fileUrl: model.fileUrl,
      size: model.size,
      createdAt: model.createdAt,
    });
  } catch (error) {
    console.error('Failed to get model:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve model' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const success = await deleteModel(params.id);

    if (!success) {
      return NextResponse.json(
        { error: 'Model not found or delete failed' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete model:', error);
    return NextResponse.json(
      { error: 'Failed to delete model' },
      { status: 500 }
    );
  }
}
