import React, { useState } from 'react';
import { AppMode, Vase } from './types';
import vaseData from './frontend_master_db.json'; 
import DrawingCanvas from './components/DrawingCanvas';
import UniverseView from './components/UniverseView';
import HybridView from './components/HybridView';
import { Box, Layers, Info } from 'lucide-react';

// ==========================================
// 核心修复区域：路径清洗机
// ==========================================

// 1. 设置 Base URL (GitHub Pages 必须)
const BASE_URL = "/Latent-Kiln/"; 

const fixUrl = (url: string) => {
  if (!url) return '';
  
  // A. 去掉开头的 ./ 或 /
  let cleanPath = url.replace(/^\.?\//, '');

  // B. 【强制修复后缀】如果碰到 .jpg/.jpeg，强行变成 .png
  // 因为去背景后的图全是 png
  cleanPath = cleanPath.replace(/\.jpg$/i, '.png').replace(/\.jpeg$/i, '.png');

  // C. 【强制修复文件名】如果文件名里有空格或括号，替换成下划线 _
  // (假设你之前运行过 sanitize_assets.py，文件名已经是下划线了)
  // 如果你没运行过那个脚本，这一步可以保留原样，用 encodeURIComponent
  // 为了保险，我们先假设文件名还是乱的，用编码方式处理：
  const parts = cleanPath.split('/');
  const filename = parts.pop(); // 拿到文件名
  const folderPath = parts.join('/');
  
  // 对文件名进行 URL 编码 (处理空格 %20 和括号)
  // 如果你的文件名已经全是下划线了，这步也不会报错
  const encodedFilename = encodeURIComponent(filename || '');
  
  // D. 拼接最终路径
  return `${BASE_URL}${folderPath}/${encodedFilename}`;
};

// ==========================================

// 2. 预处理数据
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

  // Mode 1: 搜索逻辑 (内定演示)
  const handleAnalyze = () => {
    // 确保这些 ID 对应的图片在你的 public/assets/images/original 里是存在的！
    // 建议改成你确定存在的文件名（不带后缀）
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

// === Mode 2: 智能拼贴逻辑 (自动过滤缺失零件) ===
  const handleGenerateHybrid = () => {
    // 1. 筛选出所有拥有 "Neck" (瓶口) 的花瓶
    // 逻辑：检查路径是否为空，且不仅是 Base URL
    const validNecks = DATA.filter((v: Vase) => 
        v.assets.parts.neck && 
        v.assets.parts.neck.length > BASE_URL.length &&
        !v.assets.parts.neck.endsWith('/') // 防止只有路径没有文件名
    );

    // 2. 筛选出所有拥有 "Body" (瓶身) 的花瓶
    const validBodies = DATA.filter((v: Vase) => 
        v.assets.parts.body && 
        v.assets.parts.body.length > BASE_URL.length &&
        !v.assets.parts.body.endsWith('/')
    );

    // 3. 筛选出所有拥有 "Base" (底座) 的花瓶
    const validBases = DATA.filter((v: Vase) => 
        v.assets.parts.base && 
        v.assets.parts.base.length > BASE_URL.length &&
        !v.assets.parts.base.endsWith('/')
    );

    // 如果数据太少，防止崩溃
    if (validNecks.length === 0 || validBodies.length === 0 || validBases.length === 0) {
        console.error("没有足够的零件库！");
        return;
    }

    // 4. 从各自的池子里随机抽取
    // 这样即使花瓶A没有头，它的身子依然可以被用在拼贴里
    const randomNeck = validNecks[Math.floor(Math.random() * validNecks.length)];
    const randomBody = validBodies[Math.floor(Math.random() * validBodies.length)];
    const randomBase = validBases[Math.floor(Math.random() * validBases.length)];

    setHybridParts({
        neck: randomNeck,
        body: randomBody,
        base: randomBase
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
