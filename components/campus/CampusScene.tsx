'use client';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import { CATEGORY_MAP, type Campus, type CampusBuilding } from '@/types/campus';

// Convert lat/lng (meters) to scene-local 3D units around campus center
function toLocal(campus: Campus, lat: number, lng: number) {
  const x = (lng - campus.center.lng) * 111320 * Math.cos((campus.center.lat * Math.PI) / 180);
  const z = (lat - campus.center.lat) * 110540;
  return { x: x / campus.mapScale, z: z / campus.mapScale };
}

interface BuildingMeshProps {
  campus: Campus;
  building: CampusBuilding;
  selected: boolean;
  dimmed: boolean;
  onClick: (b: CampusBuilding) => void;
}

function BuildingMesh({ campus, building, selected, dimmed, onClick }: BuildingMeshProps) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);
  const { x, z } = toLocal(campus, building.lat, building.lng);
  const cat = CATEGORY_MAP[building.category];

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    // gentle idle float for hovered/selected emphasis
    const targetY = building.height / 2 + (hovered || selected ? Math.sin(t * 2) * 0.12 : 0);
    meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, targetY, 0.1);
  });

  return (
    <group position={[x, 0, z]}>
      <mesh
        ref={meshRef}
        position={[0, building.height / 2, 0]}
        onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onClick(building); }}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
      >
        <boxGeometry args={[building.width, building.height, building.depth]} />
        <meshStandardMaterial
          color={selected ? cat.color : building.color}
          emissive={selected || hovered ? cat.color : '#000000'}
          emissiveIntensity={selected ? 0.5 : hovered ? 0.3 : 0}
          transparent
          opacity={dimmed ? 0.25 : 1}
          roughness={0.5}
        />
      </mesh>

      {/* Building label */}
      <Html position={[0, building.height + 0.6, 0]} center distanceFactor={22} style={{ pointerEvents: 'none' }}>
        <div className={`px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap shadow-md border transition-colors ${
          hovered || selected
            ? 'bg-white text-gray-900 border-blue-300'
            : 'bg-gray-900/70 text-white border-white/10 backdrop-blur-sm'
        }`}>
          {building.name}
        </div>
      </Html>
    </group>
  );
}

interface CampusSceneProps {
  campus: Campus;
  selectedId: string | null;
  hiddenCategories: Set<string>;
  hiddenLayers: Set<string>;
  onSelect: (b: CampusBuilding) => void;
  onHover?: (name: string | null) => void;
}

export interface CampusSceneHandle {
  reset: () => void;
}

/** Inner content so we can hold a ref to OrbitControls */
function SceneContent({
  campus, selectedId, hiddenCategories, hiddenLayers, onSelect, controlsRef,
}: CampusSceneProps & { controlsRef: React.RefObject<any> }) {
  return (
    <>
      <color attach="background" args={['#eef2f7']} />
      <fog attach="fog" args={['#eef2f7', 45, 95]} />

      {/* Lights */}
      <ambientLight intensity={0.55} />
      <directionalLight position={[15, 25, 10]} intensity={1.1} />
      <directionalLight position={[-12, 15, -8]} intensity={0.35} color="#b3d4ff" />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[90, 90]} />
        <meshStandardMaterial color="#dbe8d3" roughness={0.95} />
      </mesh>

      {/* Walkways / roads (simple grid lines) */}
      {!hiddenLayers.has('roads') && (
        <group>
          {[-8, 0, 8, 16].map(i => (
            <mesh key={`h${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[i, 0.01, 0]}>
              <planeGeometry args={[1.4, 80]} />
              <meshStandardMaterial color="#cbd5e1" roughness={1} />
            </mesh>
          ))}
          {[-10, -2, 6, 14].map(i => (
            <mesh key={`v${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, i]}>
              <planeGeometry args={[80, 1.4]} />
              <meshStandardMaterial color="#cbd5e1" roughness={1} />
            </mesh>
          ))}
        </group>
      )}

      {/* Trees / vegetation dots */}
      {!hiddenLayers.has('vegetation') && (
        <group>
          {[[14, -10], [-14, 10], [12, 12], [-12, -12], [16, 4], [-16, -4]].map(([tx, tz], i) => (
            <mesh key={i} position={[tx, 1.2, tz]}>
              <coneGeometry args={[1.6, 2.6, 8]} />
              <meshStandardMaterial color={i % 2 ? '#4d7c0f' : '#65a30d'} roughness={0.9} />
            </mesh>
          ))}
        </group>
      )}

      {/* Buildings */}
      {!hiddenLayers.has('buildings') &&
        campus.buildings.map(b => (
          <BuildingMesh
            key={b.id}
            campus={campus}
            building={b}
            selected={selectedId === b.id}
            dimmed={hiddenCategories.has(b.category)}
            onClick={onSelect}
          />
        ))}

      {/* POI markers */}
      {!hiddenLayers.has('facilities') &&
        campus.points.map(p => {
          const { x, z } = toLocal(campus, p.lat, p.lng);
          return (
            <Html key={p.id} position={[x, 3, z]} center distanceFactor={24} style={{ pointerEvents: 'none' }}>
              <div className="w-9 h-9 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center text-lg select-none">
                {p.icon}
              </div>
            </Html>
          );
        })}

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={8}
        maxDistance={70}
        maxPolarAngle={Math.PI / 2.1}
        target={[0, 2, 0]}
      />
    </>
  );
}

export const CampusScene = forwardRef<CampusSceneHandle, CampusSceneProps>(function CampusScene(
  { campus, selectedId, hiddenCategories, hiddenLayers, onSelect },
  ref
) {
  const controlsRef = useRef<any>(null);

  useImperativeHandle(ref, () => ({
    reset: () => {
      const c = controlsRef.current;
      if (c) {
        c.target.set(0, 2, 0);
        c.object.position.set(0, 26, 30);
        c.update();
      }
    },
  }));

  return (
    <Canvas
      camera={{ position: [0, 26, 30], fov: 45 }}
      gl={{ antialias: true }}
      dpr={[1, 1.75]}
    >
      <SceneContent
        campus={campus}
        selectedId={selectedId}
        hiddenCategories={hiddenCategories}
        hiddenLayers={hiddenLayers}
        onSelect={onSelect}
        controlsRef={controlsRef}
      />
    </Canvas>
  );
});
