'use client';

import { Suspense, useRef, useEffect, useState } from 'react';
import { Canvas, useThree, useLoader } from '@react-three/fiber';
import { OrbitControls, Grid, Center, Environment } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import * as THREE from 'three';

interface ModelViewerProps {
  url: string;
  fileName: string;
}

function GLBModel({ url }: { url: string }) {
  const gltf = useLoader(GLTFLoader, url);
  return <primitive object={gltf.scene} />;
}

function STLModel({ url }: { url: string }) {
  const geometry = useLoader(STLLoader, url);
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="#888888" metalness={0.3} roughness={0.6} />
    </mesh>
  );
}

function OBJModel({ url }: { url: string }) {
  const obj = useLoader(OBJLoader, url);
  
  useEffect(() => {
    obj.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).material = new THREE.MeshStandardMaterial({
          color: '#888888',
          metalness: 0.3,
          roughness: 0.6,
        });
      }
    });
  }, [obj]);
  
  return <primitive object={obj} />;
}

function Model({ url, fileName }: { url: string; fileName: string }) {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'glb':
    case 'gltf':
      return <GLBModel url={url} />;
    case 'stl':
      return <STLModel url={url} />;
    case 'obj':
      return <OBJModel url={url} />;
    default:
      return null;
  }
}

function AutoFit({ children }: { children: React.ReactNode }) {
  const { camera, scene } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  
  useEffect(() => {
    if (!groupRef.current) return;
    
    // Wait for model to load
    const timer = setTimeout(() => {
      const box = new THREE.Box3().setFromObject(groupRef.current!);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      
      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180);
      const distance = maxDim / (2 * Math.tan(fov / 2)) * 1.5;
      
      camera.position.set(center.x + distance * 0.5, center.y + distance * 0.5, center.z + distance);
      camera.lookAt(center);
      camera.updateProjectionMatrix();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [camera, scene]);
  
  return <group ref={groupRef}>{children}</group>;
}

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#444" wireframe />
    </mesh>
  );
}

export default function ModelViewer({ url, fileName }: ModelViewerProps) {
  const [showGrid, setShowGrid] = useState(true);
  const [copied, setCopied] = useState(false);
  
  const handleShare = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ width: '100%', height: '100vh', background: '#1a1a1a', position: 'relative' }}>
      <Canvas camera={{ fov: 50, position: [5, 5, 5] }}>
        <color attach="background" args={['#1a1a1a']} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <directionalLight position={[-10, -10, -5]} intensity={0.3} />
        
        <Suspense fallback={<LoadingFallback />}>
          <AutoFit>
            <Center>
              <Model url={url} fileName={fileName} />
            </Center>
          </AutoFit>
        </Suspense>
        
        {showGrid && (
          <Grid
            args={[20, 20]}
            cellSize={1}
            cellThickness={0.5}
            cellColor="#333"
            sectionSize={5}
            sectionThickness={1}
            sectionColor="#555"
            fadeDistance={30}
            fadeStrength={1}
            infiniteGrid
          />
        )}
        
        <OrbitControls
          enableDamping
          dampingFactor={0.1}
          rotateSpeed={0.5}
          zoomSpeed={0.8}
          panSpeed={0.8}
        />
        <Environment preset="studio" />
      </Canvas>
      
      {/* Controls */}
      <div style={{
        position: 'absolute',
        top: 20,
        right: 20,
        display: 'flex',
        gap: 10,
      }}>
        <button
          onClick={() => setShowGrid(!showGrid)}
          style={{
            padding: '10px 16px',
            background: showGrid ? '#3b82f6' : '#333',
            border: 'none',
            borderRadius: 8,
            color: 'white',
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          Grid
        </button>
        <button
          onClick={handleShare}
          style={{
            padding: '10px 16px',
            background: copied ? '#10b981' : '#333',
            border: 'none',
            borderRadius: 8,
            color: 'white',
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          {copied ? 'Copied!' : 'Share'}
        </button>
      </div>
      
      {/* Back link */}
      <a
        href="/"
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          padding: '10px 16px',
          background: '#333',
          border: 'none',
          borderRadius: 8,
          color: 'white',
          textDecoration: 'none',
          fontSize: 14,
        }}
      >
        ← Back
      </a>
    </div>
  );
}
