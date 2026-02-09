import { getModel } from '@/lib/storage';
import { notFound } from 'next/navigation';
import ModelViewer from '@/components/ModelViewer';

interface ViewPageProps {
  params: { id: string };
}

export default async function ViewPage({ params }: ViewPageProps) {
  const model = await getModel(params.id);

  if (!model) {
    notFound();
  }

  return <ModelViewer url={model.fileUrl} fileName={model.fileName} />;
}

export async function generateMetadata({ params }: ViewPageProps) {
  const model = await getModel(params.id);
  
  return {
    title: model ? `${model.name} - RF Sons 3D Viewer` : 'Model Not Found',
    description: model ? `View ${model.name} in 3D` : 'Model not found',
  };
}
