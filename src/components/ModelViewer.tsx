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
  const meshRef = useRef<THREE.Mesh>(null);
  
  useEffect(() => {
    if (geometry) {
      geometry.computeVertexNormals();
      geometry.center();
    }
  }, [geometry]);
  
  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial 
        color="#888888" 
        metalness={0.4} 
        roughness={0.5}
        side={THREE.DoubleSide}
      />
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
          side: THREE.DoubleSide,
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
      console.error('Unknown file type:', extension);
      return null;
  }
}

function CameraController() {
  const { camera, scene } = useThree();
  
  useEffect(() => {
    // Wait for model to load, then fit camera
    const timer = setTimeout(() => {
      const box = new THREE.Box3().setFromObject(scene);
      
      if (box.isEmpty()) {
        console.log('Scene is empty, waiting...');
        return;
      }
      
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      
      console.log('Model size:', size);
      console.log('Model center:', center);
      
      const maxDim = Math.max(size.x, size.y, size.z);
      
      if (maxDim === 0) {
        console.log('Model has zero size');
        return;
      }
      
      const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180);
      const distance = (maxDim / 2) / Math.tan(fov / 2) * 2.5;
      
      camera.position.set(
        center.x + distance * 0.7,
        center.y + distance * 0.5,
        center.z + distance * 0.7
      );
      camera.lookAt(center);
      camera.updateProjectionMatrix();
      
      console.log('Camera positioned at distance:', distance);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [camera, scene]);
  
  return null;
}

function LoadingSpinner() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#444" wireframe />
    </mesh>
  );
}

function ErrorBoundaryFallback() {
  return (
    <mesh>
      <sphereGeometry args={[1, 16, 16]} />
      <meshStandardMaterial color="#ff4444" wireframe />
    </mesh>
  );
}

export default function ModelViewer({ url, fileName }: ModelViewerProps) {
  const [showGrid, setShowGrid] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleShare = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  console.log('ModelViewer loading:', { url, fileName });

  return (
    <div style={{ width: '100%', height: '100vh', background: '#1a1a1a', position: 'relative' }}>
      <Canvas 
        camera={{ fov: 50, position: [10, 10, 10], near: 0.01, far: 100000 }}
        onCreated={({ gl }) => {
          gl.localClippingEnabled = true;
        }}
      >
        <color attach="background" args={['#1a1a1a']} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={1.2} />
        <directionalLight position={[-10, -10, -5]} intensity={0.4} />
        <pointLight position={[0, 10, 0]} intensity={0.5} />
        
        <Suspense fallback={<LoadingSpinner />}>
          <Center>
            <Model url={url} fileName={fileName} />
          </Center>
          <CameraController />
        </Suspense>
        
        {showGrid && (
          <Grid
            args={[100, 100]}
            cellSize={1}
            cellThickness={0.5}
            cellColor="#333"
            sectionSize={10}
            sectionThickness={1}
            sectionColor="#555"
            fadeDistance={100}
            fadeStrength={1}
            infiniteGrid
          />
        )}
        
        <OrbitControls
          enableDamping
          dampingFactor={0.1}
          rotateSpeed={0.5}
          zoomSpeed={1.2}
          panSpeed={0.8}
          minDistance={0.1}
          maxDistance={10000}
        />
        <Environment preset="studio" />
      </Canvas>
      
      {error && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(255,0,0,0.8)',
          padding: 20,
          borderRadius: 8,
          color: 'white',
        }}>
          Error: {error}
        </div>
      )}
      
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
      
      {/* Debug info */}
      <div style={{
        position: 'absolute',
        bottom: 20,
        left: 20,
        fontSize: 12,
        color: '#666',
      }}>
        {fileName}
      </div>
    </div>
  );
}
