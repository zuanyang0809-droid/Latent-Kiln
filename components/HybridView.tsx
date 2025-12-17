import React from 'react';
import { Vase } from '../types';
import { Download, Loader2 } from 'lucide-react';
//import { AlignmentData } from '../utils/autoAlign'; // 确保路径正确，或者直接在这里定义接口

// 如果没法从 utils 导入，取消下面这行的注释使用本地定义
interface AlignmentData { neckScale: number; baseScale: number; }

interface HybridViewProps {
  parts: {
    neck: Vase | null;
    body: Vase | null;
    base: Vase | null;
  };
  alignment?: AlignmentData; // 新增：对齐数据
  isAligning?: boolean;      // 新增：是否正在计算
}

const HybridView: React.FC<HybridViewProps> = ({ 
  parts, 
  alignment = { neckScale: 1, baseScale: 1 }, // 默认值防止崩溃
  isAligning = false 
}) => {
  const { neck, body, base } = parts;
  const hasHybrid = neck && body && base;

  // === 核心设置：基准宽度 ===
  // Body 将永远保持这个像素宽度，其他部件根据比例缩放
  const BASE_WIDTH = 220; 

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22100%22%20viewBox%3D%220%200%20100%20100%22%3E%3Crect%20fill%3D%22%23ddd%22%20width%3D%22100%22%20height%3D%22100%22%2F%3E%3Ctext%20fill%3D%22%23555%22%20font-family%3D%22sans-serif%22%20font-size%3D%2214%22%20dy%3D%2210.5%22%20font-weight%3D%22bold%22%20x%3D%2250%25%22%20y%3D%2250%25%22%20text-anchor%3D%22middle%22%3E%3F%3C%2Ftext%3E%3C%2Fsvg%3E';
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-8">
      
      {/* The main card/station */}
      <div className="relative w-full max-w-2xl h-full max-h-[80%] flex flex-col items-center justify-center pointer-events-auto">
        
        {/* Glassmorphism Background */}
        <div className="absolute inset-0 bg-white/40 backdrop-blur-md border border-white/50 rounded-2xl shadow-2xl"></div>
        
        {/* Decorative Grid - Subtle */}
        <div className="absolute inset-4 border border-earth-brown/10 rounded-xl pointer-events-none opacity-30"></div>

        {!hasHybrid ? (
          <div className="text-center z-10 p-10 opacity-80 relative">
            <h2 className="font-serif text-3xl text-earth-brown mb-4">The Assembly Station</h2>
            <p className="font-sans text-earth-brown/80 font-medium max-w-md mx-auto">
              Sketch a silhouette on the left and click "Generate Hybrid" to fuse archaeological fragments into new forms.
            </p>
          </div>
        ) : (
          <div className="z-10 flex flex-col items-center animate-fade-in relative w-full h-full justify-center">
             
             {/* The Hybrid Stack */}
             <div className="relative flex flex-col items-center drop-shadow-2xl filter sepia-[.1]">
                
                {/* 加载状态遮罩 */}
                {isAligning && (
                  <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-sm rounded-lg transition-all duration-300">
                    <Loader2 className="animate-spin text-earth-brown" size={32} />
                  </div>
                )}

                {/* Neck */}
                {neck && (
                  <div className="relative z-30 group flex justify-center transition-all duration-500 ease-out">
                     <img 
                        src={neck.assets.parts.neck} 
                        alt="Neck Fragment"
                        // 移除 w-32, 改用 h-auto 和 style width
                        className="h-auto object-contain block" 
                        onError={handleImageError}
                        style={{
                            width: `${BASE_WIDTH * alignment.neckScale}px`,
                            marginBottom: '-5px' // 负边距，消除缝隙
                        }}
                     />
                     {/* Tooltip */}
                     <div className="absolute top-0 right-[-140px] bg-white/90 p-2 text-xs font-mono text-earth-brown border-l-2 border-earth-brown hidden md:block opacity-0 group-hover:opacity-100 transition-opacity shadow-sm pointer-events-none">
                        NECK: {neck.region}
                     </div>
                  </div>
                )}

                {/* Body (Anchor) */}
                {body && (
                  <div className="relative z-20 group flex justify-center transition-all duration-500 ease-out">
                     <img 
                        src={body.assets.parts.body} 
                        alt="Body Fragment"
                        className="h-auto object-contain block" 
                        onError={handleImageError}
                        style={{
                            width: `${BASE_WIDTH}px`, // Body 是基准
                            zIndex: 20
                        }}
                     />
                     <div className="absolute top-1/2 right-[-160px] bg-white/90 p-2 text-xs font-mono text-earth-brown border-l-2 border-earth-brown hidden md:block opacity-0 group-hover:opacity-100 transition-opacity shadow-sm pointer-events-none">
                        BODY: {body.region}
                     </div>
                  </div>
                )}

                {/* Base */}
                {base && (
                  <div className="relative z-10 group flex justify-center transition-all duration-500 ease-out">
                     <img 
                        src={base.assets.parts.base} 
                        alt="Base Fragment"
                        className="h-auto object-contain block" 
                        onError={handleImageError}
                        style={{
                            width: `${BASE_WIDTH * alignment.baseScale}px`,
                            marginTop: '-5px' // 负边距，消除缝隙
                        }}
                     />
                     <div className="absolute bottom-0 right-[-140px] bg-white/90 p-2 text-xs font-mono text-earth-brown border-l-2 border-earth-brown hidden md:block opacity-0 group-hover:opacity-100 transition-opacity shadow-sm pointer-events-none">
                        BASE: {base.region}
                     </div>
                  </div>
                )}
             </div>

             {/* Info Card */}
             <div className={`mt-8 flex flex-col items-center gap-2 bg-white/50 p-4 rounded-xl backdrop-blur-sm border border-white/60 shadow-sm transition-opacity duration-500 ${isAligning ? 'opacity-50' : 'opacity-100'}`}>
                <h3 className="font-serif text-2xl text-earth-brown font-bold tracking-widest">
                    {isAligning ? 'CALCULATING...' : `HYBRID NO. ${Math.floor(Math.random() * 9999)}`}
                </h3>
                <div className="flex gap-2 text-xs font-sans text-earth-brown/80 uppercase tracking-widest font-semibold">
                    <span>{neck?.period || 'Unknown'}</span> • <span>{body?.period || 'Unknown'}</span> • <span>{base?.period || 'Unknown'}</span>
                </div>
                <button 
                  disabled={isAligning}
                  className="mt-4 flex items-center gap-2 px-6 py-2 bg-earth-brown text-white rounded-full hover:bg-earth-brown-light transition-colors text-sm font-sans shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Download size={14} /> SAVE ARTIFACT
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HybridView;
