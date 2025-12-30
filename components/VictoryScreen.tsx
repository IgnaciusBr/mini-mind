
import React from 'react';
import { Trophy, Calculator, RotateCcw } from 'lucide-react';
import { MemoryResult } from '../types';
import { calculateScore } from '../utils/scoring';

interface VictoryScreenProps { 
    result: MemoryResult; 
    best: number | null; 
    onRetry: () => void; 
    onSelectDifficulty: () => void;
}

export const VictoryScreen: React.FC<VictoryScreenProps> = ({ result, best, onRetry, onSelectDifficulty }) => {
    const score = calculateScore(result.timeSeconds, result.errors, result.difficulty);
    const isNewRecord = best === null || score > best; 

    return (
        <div className="absolute inset-0 z-[60] flex items-center justify-center p-4 md:p-8 animate-in zoom-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] shadow-2xl border-4 border-yellow-400 p-8 md:p-12 w-full max-w-lg text-center flex flex-col items-center gap-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-500 via-yellow-400 to-blue-500" />
                <div className="bg-yellow-100 p-6 rounded-full text-yellow-600 animate-bounce">
                    <Trophy size={64} />
                </div>
                <div>
                    <h2 className="text-4xl font-black text-slate-700 mb-2">Parabéns!</h2>
                    <p className="text-slate-500 font-medium">Você completou o desafio de {result.difficulty} pares!</p>
                </div>
                <div className="grid grid-cols-2 gap-4 w-full">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Tempo</span>
                        <span className="text-2xl font-black text-slate-700 font-mono">
                            {Math.floor(result.timeSeconds / 60)}:{(result.timeSeconds % 60).toString().padStart(2, '0')}
                        </span>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Erros</span>
                        <span className="text-2xl font-black text-slate-700">{result.errors}</span>
                    </div>
                    <div className="col-span-2 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-2xl border border-blue-100 flex items-center justify-between px-8">
                        <div>
                            <div className="flex items-center gap-1.5 mb-0.5">
                                <Calculator size={14} className="text-blue-400" />
                                <span className="text-xs font-bold text-blue-400 uppercase tracking-widest block text-left">Pontuação</span>
                            </div>
                            <span className="text-4xl font-black text-blue-600 tracking-tight">{score.toLocaleString()}</span>
                        </div>
                        {isNewRecord && (
                            <div className="bg-yellow-400 text-white px-3 py-1 rounded-full text-xs font-black animate-pulse shadow-sm">NOVO RECORDE!</div>
                        )}
                        {!isNewRecord && best && (
                            <div className="text-right">
                                <span className="text-[10px] font-bold text-slate-400 block uppercase">Melhor</span>
                                <span className="text-lg font-bold text-slate-500 font-mono">{best.toLocaleString()}</span>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex flex-col w-full gap-3 mt-4">
                    <button onClick={onRetry} className="w-full py-4 bg-blue-500 text-white rounded-2xl font-black text-xl shadow-lg shadow-blue-200 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3">
                        <RotateCcw size={24} /> Jogar Novamente
                    </button>
                    <button onClick={onSelectDifficulty} className="w-full py-3 bg-slate-100 text-slate-500 rounded-2xl font-bold hover:bg-slate-200 transition-colors">Trocar Nível</button>
                </div>
            </div>
        </div>
    );
};
