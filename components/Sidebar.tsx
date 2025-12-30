
import React from 'react';
import { Logo } from './Logo';
import { SidebarBtn } from './SidebarBtn';
import { ContentType, GameMode } from '../types';
import { X, Hash, Type, Volume2, Cat, Eye, Play, HelpCircle, Grid, Pencil } from 'lucide-react';

interface SidebarProps {
    isOpen: boolean;
    toggle: () => void;
    contentType: ContentType;
    gameMode: GameMode;
    setGameMode: (mode: GameMode) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggle, contentType, gameMode, setGameMode }) => {
    
    const handleModeSelect = (mode: GameMode) => {
        setGameMode(mode);
        if(window.innerWidth < 768) toggle();
    };

    return (
        <>
            <div className={`fixed inset-y-4 left-4 z-50 w-72 bg-white/90 backdrop-blur-xl shadow-2xl rounded-3xl border border-white/50 transform transition-transform duration-300 ease-in-out flex flex-col md:absolute md:translate-x-0 md:h-auto md:m-0 md:rounded-3xl md:top-4 md:left-4 md:bottom-4 mb-safe ${isOpen ? 'translate-x-0' : '-translate-x-[120%]'}`}>
                <div className="p-6 border-b border-slate-100/50 flex justify-between items-center h-24 shrink-0">
                    <Logo className="h-14 w-auto" />
                    <button onClick={toggle} className="md:hidden p-2 bg-slate-100 rounded-full text-slate-500"><X size={20} /></button>
                </div>
                
                {/* Current Mode Indicator */}
                <div className="px-4 pt-4">
                    <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100 text-center">
                        <span className="text-xs font-bold text-blue-400 uppercase tracking-widest block mb-1">Modo Atual</span>
                        <div className="font-black text-blue-600 text-lg flex items-center justify-center gap-2">
                            {contentType === ContentType.NUMBERS && <Hash size={20} />}
                            {contentType === ContentType.ALPHABET && <Type size={20} />}
                            {contentType === ContentType.VOWELS && <Volume2 size={20} />}
                            {contentType === ContentType.ANIMALS && <Cat size={20} />}
                            <span>{contentType}</span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-8">
                <div>
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">Modo de Jogo</h3>
                    <div className="space-y-3">
                        <SidebarBtn active={gameMode === GameMode.EXPLORE} onClick={() => handleModeSelect(GameMode.EXPLORE)} icon={<Eye size={20} />} label="Explorar" colorClass="bg-orange-400 shadow-orange-200" />
                        <SidebarBtn active={gameMode === GameMode.FLASHCARD} onClick={() => handleModeSelect(GameMode.FLASHCARD)} icon={<Play size={20} />} label="Flashcards" colorClass="bg-pink-400 shadow-pink-200" />
                        <SidebarBtn active={gameMode === GameMode.QUIZ} onClick={() => handleModeSelect(GameMode.QUIZ)} icon={<HelpCircle size={20} />} label="Quiz" colorClass="bg-teal-400 shadow-teal-200" />
                        
                        {/* Conditional Mode Button: Memory for Animals, Tracing for Others */}
                        {contentType === ContentType.ANIMALS ? (
                            <SidebarBtn active={gameMode === GameMode.MEMORY} onClick={() => handleModeSelect(GameMode.MEMORY)} icon={<Grid size={20} />} label="Memória" colorClass="bg-indigo-400 shadow-indigo-200" />
                        ) : (
                            <SidebarBtn active={gameMode === GameMode.TRACING} onClick={() => handleModeSelect(GameMode.TRACING)} icon={<Pencil size={20} />} label="Desenhar" colorClass="bg-indigo-400 shadow-indigo-200" />
                        )}
                    </div>
                </div>
                </div>
            </div>
            {isOpen && (<div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden" onClick={toggle} />)}
        </>
    );
};
