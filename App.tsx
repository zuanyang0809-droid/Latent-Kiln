import React, { useState } from 'react';
import { AppMode, Vase } from './types';
import vaseData from './frontend_master_db.json';
import DrawingCanvas from './components/DrawingCanvas';
import UniverseView from './components/UniverseView';
import HybridView from './components/HybridView';
import { Box, Layers, Info } from 'lucide-react';

// ==========================================
// 核心修复区域
// ==========================================

// 1. 设置 Base URL
// 注意：如果你部署在 GitHub Pages，保持 "/Latent-Kiln/"
// 注意：如果你部署在 Vercel，请把下面这就改成 const BASE_URL = "/";
const BASE_URL = "/Latent-Kiln/"; 

const fixUrl = (url: string) => {
  if (!url) return '';
  
  // 1. 去掉开头的 ./ 或 /
  const cleanPath = url.replace(/^\.?\//, '');

  // 2. 【关键新增】对路径进行编码 (处理空格和括号)
  // 将路径按 '/' 切割，对每一部分进行编码，再拼回去
  // 例如：'main-image (1).jpg' -> 'main-image%20%281%29.jpg'
  const encodedPath = cleanPath.split('/').map(part => encodeURIComponent(part)).join('/');
  
  // 3. 拼接
  return `${BASE_URL}${encodedPath}`;
};

// ==========================================

// 预处理数据
const DATA = (vaseData as any[]).map(item => ({
  ...item,
  assets: {
    image_url: fixUrl(item.assets.image_url),
    depth_url: fixUrl(item.assets.depth_url),
    parts: {
      neck: fixUrl(item.assets.parts.neck),
      body: fixUrl(item.assets.parts.body),
      base: fixUrl(item.assets.parts.base),
    }
  }
}));

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.UNIVERSE);
  const [selectedVases, setSelectedVases] = useState<Vase[]>([]);
  const [hybridParts, setHybridParts] = useState<{ neck: Vase | null; body: Vase | null; base: Vase | null }>({
    neck: null, body: null, base: null
  });

  // Mode 1: 搜索/分析逻辑 (演示用：内定结果)
  const handleAnalyze = () => {
    const targetIds = ["africa10", "main-image (15)", "americas22"];
    
    const matches = DATA.filter((item: Vase) => targetIds.includes(item.id));
    
    if (matches.length < 3) {
        const remaining = DATA.filter((item: Vase) => !targetIds.includes(item.id))
                              .sort(() => 0.5 - Math.random())
                              .slice(0, 3 - matches.length);
        matches.push(...remaining);
    }
    setSelectedVases(matches);
  };

  // Mode 2: 拼贴逻辑 (演示用：随机组合)
  const handleGenerateHybrid = () => {
    const shuffled = [...DATA].sort(() => 0.5 - Math.random());
    setHybridParts({
        neck: shuffled[0],
        body: shuffled[1],
        base: shuffled[2]
    });
  };

  const handleModeSwitch = (newMode: AppMode) => {
    setMode(newMode);
    if (newMode === AppMode.HYBRID) {
        setSelectedVases([]);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-soft-green">
      
      {/* Header */}
      <header className="h-16 flex-none bg-soft-green border-b border-earth-brown/20 flex items-center justify-between px-8 z-50">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-earth-brown rounded-sm"></div>
            <h1 className="font-serif text-2xl font-bold tracking-wider text-earth-brown">LATENT KILN</h1>
        </div>

        <div className="flex bg-white/50 p-1 rounded-lg backdrop-blur-sm">
            <button 
                onClick={() => handleModeSwitch(AppMode.UNIVERSE)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all font-sans text-sm font-medium ${mode === AppMode.UNIVERSE ? 'bg-earth-brown text-white shadow-md' : 'text-earth-brown hover:bg-earth-brown/10'}`}
            >
                <Box size={16} />
                UNIVERSE
            </button>
            <button 
                onClick={() => handleModeSwitch(AppMode.HYBRID)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all font-sans text-sm font-medium ${mode === AppMode.HYBRID ? 'bg-earth-brown text-white shadow-md' : 'text-earth-brown hover:bg-earth-brown/10'}`}
            >
                <Layers size={16} />
                REMIX
            </button>
        </div>

        <div className="hidden md:flex items-center text-earth-brown/60 hover:text-earth-brown cursor-help">
            <Info size={20} />
        </div>
      </header>

      {/* Main Split Layout */}
      <main className="flex-grow flex flex-col md:flex-row h-[calc(100vh-64px)] md:h-[calc(100dvh-64px)] overflow-hidden">
        
        {/* Left Panel */}
        <section className="h-[40vh] md:h-full md:w-[40%] p-4 md:p-6 flex flex-col border-r border-earth-brown/10 bg-white/50 z-20 shadow-xl overflow-hidden">
            <div className="mb-2 md:mb-4 flex-none">
                <h2 className="font-serif text-xl text-earth-brown">
                    {mode === AppMode.UNIVERSE ? 'Input Silhouette' : 'Input Component'}
                </h2>
                <p className="font-sans text-sm text-earth-brown/60 hidden md:block">
                    {mode === AppMode.UNIVERSE 
                        ? 'Draw a shape to find its historical morphological relatives.' 
                        : 'Sketch a curve to influence the generative assembly.'}
                </p>
            </div>
            
            <div className="flex-1 min-h-0 relative">
                <DrawingCanvas 
                    onAnalyze={handleAnalyze} 
                    onGenerate={handleGenerateHybrid}
                    mode={mode}
                />
            </div>
        </section>

        {/* Right Panel */}
        <section className="h-[60vh] md:h-full md:w-[60%] relative bg-gradient-to-br from-soft-green to-[#a6d8a5]/50 overflow-hidden">
            <div className="absolute inset-0 z-0">
                <UniverseView data={DATA} selectedVases={selectedVases} />
            </div>

            {mode === AppMode.HYBRID && (
                <div className="absolute inset-0 z-10 pointer-events-none">
                    <HybridView parts={hybridParts} />
                </div>
            )}
        </section>
      </main>
    </div>
  );
};

export default App;
