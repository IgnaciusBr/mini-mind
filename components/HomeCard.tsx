
import React from 'react';

interface HomeCardProps { 
    title: string; 
    gradient: string; 
    shadowColor: string; 
    content: React.ReactNode; 
    onClick: () => void 
}

export const HomeCard: React.FC<HomeCardProps> = ({ title, gradient, shadowColor, content, onClick }) => (
    <button 
        onClick={onClick}
        className={`
            w-full aspect-[4/3] rounded-[2rem] 
            ${gradient} 
            shadow-[0_10px_0_0_rgba(0,0,0,0.1)] 
            active:shadow-none active:translate-y-[10px] 
            border-b-[8px] border-black/10
            flex flex-col items-center justify-center gap-2 
            text-white transition-all relative overflow-hidden group
        `}
    >
        {/* Glossy overlay */}
        <div className="absolute top-0 left-0 w-full h-1/2 bg-white/20 rounded-t-[2rem] pointer-events-none" />
        
        {/* Content */}
        <div className="transform group-hover:scale-110 transition-transform duration-300 drop-shadow-md">
            {content}
        </div>
        
        <span className="text-lg md:text-xl font-black tracking-wide drop-shadow-sm z-10">{title}</span>

        {/* Decorative Circles */}
        <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-white/10 rounded-full" />
        <div className="absolute top-4 left-4 w-8 h-8 bg-white/10 rounded-full" />
    </button>
);
