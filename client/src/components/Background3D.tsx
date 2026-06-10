import React from 'react';

export function Background3D() {
  return (
    <>
      <div 
        className="fixed inset-0 z-0 pointer-events-none flex items-center justify-center overflow-hidden bg-[#020617]"
        style={{ perspective: '800px' }}
      >
        <div className="relative w-full h-full" style={{ transformStyle: 'preserve-3d' }}>
          
          {/* Floor */}
          <div 
            className="absolute opacity-20"
            style={{
              width: '200vw', height: '200vh',
              left: '-50vw', top: '-50vh',
              backgroundImage: 'linear-gradient(#0ea5e9 2px, transparent 2px), linear-gradient(90deg, #0ea5e9 2px, transparent 2px)',
              backgroundSize: '80px 80px',
              transform: 'rotateX(90deg) translateZ(-400px)',
              animation: 'gridMoveY 3s linear infinite'
            }}
          ></div>

          {/* Ceiling */}
          <div 
            className="absolute opacity-10"
            style={{
              width: '200vw', height: '200vh',
              left: '-50vw', top: '-50vh',
              backgroundImage: 'linear-gradient(#0ea5e9 1px, transparent 1px), linear-gradient(90deg, #0ea5e9 1px, transparent 1px)',
              backgroundSize: '80px 80px',
              transform: 'rotateX(-90deg) translateZ(-400px)',
              animation: 'gridMoveY 3s linear infinite'
            }}
          ></div>

          {/* Left Wall */}
          <div 
            className="absolute opacity-15"
            style={{
              width: '200vw', height: '200vh',
              left: '-50vw', top: '-50vh',
              backgroundImage: 'linear-gradient(#0ea5e9 2px, transparent 2px), linear-gradient(90deg, #0ea5e9 2px, transparent 2px)',
              backgroundSize: '80px 80px',
              transform: 'rotateY(90deg) translateZ(-800px)',
              animation: 'gridMoveX 3s linear infinite'
            }}
          ></div>

          {/* Right Wall */}
          <div 
            className="absolute opacity-15"
            style={{
              width: '200vw', height: '200vh',
              left: '-50vw', top: '-50vh',
              backgroundImage: 'linear-gradient(#0ea5e9 2px, transparent 2px), linear-gradient(90deg, #0ea5e9 2px, transparent 2px)',
              backgroundSize: '80px 80px',
              transform: 'rotateY(-90deg) translateZ(-800px)',
              animation: 'gridMoveXNegative 3s linear infinite'
            }}
          ></div>

          {/* Back Wall */}
          <div 
            className="absolute opacity-10"
            style={{
              width: '200vw', height: '200vh',
              left: '-50vw', top: '-50vh',
              backgroundImage: 'linear-gradient(#0ea5e9 2px, transparent 2px), linear-gradient(90deg, #0ea5e9 2px, transparent 2px)',
              backgroundSize: '80px 80px',
              transform: 'translateZ(-1000px)',
            }}
          ></div>

          {/* Gradient overlay to fade edges into darkness */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#020617_80%)] z-10" style={{ transform: 'translateZ(-1px)' }}></div>
        </div>
      </div>

      <style>{`
        @keyframes gridMoveY {
          from { background-position: 0 0; }
          to { background-position: 0 80px; }
        }
        @keyframes gridMoveX {
          from { background-position: 0 0; }
          to { background-position: -80px 0; }
        }
        @keyframes gridMoveXNegative {
          from { background-position: 0 0; }
          to { background-position: 80px 0; }
        }
      `}</style>
    </>
  );
}
