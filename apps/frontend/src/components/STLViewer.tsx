import React, { Suspense, useRef, useState } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { OrbitControls, Environment, Grid } from "@react-three/drei";
import { OrbitControls as OrbitControlsImpl } from "three/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { Mesh } from "three";
import * as THREE from "three";
import { Loader2, RotateCcw, ZoomIn, ZoomOut, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface STLViewerProps {
  file: File | null;
  className?: string;
}

const STLModel = ({ url }: { url: string }) => {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [hovered, setHovered] = useState(false);

  const geometry = useLoader(STLLoader as any, url);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.2;
    }
  });

  // Center and scale the model when it loads
  React.useEffect(() => {
    if (geometry && meshRef.current) {
      // Center the geometry
      geometry.computeBoundingBox();
      const center = geometry.boundingBox!.getCenter(new THREE.Vector3());
      geometry.translate(-center.x, -center.y, -center.z);

      // Scale the model to fit nicely in the view - smaller scale
      const size = geometry.boundingBox!.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 1.5 / maxDim; // Reduced from 2 to 1.5 for better fit
      meshRef.current.scale.setScalar(scale);
    }
  }, [geometry]);

  return (
    <mesh
      ref={meshRef as any}
      geometry={geometry}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      scale={hovered ? 1.05 : 1}
    >
      <meshStandardMaterial
        color={hovered ? "#3b82f6" : "#64748b"}
        metalness={0.1}
        roughness={0.3}
      />
    </mesh>
  );
};

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-full">
    <div className="text-center">
      <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
      <p className="text-sm text-text-muted">Loading 3D model...</p>
    </div>
  </div>
);

const CameraController = ({
  controlsRef,
}: {
  controlsRef: React.RefObject<OrbitControlsImpl>;
}) => {
  const { camera } = useThree();

  React.useEffect(() => {
    // Position camera at top-right looking diagonally down - further away
    camera.position.set(5, 5, 5);
    camera.lookAt(0, 0, 0);

    // Update controls target
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  }, [camera, controlsRef]);

  return null;
};

const STLViewer = ({ file, className = "" }: STLViewerProps) => {
  const [url, setUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const controlsRef = useRef<OrbitControlsImpl>(null);

  React.useEffect(() => {
    if (file) {
      setIsLoading(true);
      setHasError(false);
      try {
        const objectUrl = URL.createObjectURL(file);
        setUrl(objectUrl);
        setIsLoading(false);

        return () => {
          URL.revokeObjectURL(objectUrl);
        };
      } catch (error) {
        console.error("Error creating object URL:", error);
        setHasError(true);
        setIsLoading(false);
      }
    }
  }, [file]);

  const resetView = () => {
    if (controlsRef.current) {
      // Reset to top-right diagonal view - further away
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.object.position.set(5, 5, 5);
      controlsRef.current.object.lookAt(0, 0, 0);
      controlsRef.current.update();
    }
  };

  const zoomIn = () => {
    if (controlsRef.current) {
      (controlsRef.current as any).dollyIn(0.5);
    }
  };

  const zoomOut = () => {
    if (controlsRef.current) {
      (controlsRef.current as any).dollyOut(0.5);
    }
  };

  if (!file) {
    return (
      <div
        className={`bg-neutral-50 rounded-lg border-2 border-dashed border-neutral-200 flex items-center justify-center ${className}`}
      >
        <div className="text-center p-8">
          <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 text-neutral-400">📄</div>
          </div>
          <p className="text-sm text-text-muted">No file selected</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        className={`bg-neutral-50 rounded-lg border border-neutral-200 flex items-center justify-center ${className}`}
      >
        <LoadingFallback />
      </div>
    );
  }

  if (hasError) {
    return (
      <div
        className={`bg-neutral-50 rounded-lg border border-neutral-200 flex items-center justify-center ${className}`}
      >
        <div className="text-center p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-sm text-text-muted">Failed to load 3D model</p>
          <p className="text-xs text-text-muted mt-1">
            Please try uploading the file again
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative bg-neutral-50 rounded-lg border border-neutral-200 overflow-hidden ${className}`}
    >
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col space-y-2">
        <Button
          variant="outline"
          size="sm"
          onClick={resetView}
          className="bg-white/90 backdrop-blur-sm"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={zoomIn}
          className="bg-white/90 backdrop-blur-sm"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={zoomOut}
          className="bg-white/90 backdrop-blur-sm"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
      </div>

      {/* File Info */}
      <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2">
        <p className="text-sm font-medium text-text-primary">{file.name}</p>
        <p className="text-xs text-text-muted">
          {(file.size / 1024 / 1024).toFixed(2)} MB
        </p>
      </div>

      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [5, 5, 5], fov: 50 }}
        style={{ width: "100%", height: "100%" }}
      >
        <Suspense fallback={null}>
          <CameraController controlsRef={controlsRef} />

          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <pointLight position={[-10, -10, -5]} intensity={0.5} />

          {url && <STLModel url={url} />}

          <Environment preset="studio" />
          <Grid
            position={[0, -2, 0]}
            args={[10, 10]}
            cellSize={0.5}
            cellThickness={0.5}
            cellColor="#e5e7eb"
            sectionSize={2}
            sectionThickness={1}
            sectionColor="#d1d5db"
            fadeDistance={20}
            fadeStrength={1}
            followCamera={false}
            infiniteGrid={true}
          />

          <OrbitControls
            ref={controlsRef as any}
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={2}
            maxDistance={15}
            autoRotate={false}
            autoRotateSpeed={0.5}
            target={[0, 0, 0]}
            enableDamping={true}
            dampingFactor={0.05}
          />
        </Suspense>
      </Canvas>

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 right-4 z-10 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2">
        <p className="text-xs text-text-muted text-center">
          Drag to rotate • Scroll to zoom • Right-click to pan
        </p>
      </div>
    </div>
  );
};

export { STLViewer };
