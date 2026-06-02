'use client';

import React from 'react';

export default function BlockLoader() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-5 bg-[#041404]/95 backdrop-blur-sm">
      <div className="grid grid-cols-3 gap-[9px] w-[78px]">
        {[...Array(9)].map((_, i) => (
          <span
            key={i}
            className={`block w-[22px] h-[22px] animate-block-pulse ${
              i === 4 ? 'bg-[#fbbf24] rounded-full' : 'bg-[#16a34a] rounded-[5px]'
            }`}
            style={{
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}
      </div>
      <p className="text-[0.8rem] font-medium tracking-[0.12em] uppercase text-white/60 font-inter">
        Loading
      </p>
      
      <style jsx>{`
        @keyframes block-pulse {
          0%, 100% { transform: scale(0.75); opacity: 0.25; }
          50%       { transform: scale(1.3);  opacity: 1; }
        }
        .animate-block-pulse {
          animation: block-pulse 1.3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
