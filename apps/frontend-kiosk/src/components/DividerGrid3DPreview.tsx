import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";

interface DividerGrid3DPreviewProps {
  width: number;
  depth: number;
  height: number;
  columns: number;
  rows: number;
  thickness: number;
  className?: string;
}

const WOOD = "#d4a373";
const WOOD_LIGHT = "#e0b48a";

/** Assembled cross-lap divider grid, approximated with solid strips. */
export function DividerGrid3DPreview({ width, depth, height, columns, rows, thickness, className = "" }: DividerGrid3DPreviewProps) {
  const strips = useMemo(() => {
    const s = 3.6 / Math.max(width, depth);
    const W = width * s;
    const D = depth * s;
    const H = height * s;
    const t = Math.max(thickness * s, 0.02);

    const list: { size: [number, number, number]; pos: [number, number, number]; color: string }[] = [];
    for (let i = 1; i < columns; i++) {
      list.push({ size: [t, H, D], pos: [(width * i * s) / columns - W / 2, H / 2, 0], color: WOOD });
    }
    for (let j = 1; j < rows; j++) {
      list.push({ size: [W, H, t], pos: [0, H / 2, (depth * j * s) / rows - D / 2], color: WOOD_LIGHT });
    }
    return { list, H };
  }, [width, depth, height, columns, rows, thickness]);

  return (
    <div className={`relative bg-neutral-50 rounded-xl border border-neutral-200 overflow-hidden ${className}`}>
      <Canvas camera={{ position: [4, 3.2, 4.6], fov: 45 }} style={{ width: "100%", height: "100%" }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.65} />
          <directionalLight position={[8, 12, 6]} intensity={1.1} />
          <directionalLight position={[-6, 4, -8]} intensity={0.3} />

          {strips.list.map((p, i) => (
            <mesh key={i} position={p.pos}>
              <boxGeometry args={p.size} />
              <meshStandardMaterial color={p.color} roughness={0.75} metalness={0.05} />
            </mesh>
          ))}

          <Grid
            position={[0, -0.005, 0]}
            args={[10, 10]}
            cellSize={0.5}
            cellThickness={0.5}
            cellColor="#d8ccba"
            sectionSize={2}
            sectionThickness={1}
            sectionColor="#c8bba6"
            fadeDistance={18}
            fadeStrength={1}
            followCamera={false}
            infiniteGrid={true}
          />

          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={2}
            maxDistance={14}
            target={[0, strips.H / 2, 0]}
            enableDamping={true}
            dampingFactor={0.05}
          />
        </Suspense>
      </Canvas>

      <div className="absolute bottom-3 left-3 right-3 z-10 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5">
        <p className="text-xs text-text-muted text-center">Drag to rotate • Scroll to zoom • Right-click to pan</p>
      </div>
    </div>
  );
}
