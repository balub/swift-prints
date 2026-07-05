import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import * as THREE from "three";
import { flattenPath } from "@/lib/geometry";
import { standProfile, type PhoneStandParams } from "@/blocks/phone-stand/generator";

const WOOD = "#d4a373";
const WOOD_LIGHT = "#e0b48a";

/** Assembled phone stand: two extruded side profiles plus the cross brace. */
export function PhoneStand3DPreview({ params, className = "" }: { params: PhoneStandParams; className?: string }) {
  const model = useMemo(() => {
    const profile = standProfile(params);
    const pts = flattenPath(profile.outline);
    const maxDim = Math.max(profile.points.D, profile.points.Ty, params.width);
    const s = 3 / maxDim;

    const shape = new THREE.Shape(pts.map((p) => new THREE.Vector2(p.x * s, p.y * s)));
    const holePts = flattenPath(profile.braceHole);
    const hole = new THREE.Path(holePts.map((p) => new THREE.Vector2(p.x * s, p.y * s)));
    shape.holes = [hole];

    const t = Math.max(params.thickness * s, 0.02);
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false });
    const halfSpan = (params.width * s) / 2;
    const center = profile.points.braceCenter;
    return {
      geometry,
      t,
      sideZ: [halfSpan - t, -halfSpan], // extrusion grows toward +z from each side's base plane
      brace: {
        size: [Math.max(params.thickness * s, 0.02), params.braceHeight * s, params.width * s] as [number, number, number],
        pos: [center.x * s, center.y * s, 0] as [number, number, number],
      },
      offsetX: (-profile.points.D * s) / 2,
      targetY: (profile.points.Ty * s) / 2,
    };
  }, [params]);

  return (
    <div className={`relative bg-neutral-50 rounded-xl border border-neutral-200 overflow-hidden ${className}`}>
      <Canvas camera={{ position: [4, 2.6, 4.6], fov: 45 }} style={{ width: "100%", height: "100%" }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.65} />
          <directionalLight position={[8, 12, 6]} intensity={1.1} />
          <directionalLight position={[-6, 4, -8]} intensity={0.3} />

          <group position={[model.offsetX, 0, 0]}>
            {model.sideZ.map((z, i) => (
              <mesh key={i} geometry={model.geometry} position={[0, 0, z]}>
                <meshStandardMaterial color={WOOD} roughness={0.75} metalness={0.05} />
              </mesh>
            ))}
            <mesh position={model.brace.pos}>
              <boxGeometry args={model.brace.size} />
              <meshStandardMaterial color={WOOD_LIGHT} roughness={0.75} metalness={0.05} />
            </mesh>
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
            target={[0, model.targetY, 0]}
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
