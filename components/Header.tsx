
import React from 'react';
import { ArrowLeft, Menu, Lock, LockOpen } from 'lucide-react';
import { ContentType, GameMode } from '../types';

interface HeaderProps {
    view: 'HOME' | 'GAME' | 'DASHBOARD' | 'SETTINGS';
    title: string;
    goHome: () => void;
    toggleSidebar: () => void;
    isChildLocked: boolean;
    handleLockInteraction: () => void;
    
    // Toggles logic
    showToggle: boolean;
    contentType: ContentType;
    displayStyle: 'standard' | 'alternate';
    setDisplayStyle: React.Dispatch<React.SetStateAction<'standard' | 'alternate'>>;
}

export const Header: React.FC<HeaderProps> = ({ 
    view, title, goHome, toggleSidebar, isChildLocked, handleLockInteraction,
    showToggle, contentType, displayStyle, setDisplayStyle
}) => {
    
    // Only render if not home
    if (view === 'HOME') return null;

    return (
        <header className="h-14 md:h-16 shrink-0 flex items-center justify-between px-4 z-20 pt-safe mt-2">
            
            {/* Navigation Group - Disabled when Child Locked */}
            <div className={`flex items-center gap-3 transition-opacity duration-300 ${isChildLocked ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                {/* Back Button */}
                <button 
                    onClick={goHome} 
                    className="p-3 rounded-2xl bg-white shadow-lg shadow-slate-200/50 text-slate-600 hover:bg-slate-50 hover:scale-105 transition-all active:scale-95"
                    aria-label="Voltar para o início"
                    disabled={isChildLocked}
                >
                    <ArrowLeft size={20} strokeWidth={3} />
                </button>

                {/* Sidebar Toggle (Only GAME) */}
                {view === 'GAME' && (
                    <button 
                        onClick={toggleSidebar} 
                        className="p-3 rounded-2xl bg-white shadow-lg shadow-slate-200/50 text-slate-600 md:hidden active:scale-95 transition-transform"
                        disabled={isChildLocked}
                    >
                        <Menu size={20} />
                    </button>
                )}
            </div>

            <div className="flex-1 flex justify-center items-center gap-4 mx-4 min-w-0">
                 {/* Title hidden on mobile (hidden md:block) for ALL game modes to save space */}
                <h1 className={`text-xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 drop-shadow-sm truncate px-4 py-2 ${view === 'GAME' ? 'hidden md:block' : 'block'}`}>
                    {title}
                </h1>
            </div>
            
            <div className="w-auto flex justify-end shrink-0 gap-3">
                {/* Display Toggle - Disabled when Child Locked */}
                {showToggle && (
                <div 
                    className={`relative flex items-center bg-slate-100 rounded-full p-1 h-11 w-36 shadow-inner border border-slate-200 cursor-pointer transition-opacity duration-300 ${isChildLocked ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}
                    onClick={() => !isChildLocked && setDisplayStyle(prev => prev === 'standard' ? 'alternate' : 'standard')}
                >
                    <div 
                        className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-full shadow-sm border border-slate-100 transition-transform duration-300 ease-out ${
                            displayStyle === 'alternate' ? 'translate-x-full left-1' : 'translate-x-0 left-1'
                        }`}
                    />
                    <div className={`flex-1 z-10 flex items-center justify-center transition-colors duration-300 ${displayStyle === 'standard' ? 'text-blue-500 font-black' : 'text-slate-400 font-bold'}`}>
                        <span className="text-sm tracking-wider">{contentType === ContentType.NUMBERS ? '123' : 'ABC'}</span>
                    </div>
                    <div className="z-0 w-px h-4 bg-slate-300/50" />
                    <div className={`flex-1 z-10 flex items-center justify-center transition-colors duration-300 ${displayStyle === 'alternate' ? 'text-blue-500 font-black' : 'text-slate-400 font-bold'}`}>
                        {contentType === ContentType.NUMBERS ? (
                            <div className="flex gap-1">
                                <div className={`w-1.5 h-1.5 rounded-full ${displayStyle === 'alternate' ? 'bg-blue-500' : 'bg-slate-400'}`} />
                                <div className={`w-1.5 h-1.5 rounded-full ${displayStyle === 'alternate' ? 'bg-blue-500' : 'bg-slate-400'}`} />
                                <div className={`w-1.5 h-1.5 rounded-full ${displayStyle === 'alternate' ? 'bg-blue-500' : 'bg-slate-400'}`} />
                            </div>
                        ) : (
                            <span className="text-sm tracking-wider">abc</span>
                        )}
                    </div>
                </div>
                )}

                {/* Child Lock Button - Only visible in GAME */}
                {view === 'GAME' && (
                    <button 
                        onClick={handleLockInteraction}
                        className={`
                            p-3 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center
                            ${isChildLocked 
                                ? 'bg-red-500 text-white shadow-red-200' 
                                : 'bg-white text-slate-400 shadow-slate-200/50 hover:text-blue-500'
                            }
                        `}
                        aria-label={isChildLocked ? "Desbloquear tela" : "Bloquear tela"}
                    >
                        {isChildLocked ? <Lock size={20} strokeWidth={2.5} /> : <LockOpen size={20} strokeWidth={2.5} />}
                    </button>
                )}
            </div>
        </header>
    );
};
