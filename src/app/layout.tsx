import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RF Sons 3D Viewer',
  description: 'Simple 3D model viewer for RF Sons Engineering',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
