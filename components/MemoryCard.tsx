
import React from 'react';
import { GameItem } from '../types';
import { HelpCircle } from 'lucide-react';

interface MemoryCardProps {
  item: GameItem;
  isFlipped: boolean;
  isMatched: boolean;
  onClick: () => void;
}

export const MemoryCard: React.FC<MemoryCardProps> = ({ 
  item, 
  isFlipped, 
  isMatched, 
  onClick
}) => {
  return (
    <div 
      className={`relative w-full aspect-[4/5] cursor-pointer perspective-1000 ${isMatched ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      onClick={onClick}
    >
      <div 
        className={`relative w-full h-full transition-all duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}
        style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)', transformStyle: 'preserve-3d' }}
      >
        {/* VERSO */}
        <div 
          className="absolute inset-0 w-full h-full backface-hidden rounded-2xl bg-[#E6DBBF] border-4 border-white shadow-md flex items-center justify-center"
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
        >
          <HelpCircle className="text-[#8B7E5D] w-1/2 h-1/2 opacity-30" />
        </div>

        {/* FRENTE */}
        <div 
          className="absolute inset-0 w-full h-full backface-hidden rounded-2xl bg-white border-4 border-white shadow-md flex flex-col items-center"
          style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
        >
          <div className="flex-1 w-full flex items-center justify-center p-2 min-h-0">
            {item.image ? (
              <img src={item.image} alt={item.text} className="max-w-full max-h-full object-contain" />
            ) : (
              <span className="text-3xl font-black text-slate-700">{item.text}</span>
            )}
          </div>
          <div className="w-full bg-[#E6DBBF]/30 py-1 flex items-center justify-center">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">{item.text}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
