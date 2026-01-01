
import React from 'react';
import { GameItem } from '../types';
import { HelpCircle } from 'lucide-react';

interface MemoryCardProps {
  item: GameItem;
  isFlipped: boolean;
  isMatched: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export const MemoryCard: React.FC<MemoryCardProps> = ({ item, isFlipped, isMatched, onClick, disabled = false }) => {
  const getFontSize = (text: string) => {
    if (text.length > 10) return '35cqh';
    if (text.length > 7) return '50cqh';
    return '65cqh';
  };

  return (
    <div 
      className={`relative group w-full h-full cursor-pointer select-none ${(isMatched || disabled) ? 'pointer-events-none' : ''}`}
      onClick={onClick}
      style={{ perspective: '1000px' }} // Ensure perspective is set on the container
    >
      <div 
        className={`
          w-full h-full transition-all duration-500 rounded-xl shadow-lg border-b-4 border-black/10
          ${isMatched ? 'opacity-0 scale-75' : 'opacity-100'} 
        `}
        style={{ 
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            transition: 'transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.5s'
        }}
      >
        {/* FRONT (Verso/Interrogação - Lado oculto) */}
        <div 
            className="absolute inset-0 w-full h-full rounded-xl flex items-center justify-center border-[3px] border-white/50 bg-[#E6DBBF]"
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
        >
          <div className="absolute inset-0 bg-white/10 rounded-xl" />
          <HelpCircle className="text-orange-900/20 w-1/2 h-1/2" />
        </div>

        {/* BACK (Frente/Conteúdo - Lado revelado) */}
        <div 
          className="absolute inset-0 w-full h-full rounded-xl overflow-hidden border-[3px] border-white/50"
          style={{ 
            backgroundColor: item.color,
            transform: 'rotateY(180deg)',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden'
          }}
        >
            {/* Glossy Effect (Igual ao GameButton) */}
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />
            <div className="absolute top-[10%] right-[10%] w-[12%] h-[12%] bg-white/40 rounded-full blur-[1px] pointer-events-none" />

            <div className="absolute top-0 left-0 right-0 bottom-[20%] flex items-center justify-center p-2">
                {item.image ? (
                    <img src={item.image} alt={item.text} className="max-w-full max-h-full object-contain drop-shadow-sm" />
                ) : (
                    <span className="text-4xl font-black text-white drop-shadow-md">{item.text}</span>
                )}
            </div>
            
            <div 
                className="absolute bottom-[4%] left-[4%] right-[4%] h-[16%] flex items-center justify-center bg-white/90 rounded-lg backdrop-blur-sm px-1 shadow-sm"
                style={{ containerType: 'size' }}
            >
                <span className="text-slate-700 font-black uppercase tracking-wider w-full text-center whitespace-nowrap" style={{ fontSize: getFontSize(item.text), lineHeight: 1 }}>
                    {item.text}
                </span>
            </div>
        </div>
      </div>
    </div>
  );
};
