
import React from 'react';

interface GameButtonProps {
  text: string;
  color: string;
  onClick: (e: React.MouseEvent | React.TouchEvent) => void;
  active?: boolean;
  size?: 'normal' | 'large';
  dimmed?: boolean;
  className?: string;
  isWhiteVariant?: boolean;
  showDots?: boolean; 
  isFlat?: boolean; 
}

export const GameButton: React.FC<GameButtonProps> = ({ 
  text, 
  color, 
  onClick, 
  active = false, 
  dimmed = false,
  className = '',
  isWhiteVariant = false,
  showDots = false,
  isFlat = false
}) => {
  const textColor = isWhiteVariant ? '#cbd5e1' : '#ffffff'; 
  const shadowColor = isWhiteVariant ? '#e2e8f0' : 'rgba(0, 0, 0, 0.2)';
  
  let buttonStyle: React.CSSProperties = {
    backgroundColor: isWhiteVariant ? '#ffffff' : color,
    color: textColor,
    borderColor: '#ffffff',
    containerType: 'size' as any, 
  };

  // Improved Physics & Visuals
  if (isFlat) {
      buttonStyle = {
          ...buttonStyle,
          boxShadow: active ? 'inset 0 2px 4px rgba(0,0,0,0.1)' : '0 4px 12px rgba(0,0,0,0.08)', 
          transform: active ? 'scale(0.92)' : 'scale(1)',
      };
  } else {
      buttonStyle = {
          ...buttonStyle,
          boxShadow: active 
            ? `0px 0px 0px 0px ${shadowColor}, inset 0px 4px 8px rgba(0,0,0,0.2)`
            : `0px 8px 0px 0px ${shadowColor}, 0px 15px 20px -5px rgba(0,0,0,0.25)`,
          transform: active ? 'translateY(8px)' : 'translateY(0px)',
      };
  }

  const sizeClasses = className.includes('w-') || className.includes('aspect-') 
    ? '' 
    : 'w-full aspect-square';

  return (
    <button
      onClick={onClick}
      className={`
        relative group
        flex items-center justify-center
        font-black select-none
        border-[4px] md:border-[6px] rounded-[20%] md:rounded-[2.5rem]
        transition-all duration-150 cubic-bezier(0.34, 1.56, 0.64, 1)
        active:duration-75
        ${sizeClasses}
        ${dimmed ? 'opacity-40 grayscale' : 'opacity-100 animate-pop'}
        ${className}
      `}
      style={buttonStyle}
      aria-label={text}
    >
      {!isFlat && !isWhiteVariant && (
        <>
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent rounded-t-[18%] pointer-events-none" />
            <div className="absolute top-[10%] right-[10%] w-[12%] h-[12%] bg-white/40 rounded-full blur-[1px] pointer-events-none" />
        </>
      )}
      
      <span className={`relative z-10 filter ${showDots ? 'w-full h-full p-[12%]' : 'drop-shadow-sm'} flex items-center justify-center`}>
        {showDots && !isNaN(parseInt(text)) ? (
            <DotGrid number={parseInt(text)} dotColor={isWhiteVariant ? color : '#FFFFFF'} />
        ) : (
             <span style={{ fontSize: '50cqh', lineHeight: 1 }}>
                {text}
             </span>
        )}
      </span>
    </button>
  );
};

const DOT_PATTERNS: Record<number, number[]> = {
    1: [4], 2: [2, 6], 3: [2, 4, 6], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8], 7: [0, 2, 3, 4, 5, 6, 8], 8: [0, 1, 2, 3, 5, 6, 7, 8], 9: [0, 1, 2, 3, 4, 5, 6, 7, 8],
};

const Dot: React.FC<{ className?: string; color: string }> = ({ className, color }) => (
    <div className={`rounded-full shadow-sm ${className}`} style={{ backgroundColor: color }} />
);

const DotGrid: React.FC<{ number: number; dotColor: string }> = ({ number, dotColor }) => {
    return (
        <div className="aspect-square h-full max-h-full flex items-center justify-center">
            {number === 10 ? (
                <div className="flex flex-col justify-between w-full h-full py-[5%]">
                    {[3,4,3].map((count, r) => (
                        <div key={r} className="flex justify-center gap-[4%]">
                            {Array.from({length: count}).map((_, i) => <Dot key={i} className="w-[18%] pb-[18%]" color={dotColor} />)}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-3 grid-rows-3 gap-[4%] w-full h-full place-items-center">
                    {Array.from({ length: 9 }, (_, i) => {
                        const isActive = DOT_PATTERNS[number]?.includes(i);
                        return <div key={i} className="flex items-center justify-center w-full h-full">{isActive && <Dot className="w-[60%] pb-[60%]" color={dotColor} />}</div>;
                    })}
                </div>
            )}
        </div>
    );
};
