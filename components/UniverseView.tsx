import { useTexture, Billboard, Text, Stars, OrbitControls } from '@react-three/drei';
import React, { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { DoubleSide } from 'three';
import { Vase } from '../types';

interface UniverseViewProps {
  data: Vase[];
  selectedVases: Vase[];
}

// 简单的错误边界
class TextureErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// --- VaseMesh 组件 (核心修复区域) ---
const VaseMesh = ({ url, opacity, maxSide = 4 }: { url: string; opacity: number; maxSide?: number }) => {
  const texture = useTexture(url);
  
  // 安全获取尺寸
  const imgW = texture.image?.naturalWidth || texture.image?.width || 100;
  const imgH = texture.image?.naturalHeight || texture.image?.height || 100;
  
  // 防止除以零
  const ratio = imgH === 0 ? 1 : imgW / imgH;

  let w, h;
  if (imgW >= imgH) {
    w = maxSide;
    h = maxSide / ratio;
  } else {
    h = maxSide;
    w = maxSide * ratio;
  }
  
  // 防止计算出 NaN
  if (isNaN(w) || isNaN(h)) {
    w = 4; h = 4;
  }

  return (
    <mesh scale={[w, h, 1]}>
      <planeGeometry args={[1, 1]} />
      {/* 
         核心修复：depthWrite={false} 
         这告诉显卡：即使我是透明的，也请渲染我背后的东西！
      */}
      <meshBasicMaterial 
        map={texture} 
        transparent={true}
        opacity={opacity} 
        side={DoubleSide} 
        alphaTest={0.05} // 边缘处理
        depthWrite={false} // <--- 关键！解决消失问题
        depthTest={true}
        toneMapped={false} // 让颜色更鲜艳
      />
    </mesh>
  );
};

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
  
  const position = useMemo(() => 
    getPositionFromGlobe(vase.globe_coordinates.y, vase.globe_coordinates.x, 12), 
  [vase.globe_coordinates]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.getElapsedTime();
    
    if (isSelected) {
        meshRef.current.position.y = position[1] + Math.sin(time * 2) * 0.5;
        meshRef.current.scale.lerp(new THREE.Vector3(2.5, 2.5, 2.5), 0.1);
        meshRef.current.position.z = position[2] * 1.1; 
        // 选中时，渲染顺序设为最高，保证在最前面
        meshRef.current.renderOrder = 999;
    } else {
        meshRef.current.position.y = position[1];
        meshRef.current.position.z = position[2];
        meshRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
        meshRef.current.renderOrder = 1;
    }
  });

  // 修复：稍微调高未选中的透明度，防止太淡看不见
  const opacity = isAnySelected ? (isSelected ? 1 : 0.35) : 1.0;

  const FallbackMesh = (
    <mesh>
        <planeGeometry args={[3, 4]} />
        <meshBasicMaterial color="#cccccc" transparent opacity={0.5} side={DoubleSide} depthWrite={false} />
        <Text position={[0, 0, 0.1]} fontSize={0.5} color="#6E4D2E" anchorX="center" anchorY="middle">?</Text>
    </mesh>
  );

  return (
    <group ref={meshRef} position={position as [number, number, number]}>
      <Billboard follow={true}>
        <TextureErrorBoundary fallback={FallbackMesh}>
          <VaseMesh 
            url={vase.assets.image_url} 
            opacity={opacity}
            maxSide={4} 
          />
        </TextureErrorBoundary>
        
        {isSelected && (
             <Text
             position={[0, -2.5, 0]}
             fontSize={0.5}
             color="#6E4D2E"
             anchorX="center"
             anchorY="middle"
             renderOrder={1000} // 保证文字在最上层
           >
             {vase.region ? vase.region.toUpperCase() : "UNKNOWN"}
           </Text>
        )}
      </Billboard>
    </group>
  );
};

const CameraController: React.FC<{ selectedVases: Vase[] }> = ({ selectedVases }) => { return null; }

const UniverseView: React.FC<UniverseViewProps> = ({ data, selectedVases }) => {
  const isAnySelected = selectedVases.length > 0;

  const uniqueData = useMemo(() => {
    const seen = new Set();
    return data.filter(vase => {
      if (vase.id && seen.has(vase.id)) return false;
      if (vase.id) seen.add(vase.id);
      return true;
    });
  }, [data]);

  return (
    <div className="w-full h-full relative">
      <Canvas camera={{ position: [0, 0, 35], fov: 45 }}>
        <ambientLight intensity={0.8} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
        
        <Suspense fallback={null}>
            <group>
                {uniqueData.map((vase, idx) => (
                <VaseNode 
                    key={vase.id || idx}
                    vase={vase} 
                    isSelected={selectedVases.some(v => v.id === vase.id)}
                    isAnySelected={isAnySelected}
                />
                ))}
            </group>
        </Suspense>

        <OrbitControls 
            enablePan={false} 
            minDistance={5} 
            maxDistance={80} 
            autoRotate={!isAnySelected}
            autoRotateSpeed={0.5}
        />
        <CameraController selectedVases={selectedVases} />
      </Canvas>
      
      {isAnySelected && (
        <div className="absolute bottom-8 right-8 flex flex-col gap-4 pointer-events-none z-20">
            {selectedVases.map((vase, idx) => (
                <div key={vase.id} className="bg-white/90 backdrop-blur-sm p-4 rounded-lg shadow-lg border-l-4 border-earth-brown w-64 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${idx * 100}ms`}}>
                    <h3 className="font-serif font-bold text-lg text-earth-brown">
                        {vase.region || "Unknown Region"}
                    </h3>
                    {(vase as any).period && (
                        <p className="font-sans text-sm text-earth-brown/80">{(vase as any).period}</p>
                    )}
                    <p className="font-sans text-xs text-earth-brown/60 mt-2 font-mono truncate">
                        ID: {vase.id ? vase.id.toUpperCase() : "N/A"}
                    </p>
                </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default UniverseView;
