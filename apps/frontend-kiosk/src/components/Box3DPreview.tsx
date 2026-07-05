import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";

interface Box3DPreviewProps {
  length: number;
  width: number;
  height: number;
  thickness: number;
  closedTop: boolean;
  className?: string;
}

const WOOD = "#d4a373";
const WOOD_LIGHT = "#e0b48a";

/**
 * Assembled finger-joint box, approximated with six solid panels.
 * Proportions (L × W × H and material thickness) match the parameters;
 * the fingers themselves are omitted for clarity.
 */
export function Box3DPreview({ length, width, height, thickness, closedTop, className = "" }: Box3DPreviewProps) {
  const panels = useMemo(() => {
    const maxDim = Math.max(length, width, height);
    const s = 3 / maxDim;
    const L = length * s;
    const W = width * s;
    const H = height * s;
    const t = Math.max(thickness * s, 0.02);

    const list: { size: [number, number, number]; pos: [number, number, number]; color: string }[] = [
      { size: [L, t, W], pos: [0, t / 2, 0], color: WOOD_LIGHT }, // bottom
      { size: [L, H, t], pos: [0, H / 2, W / 2 - t / 2], color: WOOD }, // front
      { size: [L, H, t], pos: [0, H / 2, -(W / 2 - t / 2)], color: WOOD }, // back
      { size: [t, H, W - 2 * t], pos: [-(L / 2 - t / 2), H / 2, 0], color: WOOD_LIGHT }, // left
      { size: [t, H, W - 2 * t], pos: [L / 2 - t / 2, H / 2, 0], color: WOOD_LIGHT }, // right
    ];
    if (closedTop) list.push({ size: [L, t, W], pos: [0, H - t / 2, 0], color: WOOD_LIGHT });
    return { list, H };
  }, [length, width, height, thickness, closedTop]);

  return (
    <div className={`relative bg-neutral-50 rounded-xl border border-neutral-200 overflow-hidden ${className}`}>
      <Canvas camera={{ position: [4, 3.2, 4.6], fov: 45 }} style={{ width: "100%", height: "100%" }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.65} />
          <directionalLight position={[8, 12, 6]} intensity={1.1} />
          <directionalLight position={[-6, 4, -8]} intensity={0.3} />

          <group position={[0, 0, 0]}>
            {panels.list.map((p, i) => (
              <mesh key={i} position={p.pos}>
                <boxGeometry args={p.size} />
                <meshStandardMaterial color={p.color} roughness={0.75} metalness={0.05} />
              </mesh>
            ))}
          </group>

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
            target={[0, panels.H / 2, 0]}
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
