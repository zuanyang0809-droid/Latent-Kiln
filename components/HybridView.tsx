import React from 'react';
import { Vase } from '../types';
import { Download } from 'lucide-react';

interface HybridViewProps {
  parts: {
    neck: Vase | null;
    body: Vase | null;
    base: Vase | null;
  };
}

const HybridView: React.FC<HybridViewProps> = ({ parts }) => {
  const { neck, body, base } = parts;

  const hasHybrid = neck && body && base;

  return (
    // Outer container is transparent. Added pointer-events-none in parent, but we need auto here for interactions if we had them outside the center box. 
    // Actually, let's keep the layout simple. The parent passes pointer-events-none.
    // We make the interactive children pointer-events-auto.
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
             <div className="flex flex-col items-center drop-shadow-2xl filter sepia-[.1]">
                
                {/* Neck */}
                {neck && (
                  <div className="relative z-30 transition-all duration-700 ease-out transform translate-y-2 group">
                     <img 
                        src={neck.assets.parts.neck} 
                        alt="Neck Fragment"
                        className="h-32 object-contain w-32" 
                     />
                     <div className="absolute top-0 right-[-140px] bg-white/90 p-2 text-xs font-mono text-earth-brown border-l-2 border-earth-brown hidden md:block opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                        NECK: {neck.region}
                     </div>
                  </div>
                )}

                {/* Body */}
                {body && (
                  <div className="relative z-20 -my-2 transition-all duration-700 delay-100 ease-out group">
                     <img 
                        src={body.assets.parts.body} 
                        alt="Body Fragment"
                        className="h-48 object-contain w-56" 
                     />
                     <div className="absolute top-1/2 right-[-160px] bg-white/90 p-2 text-xs font-mono text-earth-brown border-l-2 border-earth-brown hidden md:block opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                        BODY: {body.region}
                     </div>
                  </div>
                )}

                {/* Base */}
                {base && (
                  <div className="relative z-10 transition-all duration-700 delay-200 ease-out transform -translate-y-4 group">
                     <img 
                        src={base.assets.parts.base} 
                        alt="Base Fragment"
                        className="h-24 object-contain w-36" 
                     />
                     <div className="absolute bottom-0 right-[-140px] bg-white/90 p-2 text-xs font-mono text-earth-brown border-l-2 border-earth-brown hidden md:block opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                        BASE: {base.region}
                     </div>
                  </div>
                )}
             </div>

             <div className="mt-8 flex flex-col items-center gap-2 bg-white/50 p-4 rounded-xl backdrop-blur-sm border border-white/60 shadow-sm">
                <h3 className="font-serif text-2xl text-earth-brown font-bold tracking-widest">HYBRID NO. {Math.floor(Math.random() * 9999)}</h3>
                <div className="flex gap-2 text-xs font-sans text-earth-brown/80 uppercase tracking-widest font-semibold">
                    <span>{neck?.period}</span> • <span>{body?.period}</span> • <span>{base?.period}</span>
                </div>
                <button className="mt-4 flex items-center gap-2 px-6 py-2 bg-earth-brown text-white rounded-full hover:bg-earth-brown-light transition-colors text-sm font-sans shadow-md">
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