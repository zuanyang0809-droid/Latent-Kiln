import React, { useState } from 'react';
import { AppMode, Vase } from './types';
import { vaseData } from './data/vaseData'; // 确保这个路径和你实际文件位置一致
import DrawingCanvas from './components/DrawingCanvas';
import UniverseView from './components/UniverseView';
import HybridView from './components/HybridView';
import { Box, Layers, Info } from 'lucide-react';

// === 1. 路径修复逻辑 (解决 GitHub Pages 图片不显示问题) ===
const BASE_URL = import.meta.env.BASE_URL; // 获取 vite.config.ts 里的 base

const fixUrl = (url: string) => {
  if (!url) return '';
  // 去掉开头的 ./ 或 /，然后加上 base 路径
  const cleanPath = url.replace(/^\.?\//, '');
  return `${BASE_URL}${cleanPath}`;
};

// === 2. 预处理数据 (把所有图片路径都修好) ===
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

  // === 3. 搜索/分析逻辑 (演示用：内定结果) ===
  const handleAnalyze = () => {
    // 这里填入你想在 Presentation 中展示的那 3 个完美花瓶的 ID
    // 请确保这些 ID 在你的 json 文件里是存在的！
    const targetIds = ["africa10", "main-image (15)", "americas22"];
    
    // 尝试找到这 3 个
    const matches = DATA.filter((item: Vase) => targetIds.includes(item.id));
    
    // 如果没找够（防止ID写错），就随机补齐，保证不报错
    if (matches.length < 3) {
        const remaining = DATA.filter((item: Vase) => !targetIds.includes(item.id))
                              .sort(() => 0.5 - Math.random())
                              .slice(0, 3 - matches.length);
        matches.push(...remaining);
    }

    setSelectedVases(matches);
  };

  // === 4. 拼贴逻辑 (演示用：随机组合) ===
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
        
        {/* Left Panel: Drawing Canvas (40%) */}
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

        {/* Right Panel: Visualization (60%) */}
        <section className="h-[60vh] md:h-full md:w-[60%] relative bg-gradient-to-br from-soft-green to-[#a6d8a5]/50 overflow-hidden">
            
            {/* The Universe View */}
            <div className="absolute inset-0 z-0">
                {/* 使用处理过的 DATA */}
                <UniverseView data={DATA} selectedVases={selectedVases} />
            </div>

            {/* Hybrid View */}
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
