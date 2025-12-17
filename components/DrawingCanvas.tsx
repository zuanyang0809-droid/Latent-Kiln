import React, { useRef, useEffect, useState } from 'react';
import { Eraser, Pen, RefreshCw } from 'lucide-react';

interface DrawingCanvasProps {
  onAnalyze: () => void;
  onGenerate: () => void;
  mode: 'UNIVERSE' | 'HYBRID';
}

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ onAnalyze, onGenerate, mode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Setup canvas context
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Resize handling
    const resizeCanvas = () => {
      if (containerRef.current && canvas) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        // Set actual canvas size to double for retina displays, then scale down with CSS
        canvas.width = width * 2;
        canvas.height = height * 2;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(2, 2);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.lineWidth = 4;
          ctx.strokeStyle = '#000000';
        }
      }
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas(); // Initial size

    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const { x, y } = getCoordinates(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Use clearRect to clear the drawing area
    // Note: canvas.width is scaled by 2, so we clear the scaled size
    ctx.clearRect(0, 0, canvas.width / 2, canvas.height / 2); 
    
    // Reset properties
    ctx.beginPath();
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-inner overflow-hidden border border-earth-brown/20 relative">
      {/* Header - Absolute to not affect flex flow, assuming minimal height overlap */}
      <div className="absolute top-4 left-4 z-10 flex gap-2 pointer-events-none">
        <div className="bg-earth-brown text-white p-2 rounded-full shadow-md pointer-events-auto">
          <Pen size={18} />
        </div>
      </div>

      {/* Canvas Container - flex-1 and min-h-0 are CRITICAL for nested flex scrolling/sizing */}
      <div ref={containerRef} className="flex-1 min-h-0 relative cursor-crosshair bg-white">
        <canvas
          ref={canvasRef}
          className="w-full h-full block touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {/* Helper grid or guide lines */}
        <div className="absolute inset-0 pointer-events-none opacity-10 flex items-center justify-center">
             <div className="w-[1px] h-full bg-earth-brown"></div>
        </div>
      </div>

      {/* Footer - flex-none ensures it never shrinks */}
      <div className="flex-none bg-stone-50 p-4 border-t border-earth-brown/20 flex justify-between items-center z-20 relative shadow-sm">
        <button 
          onClick={clearCanvas}
          className="flex items-center gap-2 text-earth-brown/70 hover:text-earth-brown transition-colors font-sans text-sm font-medium px-2 py-1"
        >
          <Eraser size={16} />
          CLEAR
        </button>

        <button
          onClick={mode === 'UNIVERSE' ? onAnalyze : onGenerate}
          className="flex items-center gap-2 bg-earth-brown hover:bg-earth-brown-light text-white px-5 py-2.5 rounded-md font-serif font-bold tracking-wide transition-all shadow-lg active:transform active:scale-95 text-sm"
        >
          {mode === 'UNIVERSE' ? (
            <>
              SEARCH / ANALYZE
            </>
          ) : (
            <>
              <RefreshCw size={16} />
              GENERATE
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default DrawingCanvas;