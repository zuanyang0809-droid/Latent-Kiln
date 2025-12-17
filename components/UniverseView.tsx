import React, { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Billboard, Text, Image as DreiImage, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { Vase } from '../types';

interface UniverseViewProps {
  data: Vase[];
  selectedVases: Vase[];
}

// 错误处理
class TextureErrorBoundary extends React.Component<{ children: React.ReactNode; fallback: React.ReactNode },{ hasError: boolean }> {
  constructor(props: any) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(error: any) { return { hasError: true }; }
  render() { if (this.state.hasError) return this.props.fallback; return this.props.children; }
}

// 经纬度转球坐标
const getPositionFromGlobe = (lat: number, lon: number, radius: number): [number, number, number] => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = (radius * Math.sin(phi) * Math.sin(theta));
  const y = (radius * Math.cos(phi));
  return [x, y, z];
};

// === ID 美化函数 ===
const formatDisplayId = (rawId: string) => {
  if (!rawId) return "N/A";
  // 1. 去掉 main-image 这种废话
  let clean = rawId.replace(/main_image/gi, '').replace(/restricted/gi, '');
  // 2. 把下划线换成空格
  clean = clean.replace(/_/g, ' ');
  // 3. 去掉多余空格
  return clean.trim().toUpperCase();
};

const VaseNode: React.FC<{ vase: Vase; isSelected: boolean; isAnySelected: boolean }> = ({ vase, isSelected, isAnySelected }) => {
  const meshRef = useRef<THREE.Group>(null);
  
  // === 关键修改：坐标扩散 ===
  // 我们把原始坐标乘以 15，让它们在球面上散开！
  // 原始坐标范围大概是 -10 到 10，乘以 15 变成 -150 到 150，足以覆盖球体
  const position = useMemo(() => 
    getPositionFromGlobe(
        vase.globe_coordinates.y * 15, 
        vase.globe_coordinates.x * 15, 
        15 // 球体半径稍微大一点
    ), 
  [vase.globe_coordinates]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.getElapsedTime();
    
    // 选中时总是面向镜头
    if (isSelected) {
        meshRef.current.lookAt(state.camera.position);
    }
    
    if (isSelected) {
        meshRef.current.position.y = position[1] + Math.sin(time * 2) * 0.5;
        meshRef.current.scale.lerp(new THREE.Vector3(2.5, 2.5, 2.5), 0.1);
        // 选中时往前推，防止被遮挡
        const direction = new THREE.Vector3().copy(position).normalize().multiplyScalar(1.2); 
        meshRef.current.position.add(direction.sub(meshRef.current.position).multiplyScalar(0.1));
    } else {
        meshRef.current.position.lerp(new THREE.Vector3(...position), 0.1);
        meshRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
    }
  });

  const opacity = isAnySelected ? (isSelected ? 1 : 0.1) : 0.8; // 未选中时更透明一点，突出选中的

  const FallbackMesh = (
    <mesh>
        <planeGeometry args={[3, 4]} />
        <meshBasicMaterial color="#cccccc" transparent opacity={0.5} side={THREE.DoubleSide} />
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
                scale={[4, 4]} // 图片稍微放大一点
                radius={0.1}
            />
        </TextureErrorBoundary>
        
        {/* 只有选中时才显示文字，避免乱糟糟 */}
        {isSelected && (
             <Text
             position={[0, -2.8, 0]}
             fontSize={0.6}
             color="#6E4D2E"
             anchorX="center"
             anchorY="middle"
             outlineWidth={0.05}
             outlineColor="#ffffff"
           >
             {vase.region.toUpperCase()}
           </Text>
        )}
      </Billboard>
    </group>
  );
};

const UniverseView: React.FC<UniverseViewProps> = ({ data, selectedVases }) => {
  const isAnySelected = selectedVases.length > 0;

  return (
    <div className="w-full h-full relative">
      <Canvas camera={{ position: [0, 0, 45], fov: 50 }}>
        <ambientLight intensity={0.8} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={0.5} />
        
        <Suspense fallback={null}>
            <group>
                {data.map((vase, idx) => (
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
            minDistance={10} 
            maxDistance={100} 
            autoRotate={!isAnySelected}
            autoRotateSpeed={0.8}
        />
      </Canvas>
      
      {/* 右下角信息卡片 */}
      {isAnySelected && (
        <div className="absolute bottom-8 right-8 flex flex-col gap-4 pointer-events-none z-20">
            {selectedVases.map((vase, idx) => (
                <div key={vase.id} className="bg-white/95 backdrop-blur p-4 rounded-lg shadow-xl border-l-4 border-earth-brown w-64 animate-in slide-in-from-right duration-500">
                    <h3 className="font-serif font-bold text-xl text-earth-brown tracking-wide">
                        {vase.region}
                    </h3>
                    <div className="mt-2 pt-2 border-t border-earth-brown/10">
                        <p className="font-sans text-[10px] text-earth-brown/50 uppercase tracking-widest">CATALOG ID</p>
                        <p className="font-mono text-sm text-earth-brown font-medium">
                            {formatDisplayId(vase.id)}
                        </p>
                    </div>
                </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default UniverseView;
