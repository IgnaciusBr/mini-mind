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
  showDots?: boolean; // Trigger grid rendering
  isFlat?: boolean; // New prop for flat style (Animals)
}

export const GameButton: React.FC<GameButtonProps> = ({ 
  text, 
  color, 
  onClick, 
  active = false, 
  size = 'normal',
  dimmed = false,
  className = '',
  isWhiteVariant = false,
  showDots = false,
  isFlat = false
}) => {
  // --- Visual Logic ---
  const textColor = isWhiteVariant ? '#cbd5e1' : '#ffffff'; 
  const shadowColor = isWhiteVariant ? '#e2e8f0' : 'rgba(0, 0, 0, 0.2)';
  
  // Base styles
  let buttonStyle: React.CSSProperties = {
    backgroundColor: isWhiteVariant ? '#ffffff' : color,
    color: textColor,
    borderColor: '#ffffff', // Always white border
    // Modern CSS: Allows font-size to be relative to the container size (cqh/cqw)
    containerType: 'size' as any, 
  };

  if (isFlat) {
      // Flat Style (Animals) - Solid color, border, no deep 3D shadow
      buttonStyle = {
          ...buttonStyle,
          boxShadow: active ? 'none' : '0 2px 4px rgba(0,0,0,0.1)', // Minimal shadow
          transform: active ? 'scale(0.95)' : 'scale(1)',
      };
  } else {
      // 3D Style (Numbers/Letters)
      buttonStyle = {
          ...buttonStyle,
          boxShadow: active 
            ? `0px 0px 0px 0px ${shadowColor}, inset 0px 6px 12px rgba(0,0,0,0.1)`
            : `0px 8px 0px 0px ${shadowColor}, 0px 15px 20px -5px rgba(0,0,0,0.15)`,
          transform: active ? 'translateY(4%)' : 'translateY(0px)',
      };
  }

  // Determine sizing classes
  // If className doesn't override width/aspect, use defaults.
  const sizeClasses = className.includes('w-') || className.includes('aspect-') 
    ? '' 
    : 'w-full aspect-square';

  return (
    <button
      onClick={onClick}
      className={`
        relative 
        flex items-center justify-center
        font-black select-none
        border-[4px] md:border-[6px] rounded-[15%] md:rounded-[2rem]
        transition-all duration-150 cubic-bezier(0.4, 0, 0.2, 1)
        ${sizeClasses}
        ${dimmed ? 'opacity-40 grayscale' : 'opacity-100'}
        ${className}
      `}
      style={buttonStyle}
      aria-label={text}
    >
      {/* Glossy Effects - Only render if NOT flat and NOT white variant */}
      {!isFlat && !isWhiteVariant && (
        <>
            <div className="absolute top-[8%] left-[8%] right-[8%] h-1/2 bg-gradient-to-b from-white/30 to-transparent rounded-t-[10%] pointer-events-none" />
            <div className="absolute top-[12%] right-[12%] w-[10%] h-[10%] bg-white/40 rounded-full blur-[1px] pointer-events-none" />
            <div className="absolute bottom-[8%] left-[8%] right-[8%] h-[10%] bg-gradient-to-t from-black/10 to-transparent rounded-b-[10%] pointer-events-none opacity-50" />
        </>
      )}
      
      {/* Content: Dots or Text */}
      <span className={`relative z-10 filter ${showDots ? 'w-full h-full p-[10%]' : 'drop-shadow-sm'} flex items-center justify-center`}>
        {showDots && !isNaN(parseInt(text)) ? (
            <DotGrid number={parseInt(text)} dotColor={isWhiteVariant ? color : '#FFFFFF'} />
        ) : (
             // Font size scales with container height (cqh) ensuring perfect fit regardless of button size
             <span style={{ fontSize: '50cqh', lineHeight: 1 }}>
                {text}
             </span>
        )}
      </span>
    </button>
  );
};

// --- Internal Dot Logic ---

// Maps number 1-9 to active cell indices in a 3x3 grid (0-8)
const DOT_PATTERNS: Record<number, number[]> = {
    1: [4],
    2: [2, 6], // Diagonal TopR, BotL
    3: [2, 4, 6], // Diagonal 3
    4: [0, 2, 6, 8], // Corners
    5: [0, 2, 4, 6, 8], // Corners + Center
    6: [0, 2, 3, 5, 6, 8], // 2 Columns
    7: [0, 2, 3, 4, 5, 6, 8], // H Shape (6 + Center)
    8: [0, 1, 2, 3, 5, 6, 7, 8], // Square O (Full except center)
    9: [0, 1, 2, 3, 4, 5, 6, 7, 8], // Full
};

const DotGrid: React.FC<{ number: number; dotColor: string }> = ({ number, dotColor }) => {
    
    // Helper Dot Component
    const Dot = ({ className }: { className?: string }) => (
        <div 
            className={`rounded-full shadow-sm ${className}`}
            style={{ backgroundColor: dotColor }} 
        />
    );

    return (
        // Container constrained to square aspect ratio to preserve pattern integrity (like a die face)
        <div className="aspect-square h-full max-h-full flex items-center justify-center">
            
            {/* Special Layout for 10: 3-4-3 Stack */}
            {number === 10 ? (
                <div className="flex flex-col justify-between w-full h-full py-[5%]">
                    {/* Row 1: 3 dots */}
                    <div className="flex justify-center gap-[4%]">
                        <Dot className="w-[18%] pb-[18%]" />
                        <Dot className="w-[18%] pb-[18%]" />
                        <Dot className="w-[18%] pb-[18%]" />
                    </div>
                    {/* Row 2: 4 dots */}
                    <div className="flex justify-center gap-[4%]">
                        <Dot className="w-[18%] pb-[18%]" />
                        <Dot className="w-[18%] pb-[18%]" />
                        <Dot className="w-[18%] pb-[18%]" />
                        <Dot className="w-[18%] pb-[18%]" />
                    </div>
                    {/* Row 3: 3 dots */}
                    <div className="flex justify-center gap-[4%]">
                        <Dot className="w-[18%] pb-[18%]" />
                        <Dot className="w-[18%] pb-[18%]" />
                        <Dot className="w-[18%] pb-[18%]" />
                    </div>
                </div>
            ) : (
                /* Standard 3x3 Grid for 1-9 */
                <div className="grid grid-cols-3 grid-rows-3 gap-[4%] w-full h-full place-items-center">
                    {Array.from({ length: 9 }, (_, i) => {
                        const isActive = DOT_PATTERNS[number]?.includes(i);
                        return (
                            <div key={i} className="flex items-center justify-center w-full h-full">
                                {isActive && (
                                    <Dot className="w-[60%] pb-[60%]" />
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};