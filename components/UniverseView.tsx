import React, { useRef, useMemo, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Billboard, Text, Image as DreiImage, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { Vase } from '../types';

interface UniverseViewProps {
  data: Vase[];
  selectedVases: Vase[];
}

// Simple Error Boundary for Texture Loading
class TextureErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    // Log the error nicely and show fallback
    console.warn("Texture loading failed (likely missing file), showing fallback.");
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Helper to convert lat/lon to 3D position
const getPositionFromGlobe = (lat: number, lon: number, radius: number): [number, number, number] => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = (radius * Math.sin(phi) * Math.sin(theta));
  const y = (radius * Math.cos(phi));

  return [x, y, z];
};

const VaseNode: React.FC<{ vase: Vase; isSelected: boolean; isAnySelected: boolean }> = ({ vase, isSelected, isAnySelected }) => {
  const meshRef = useRef<THREE.Group>(null);
  
  // Calculate position once
  const position = useMemo(() => 
    getPositionFromGlobe(vase.globe_coordinates.y, vase.globe_coordinates.x, 12), 
  [vase.globe_coordinates]);

  // Animation for selected state
  useFrame((state) => {
    if (!meshRef.current) return;
    
    const time = state.clock.getElapsedTime();
    
    if (isSelected) {
        // Floating effect
        meshRef.current.position.y = position[1] + Math.sin(time * 2) * 0.5;
        // Scale up
        meshRef.current.scale.lerp(new THREE.Vector3(2.5, 2.5, 2.5), 0.1);
    } else {
        // Reset scale
        meshRef.current.position.y = position[1]; // simplified reset
        meshRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
    }
  });

  // Keep the "Abstract Picture" visible even when things are selected.
  // Previous opacity was 0.1, increased to 0.35 so the cloud remains a visible backdrop.
  const opacity = isAnySelected ? (isSelected ? 1 : 0.35) : 0.8;

  // Fallback placeholder if image fails to load
  const FallbackMesh = (
    <mesh>
        <planeGeometry args={[3, 4]} />
        <meshBasicMaterial color="#e0e0e0" transparent opacity={0.3} side={THREE.DoubleSide} />
        <Text position={[0, 0, 0.1]} fontSize={0.5} color="#6E4D2E" anchorX="center" anchorY="middle">
            ?
        </Text>
    </mesh>
  );

  return (
    <group ref={meshRef} position={position as [number, number, number]}>
      <Billboard follow={true}>
        <TextureErrorBoundary fallback={FallbackMesh}>
            <DreiImage 
                url={vase.assets.image_url} 
                transparent 
                opacity={opacity}
                scale={[3, 4]} // Aspect ratio rough guess
                radius={0.2}
                color={isAnySelected && !isSelected ? "#aaaaaa" : "white"} // Slightly tint unselected
            />
        </TextureErrorBoundary>
        
        {isSelected && (
             <Text
             position={[0, -2.5, 0]}
             fontSize={0.5}
             color="#6E4D2E"
             font="https://fonts.gstatic.com/s/playfairdisplay/v30/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKdFvXDXbtM.woff" // Linking directly to a google font woff
             anchorX="center"
             anchorY="middle"
           >
             {vase.region.toUpperCase()}
           </Text>
        )}
      </Billboard>
    </group>
  );
};

// Camera Controller to move camera when analyzing
const CameraController: React.FC<{ selectedVases: Vase[] }> = ({ selectedVases }) => {
    useFrame((state) => {
        if (selectedVases.length > 0) {
            // Optional: Add smooth camera movement here if desired
        }
    });
    return null;
}


const UniverseView: React.FC<UniverseViewProps> = ({ data, selectedVases }) => {
  const isAnySelected = selectedVases.length > 0;

  return (
    <div className="w-full h-full relative">
      <Canvas camera={{ position: [0, 0, 35], fov: 45 }}>
        {/* Environment */}
        <ambientLight intensity={0.8} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        
        {/* Data Cloud */}
        <Suspense fallback={null}>
            <group>
                {data.map((vase) => (
                <VaseNode 
                    key={vase.id} 
                    vase={vase} 
                    isSelected={selectedVases.some(v => v.id === vase.id)}
                    isAnySelected={isAnySelected}
                />
                ))}
            </group>
        </Suspense>

        <OrbitControls 
            enablePan={false} 
            minDistance={10} 
            maxDistance={60} 
            autoRotate={!isAnySelected}
            autoRotateSpeed={0.5}
        />
        <CameraController selectedVases={selectedVases} />
      </Canvas>
      
      {/* 2D Overlay for Metadata when analyzed - adjusted position for new layout compatibility */}
      {isAnySelected && (
        <div className="absolute bottom-8 right-8 flex flex-col gap-4 pointer-events-none z-20">
            {selectedVases.map((vase, idx) => (
                <div key={vase.id} className="bg-white/90 backdrop-blur-sm p-4 rounded-lg shadow-lg border-l-4 border-earth-brown w-64 animate-fade-in-up" style={{ animationDelay: `${idx * 100}ms`}}>
                    <h3 className="font-serif font-bold text-lg text-earth-brown">{vase.region}</h3>
                    {vase.period && <p className="font-sans text-sm text-earth-brown/80">{vase.period}</p>}
                    <p className="font-sans text-xs text-earth-brown/60 mt-2 font-mono">ID: {vase.id.toUpperCase()}</p>
                </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default UniverseView;