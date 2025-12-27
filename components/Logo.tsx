import React from 'react';

interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className }) => {
  return (
    <svg 
      viewBox="0 0 220 60" 
      className={className} 
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
    >
      {/* Ícone Divertido (Estrela/Mascote) */}
      <g transform="translate(10, 5)">
         {/* Fundo do ícone */}
         <circle cx="25" cy="25" r="25" fill="#F472B6" />
         <circle cx="25" cy="25" r="20" fill="#FBCFE8" />
         
         {/* Rosto */}
         <circle cx="18" cy="22" r="3" fill="#831843" />
         <circle cx="32" cy="22" r="3" fill="#831843" />
         <path 
           d="M18 32 Q25 40 32 32" 
           stroke="#831843" 
           strokeWidth="3" 
           strokeLinecap="round" 
         />
         
         {/* Brilho */}
         <circle cx="35" cy="12" r="4" fill="white" opacity="0.6" />
      </g>

      {/* Texto "Aprenda" */}
      <text 
        x="65" 
        y="32" 
        fontFamily="'Fredoka', sans-serif" 
        fontWeight="700" 
        fontSize="28" 
        fill="#475569"
      >
        Aprenda
      </text>

      {/* Texto "BRINCANDO" */}
      <text 
        x="66" 
        y="50" 
        fontFamily="'Fredoka', sans-serif" 
        fontWeight="600" 
        fontSize="14" 
        fill="#F472B6" 
        letterSpacing="2"
      >
        BRINCANDO
      </text>
    </svg>
  );
};