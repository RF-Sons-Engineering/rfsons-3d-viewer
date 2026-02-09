'use client';

import { Suspense, useRef, useEffect, useState, useCallback } from 'react';
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

interface TreeNode {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  children: TreeNode[];
  object: THREE.Object3D;
}

// Build tree from Three.js scene
function buildTree(object: THREE.Object3D, prefix = ''): TreeNode {
  const id = prefix || object.uuid;
  return {
    id,
    name: object.name || object.type,
    type: object.type,
    visible: object.visible,
    children: object.children
      .filter(child => child.type !== 'GridHelper' && !child.type.includes('Light') && child.type !== 'Environment')
      .map((child, i) => buildTree(child, `${id}-${i}`)),
    object,
  };
}

function GLBModel({ url, onSceneReady }: { url: string; onSceneReady: (obj: THREE.Object3D) => void }) {
  const gltf = useLoader(GLTFLoader, url);
  
  useEffect(() => {
    onSceneReady(gltf.scene);
  }, [gltf.scene, onSceneReady]);
  
  return <primitive object={gltf.scene} />;
}

function STLModel({ url, onSceneReady }: { url: string; onSceneReady: (obj: THREE.Object3D) => void }) {
  const geometry = useLoader(STLLoader, url);
  const meshRef = useRef<THREE.Mesh>(null);
  
  useEffect(() => {
    if (geometry) {
      geometry.computeVertexNormals();
      geometry.center();
    }
  }, [geometry]);
  
  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.name = 'STL Model';
      onSceneReady(meshRef.current);
    }
  }, [onSceneReady]);
  
  return (
    <mesh ref={meshRef} geometry={geometry} name="STL Model">
      <meshStandardMaterial 
        color="#888888" 
        metalness={0.4} 
        roughness={0.5}
        side={THREE.FrontSide}
      />
    </mesh>
  );
}

function OBJModel({ url, onSceneReady }: { url: string; onSceneReady: (obj: THREE.Object3D) => void }) {
  const obj = useLoader(OBJLoader, url);
  
  useEffect(() => {
    obj.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).material = new THREE.MeshStandardMaterial({
          color: '#888888',
          metalness: 0.3,
          roughness: 0.6,
          side: THREE.FrontSide,
        });
      }
    });
    onSceneReady(obj);
  }, [obj, onSceneReady]);
  
  return <primitive object={obj} />;
}

function Model({ url, fileName, onSceneReady }: { url: string; fileName: string; onSceneReady: (obj: THREE.Object3D) => void }) {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'glb':
    case 'gltf':
      return <GLBModel url={url} onSceneReady={onSceneReady} />;
    case 'stl':
      return <STLModel url={url} onSceneReady={onSceneReady} />;
    case 'obj':
      return <OBJModel url={url} onSceneReady={onSceneReady} />;
    default:
      console.error('Unknown file type:', extension);
      return null;
  }
}

function CameraController() {
  const { camera, scene } = useThree();
  
  useEffect(() => {
    const timer = setTimeout(() => {
      const box = new THREE.Box3().setFromObject(scene);
      if (box.isEmpty()) return;
      
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      if (maxDim === 0) return;
      
      const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180);
      const distance = (maxDim / 2) / Math.tan(fov / 2) * 2.5;
      
      camera.position.set(
        center.x + distance * 0.7,
        center.y + distance * 0.5,
        center.z + distance * 0.7
      );
      camera.lookAt(center);
      camera.updateProjectionMatrix();
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

// Tree Node Component
function TreeNodeItem({ 
  node, 
  depth = 0, 
  onToggleVisibility,
  onSelect,
  selectedId,
}: { 
  node: TreeNode; 
  depth?: number;
  onToggleVisibility: (node: TreeNode) => void;
  onSelect: (node: TreeNode) => void;
  selectedId: string | null;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children.length > 0;
  const isSelected = selectedId === node.id;
  
  const getIcon = () => {
    switch (node.type) {
      case 'Mesh': return '◆';
      case 'Group': return '📁';
      case 'Object3D': return '○';
      case 'Scene': return '🌐';
      case 'Bone': return '🦴';
      default: return '•';
    }
  };

  return (
    <div style={{ userSelect: 'none' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '4px 8px',
          paddingLeft: depth * 16 + 8,
          cursor: 'pointer',
          background: isSelected ? 'rgba(59, 130, 246, 0.3)' : 'transparent',
          borderRadius: 4,
          fontSize: 13,
          color: node.visible ? '#fff' : '#666',
        }}
        onClick={() => onSelect(node)}
      >
        {hasChildren && (
          <span
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            style={{ 
              width: 16, 
              textAlign: 'center',
              marginRight: 4,
              color: '#888',
            }}
          >
            {expanded ? '▼' : '▶'}
          </span>
        )}
        {!hasChildren && <span style={{ width: 20 }} />}
        <span style={{ marginRight: 6 }}>{getIcon()}</span>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {node.name}
        </span>
        <span
          onClick={(e) => { e.stopPropagation(); onToggleVisibility(node); }}
          style={{ 
            padding: '2px 6px',
            fontSize: 11,
            color: node.visible ? '#10b981' : '#666',
          }}
          title={node.visible ? 'Hide' : 'Show'}
        >
          {node.visible ? '👁' : '👁‍🗨'}
        </span>
      </div>
      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNodeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              onToggleVisibility={onToggleVisibility}
              onSelect={onSelect}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Sidebar Component
function ObjectTreeSidebar({ 
  tree, 
  onToggleVisibility,
  onSelect,
  selectedId,
  isOpen,
  onToggle,
}: { 
  tree: TreeNode | null;
  onToggleVisibility: (node: TreeNode) => void;
  onSelect: (node: TreeNode) => void;
  selectedId: string | null;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      {/* Toggle button */}
      <button
        onClick={onToggle}
        style={{
          position: 'absolute',
          top: 70,
          left: isOpen ? 260 : 20,
          padding: '10px 16px',
          background: isOpen ? '#3b82f6' : '#333',
          border: 'none',
          borderRadius: 8,
          color: 'white',
          cursor: 'pointer',
          fontSize: 14,
          zIndex: 10,
          transition: 'left 0.2s ease',
        }}
      >
        {isOpen ? '◀ Tree' : '▶ Tree'}
      </button>

      {/* Sidebar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: isOpen ? 0 : -260,
          width: 250,
          height: '100%',
          background: 'rgba(26, 26, 26, 0.95)',
          borderRight: '1px solid #333',
          transition: 'left 0.2s ease',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ 
          padding: '16px',
          borderBottom: '1px solid #333',
          fontSize: 14,
          fontWeight: 600,
          color: '#fff',
        }}>
          Object Tree
        </div>
        <div style={{ 
          flex: 1,
          overflow: 'auto',
          padding: '8px 0',
        }}>
          {tree ? (
            <TreeNodeItem
              node={tree}
              onToggleVisibility={onToggleVisibility}
              onSelect={onSelect}
              selectedId={selectedId}
            />
          ) : (
            <div style={{ padding: 16, color: '#666', fontSize: 13 }}>
              Loading...
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function ModelViewer({ url, fileName }: ModelViewerProps) {
  const [showGrid, setShowGrid] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const handleShare = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSceneReady = useCallback((object: THREE.Object3D) => {
    const treeData = buildTree(object);
    setTree(treeData);
  }, []);

  const handleToggleVisibility = useCallback((node: TreeNode) => {
    node.object.visible = !node.object.visible;
    // Force tree update
    setTree(prev => prev ? { ...prev } : null);
  }, []);

  const handleSelect = useCallback((node: TreeNode) => {
    setSelectedId(node.id);
  }, []);

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
            <Model url={url} fileName={fileName} onSceneReady={handleSceneReady} />
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

      {/* Object Tree Sidebar */}
      <ObjectTreeSidebar
        tree={tree}
        onToggleVisibility={handleToggleVisibility}
        onSelect={handleSelect}
        selectedId={selectedId}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      
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
        <a
          href={url}
          download={fileName}
          style={{
            padding: '10px 16px',
            background: '#333',
            border: 'none',
            borderRadius: 8,
            color: 'white',
            textDecoration: 'none',
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          ↓ Download
        </a>
      </div>
      
      {/* Back link */}
      <a
        href="/"
        style={{
          position: 'absolute',
          top: 20,
          left: sidebarOpen ? 270 : 20,
          padding: '10px 16px',
          background: '#333',
          border: 'none',
          borderRadius: 8,
          color: 'white',
          textDecoration: 'none',
          fontSize: 14,
          transition: 'left 0.2s ease',
        }}
      >
        ← Back
      </a>
      
      {/* File name */}
      <div style={{
        position: 'absolute',
        bottom: 20,
        left: sidebarOpen ? 270 : 20,
        fontSize: 12,
        color: '#666',
        transition: 'left 0.2s ease',
      }}>
        {fileName}
      </div>
    </div>
  );
}
