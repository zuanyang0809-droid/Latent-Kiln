import React, { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Billboard, Text, Image as DreiImage, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { Vase } from '../types';

interface UniverseViewProps {
  data: Vase[];
  selectedVases: Vase[];
}

// 简单的错误边界：如果纹理加载失败，显示替代内容
class TextureErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    console.warn("Texture loading failed:", error);
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// 将经纬度转换为 3D 球面坐标
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
  
  // 计算坐标 (只计算一次)
  const position = useMemo(() => 
    getPositionFromGlobe(vase.globe_coordinates.y, vase.globe_coordinates.x, 12), 
  [vase.globe_coordinates]);

  // 动画：选中时浮动
  useFrame((state) => {
    if (!meshRef.current) return;
    
    const time = state.clock.getElapsedTime();
    
    if (isSelected) {
        // 选中：浮动 + 放大
        meshRef.current.position.y = position[1] + Math.sin(time * 2) * 0.5;
        meshRef.current.scale.lerp(new THREE.Vector3(2.5, 2.5, 2.5), 0.1);
        // 让它稍微靠前一点，不要被别的遮住
        meshRef.current.position.z = position[2] * 1.1; 
    } else {
        // 复位
        meshRef.current.position.y = position[1];
        meshRef.current.position.z = position[2];
        meshRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
    }
  });

  // 透明度控制：没选中时变淡
  const opacity = isAnySelected ? (isSelected ? 1 : 0.2) : 0.9;

  // 替补图形 (如果图片挂了)
  const FallbackMesh = (
    <mesh>
        <planeGeometry args={[3, 4]} />
        <meshBasicMaterial color="#cccccc" transparent opacity={0.5} side={THREE.DoubleSide} />
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
                scale={[3, 4]} 
                radius={0.1}
                // 如果图片路径不对，这里会抛出错误被 ErrorBoundary 捕获
            />
        </TextureErrorBoundary>
        
        {/* 选中时显示地区名字 */}
        {isSelected && (
             <Text
             position={[0, -2.5, 0]}
             fontSize={0.5}
             color="#6E4D2E"
             // 使用一个肯定能加载的字体，或者移除 font 属性使用默认字体
             anchorX="center"
             anchorY="middle"
           >
             {vase.region ? vase.region.toUpperCase() : "UNKNOWN"}
           </Text>
        )}
      </Billboard>
    </group>
  );
};

// 简单的相机控制器
const CameraController: React.FC<{ selectedVases: Vase[] }> = ({ selectedVases }) => {
    useFrame((state) => {
        // 如果有选中物体，可以在这里加相机移动逻辑
        // 目前先留空，让 OrbitControls 处理
    });
    return null;
}

const UniverseView: React.FC<UniverseViewProps> = ({ data, selectedVases }) => {
  const isAnySelected = selectedVases.length > 0;

  return (
    <div className="w-full h-full relative">
      <Canvas camera={{ position: [0, 0, 35], fov: 45 }}>
        {/* 灯光环境 */}
        <ambientLight intensity={0.8} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
        
        {/* 数据云 (花瓶集合) */}
        <Suspense fallback={null}>
            <group>
                {data.map((vase, idx) => (
                <VaseNode 
                    key={vase.id || idx}  // 防止 id 重复
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
      
      {/* 2D 信息面板 (当选中时显示) */}
      {isAnySelected && (
        <div className="absolute bottom-8 right-8 flex flex-col gap-4 pointer-events-none z-20">
            {selectedVases.map((vase, idx) => (
                <div key={vase.id} className="bg-white/90 backdrop-blur-sm p-4 rounded-lg shadow-lg border-l-4 border-earth-brown w-64 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${idx * 100}ms`}}>
                    <h3 className="font-serif font-bold text-lg text-earth-brown">
                        {vase.region || "Unknown Region"}
                    </h3>
                    
                    {/* 安全访问可选属性 */}
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
