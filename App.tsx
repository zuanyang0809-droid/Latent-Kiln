import React, { useState } from 'react';
import { AppMode, Vase } from './types';
import vaseData from './frontend_master_db.json'; 
import DrawingCanvas from './components/DrawingCanvas';
import UniverseView from './components/UniverseView';
import HybridView from './components/HybridView';
import { Box, Layers, Info, Loader2 } from 'lucide-react'; // 引入 Loader 图标
import { calculateAlignment, AlignmentData } from './utils/autoAlign'; // 【新增引入】

// ==========================================
// 核心修复区域：路径清洗机 (保持不变)
// ==========================================
const BASE_URL = "/Latent-Kiln/"; 
const fixUrl = (url: string) => {
  if (!url) return '';
  let cleanPath = url.replace(/^\.?\//, '');
  cleanPath = cleanPath.replace(/\.jpg$/i, '.png').replace(/\.jpeg$/i, '.png');
  const parts = cleanPath.split('/');
  const filename = parts.pop();
  const folderPath = parts.join('/');
  const encodedFilename = encodeURIComponent(filename || '');
  return `${BASE_URL}${folderPath}/${encodedFilename}`;
};

// ==========================================
// 数据预处理 (保持不变)
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
  
  // 零件状态
  const [hybridParts, setHybridParts] = useState<{ neck: Vase | null; body: Vase | null; base: Vase | null }>({
    neck: null, body: null, base: null
  });

  // 【新增状态】对齐参数 & 计算加载状态
  const [alignment, setAlignment] = useState<AlignmentData>({ neckScale: 1, baseScale: 1 });
  const [isAligning, setIsAligning] = useState(false);

  // Mode 1: 搜索逻辑 (保持不变)
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

  // === Mode 2: 智能拼贴逻辑 (修改为异步函数) ===
  const handleGenerateHybrid = async () => {
    // 1. 筛选逻辑 (保持不变)
    const validNecks = DATA.filter((v: Vase) => 
        v.assets.parts.neck && v.assets.parts.neck.length > BASE_URL.length && !v.assets.parts.neck.endsWith('/')
    );
    const validBodies = DATA.filter((v: Vase) => 
        v.assets.parts.body && v.assets.parts.body.length > BASE_URL.length && !v.assets.parts.body.endsWith('/')
    );
    const validBases = DATA.filter((v: Vase) => 
        v.assets.parts.base && v.assets.parts.base.length > BASE_URL.length && !v.assets.parts.base.endsWith('/')
    );

    if (validNecks.length === 0 || validBodies.length === 0 || validBases.length === 0) {
        console.error("没有足够的零件库！");
        return;
    }

    // 2. 随机抽取
    const randomNeck = validNecks[Math.floor(Math.random() * validNecks.length)];
    const randomBody = validBodies[Math.floor(Math.random() * validBodies.length)];
    const randomBase = validBases[Math.floor(Math.random() * validBases.length)];

    // 3. 先更新零件，让用户看到变化
    setHybridParts({
        neck: randomNeck,
        body: randomBody,
        base: randomBase
    });

    // 4. 【核心修改】计算对齐
    setIsAligning(true); // 开始加载
    
    // 调用我们在 utils 里写的算法
    const alignResult = await calculateAlignment(
        randomNeck.assets.parts.neck, 
        randomBody.assets.parts.body, 
        randomBase.assets.parts.base
    );
    
    setAlignment(alignResult); // 更新对齐数据
    setIsAligning(false); // 结束加载
  };

  const handleModeSwitch = (newMode: AppMode) => {
    setMode(newMode);
    if (newMode === AppMode.HYBRID) {
        setSelectedVases([]);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-soft-green">
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

      <main className="flex-grow flex flex-col md:flex-row h-[calc(100vh-64px)] md:h-[calc(100dvh-64px)] overflow-hidden">
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

        <section className="h-[60vh] md:h-full md:w-[60%] relative bg-gradient-to-br from-soft-green to-[#a6d8a5]/50 overflow-hidden">
            <div className="absolute inset-0 z-0">
                <UniverseView data={DATA} selectedVases={selectedVases} />
            </div>

            {mode === AppMode.HYBRID && (
                <div className="absolute inset-0 z-10 pointer-events-none w-full h-full">
                    {/* 【修改】在这里处理 HybridView 的 Props */}
                    {/* 注意：你需要修改 HybridView 组件来接收 alignment 和 isAligning */}
                    {/* 如果无法修改 HybridView 内部代码，你需要在这里用 div 包装样式 */}
                    
                    <HybridView 
                        parts={hybridParts} 
                        // @ts-ignore (如果 HybridView 还没加这个类型定义，暂时忽略 TS 报错)
                        alignment={alignment} 
                        isAligning={isAligning}
                    />

                    {/* 显示加载指示器 */}
                    {isAligning && (
                        <div className="absolute top-4 right-4 bg-white/80 p-2 rounded-full shadow-md animate-spin">
                            <Loader2 size={24} className="text-earth-brown" />
                        </div>
                    )}
                </div>
            )}
        </section>
      </main>
    </div>
  );
};

export default App;