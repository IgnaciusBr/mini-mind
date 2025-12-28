
import React from 'react';
import { GameItem } from '../types';
import { HelpCircle } from 'lucide-react';

interface MemoryCardProps {
  item: GameItem;
  isFlipped: boolean;
  isMatched: boolean;
  onClick: () => void;
}

export const MemoryCard: React.FC<MemoryCardProps> = ({ item, isFlipped, isMatched, onClick }) => {
  return (
    <div className={`relative w-full aspect-[1/1.2] cursor-pointer perspective-1000 ${isMatched ? 'opacity-0 pointer-events-none' : 'opacity-100'}`} onClick={onClick}>
      <div className="relative w-full h-full transition-all duration-500 transform-style-3d" style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)', transformStyle: 'preserve-3d' }}>
        {/* BACK */}
        <div className="absolute inset-0 w-full h-full backface-hidden rounded-2xl bg-[#E6DBBF] border-2 border-white shadow-md flex items-center justify-center" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
          <HelpCircle className="text-[#8B7E5D] w-1/3 h-1/3 opacity-30" />
        </div>
        {/* FRONT */}
        <div className="absolute inset-0 w-full h-full backface-hidden rounded-2xl bg-white border-2 border-white shadow-md flex flex-col items-center justify-between" style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
          <div className="flex-1 w-full flex items-center justify-center p-2">
            {item.image ? (
              <img src={item.image} className="max-w-full max-h-full object-contain" />
            ) : (
              <span className="text-2xl font-black text-slate-700">{item.text}</span>
            )}
          </div>
          <div className="w-full bg-[#F8F1E1] py-1 text-center rounded-b-2xl">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter truncate px-1 block">{item.text}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
