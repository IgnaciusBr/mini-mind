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

export const MemoryCard: React.FC<MemoryCardProps> = ({ 
  item, 
  isFlipped, 
  isMatched, 
  onClick,
  disabled = false
}) => {
  return (
    <div 
      className={`
        relative group perspective-1000 w-full h-full cursor-pointer
        ${(isMatched || disabled) ? 'pointer-events-none' : ''}
      `}
      onClick={onClick}
    >
      <div 
        className={`
          w-full h-full transition-all duration-500 transform-style-3d shadow-lg rounded-xl
          ${isFlipped ? 'rotate-y-180' : ''}
          ${isMatched ? 'opacity-0 scale-90' : 'opacity-100'} 
        `}
        style={{ 
            opacity: isMatched ? 0 : 1, // Matched cards become invisible
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            transformStyle: 'preserve-3d',
        }}
      >
        {/* FRONT (Verso da carta - Interrogação) */}
        <div 
            className="absolute inset-0 w-full h-full backface-hidden rounded-xl flex items-center justify-center border-4 border-white"
            style={{ 
                backgroundColor: '#E6DBBF',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden'
            }}
        >
          <HelpCircle className="text-orange-900/40 w-1/2 h-1/2" />
        </div>

        {/* BACK (Frente da carta - Imagem e Texto) */}
        <div 
          className="absolute inset-0 w-full h-full backface-hidden rounded-xl overflow-hidden border-4 border-white bg-[#E6DBBF]"
          style={{ 
            transform: 'rotateY(180deg)',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden'
          }}
        >
            {/* Área da Imagem: Ocupa a parte superior, deixando espaço proporcional para o texto */}
            <div className="absolute top-0 left-0 right-0 bottom-[20%] flex items-center justify-center p-2">
                {item.image ? (
                    <img 
                        src={item.image} 
                        alt={item.text} 
                        className="max-w-full max-h-full object-contain drop-shadow-sm"
                    />
                ) : (
                    <span className="text-4xl font-bold text-slate-700">{item.text}</span>
                )}
            </div>

            {/* Área do Texto: Proporcional e responsiva */}
            <div 
                className="absolute bottom-[4%] left-[4%] right-[4%] h-[16%] flex items-center justify-center bg-white/50 rounded-lg backdrop-blur-sm"
                style={{ containerType: 'size' }}
            >
                <span 
                    className="text-slate-800 font-black uppercase tracking-wider w-full text-center whitespace-nowrap"
                    style={{ fontSize: '65cqh', lineHeight: 1 }}
                >
                    {item.text}
                </span>
            </div>
        </div>
      </div>
    </div>
  );
};