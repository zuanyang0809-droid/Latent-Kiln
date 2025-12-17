import React, { useState } from 'react';
import { AppMode, Vase } from './types';
import { MOCK_DB } from './constants';
import DrawingCanvas from './components/DrawingCanvas';
import UniverseView from './components/UniverseView';
import HybridView from './components/HybridView';
import { Box, Layers, Info } from 'lucide-react';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.UNIVERSE);
  const [selectedVases, setSelectedVases] = useState<Vase[]>([]);
  const [hybridParts, setHybridParts] = useState<{ neck: Vase | null; body: Vase | null; base: Vase | null }>({
    neck: null, body: null, base: null
  });

  // Handlers
  const handleAnalyze = () => {
    // Mode 1: Pick 3 random vases to "Match" the silhouette
    const shuffled = [...MOCK_DB].sort(() => 0.5 - Math.random());
    const matches = shuffled.slice(0, 3);
    setSelectedVases(matches);
  };

  const handleGenerateHybrid = () => {
    // Mode 2: Pick random parts
    const shuffled = [...MOCK_DB].sort(() => 0.5 - Math.random());
    setHybridParts({
        neck: shuffled[0],
        body: shuffled[1],
        base: shuffled[2]
    });
  };

  const handleModeSwitch = (newMode: AppMode) => {
    setMode(newMode);
    // When switching modes, we can decide whether to clear selection or not.
    // For now, let's keep the universe clean when entering hybrid mode.
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

      {/* Main Split Layout - using dvh for better mobile support, fallback to vh */}
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
            
            {/* flex-1 min-h-0 ensures this container takes available space but doesn't force overflow */}
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
            
            {/* The Universe View is ALWAYS rendered in the background now */}
            <div className="absolute inset-0 z-0">
                <UniverseView data={MOCK_DB} selectedVases={selectedVases} />
            </div>

            {/* Hybrid View overlays the Universe View when active */}
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