
import React, { useState, useEffect, useRef } from 'react';
import { GameItem, MemoryResult } from '../types';
import { MemoryCard } from './MemoryCard';
import { VictoryScreen } from './VictoryScreen';
import { db } from '../firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { calculateScore } from '../utils/scoring';
import { Clock, AlertCircle, Settings, RotateCcw } from 'lucide-react';
import { ConfettiHandle } from './Confetti';

interface MemoryCardState {
    id: string; 
    pairId: string; 
    item: GameItem;
    isFlipped: boolean;
    isMatched: boolean;
}

interface MemoryGameProps {
    items: GameItem[]; // Should be animals list
    user: User | null;
    speak: (text: string) => void;
    confettiRef: React.RefObject<ConfettiHandle>;
    onExit: () => void; // Used to change mode if needed, though this component handles its own restart
}

export const MemoryGame: React.FC<MemoryGameProps> = ({ items, user, speak, confettiRef, onExit }) => {
    // Game State
    const [difficulty, setDifficulty] = useState<number>(6); 
    const [isSetup, setIsSetup] = useState(false); 
    const [cards, setCards] = useState<MemoryCardState[]>([]);
    
    // Session State
    const [time, setTime] = useState(0);
    const [errors, setErrors] = useState(0);
    const [isTimerActive, setIsTimerActive] = useState(false);
    const [isVictory, setIsVictory] = useState(false);
    const [blockInput, setBlockInput] = useState(false);
    
    // Results
    const [lastResult, setLastResult] = useState<MemoryResult | null>(null);
    const [personalBest, setPersonalBest] = useState<number | null>(null);
    const [history, setHistory] = useState<MemoryResult[]>([]);

    const timerRef = useRef<any>(null);
    const previewTimeoutRef = useRef<any>(null);

    // Load History on Mount
    useEffect(() => {
        if (user) {
            getDocs(collection(db, "users", user.uid, "memory_results"))
                .then(snap => setHistory(snap.docs.map(d => d.data() as MemoryResult)))
                .catch(console.error);
        }
    }, [user]);

    // Timer Logic - ISOLATED here! App.tsx doesn't re-render!
    useEffect(() => {
        if (isTimerActive) {
            timerRef.current = setInterval(() => setTime(prev => prev + 1), 1000);
        } else {
            clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
    }, [isTimerActive]);

    const startGame = (pairCount: number) => {
        if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
        if (items.length === 0) return;
    
        setBlockInput(true);
        setDifficulty(pairCount);
        setIsVictory(false);
        setLastResult(null);
        
        const shuffledItems = [...items].sort(() => Math.random() - 0.5);
        const selectedItems = shuffledItems.slice(0, pairCount);
        
        let newCards: MemoryCardState[] = [];
        selectedItems.forEach(item => {
            newCards.push({ id: `${item.id}-1`, pairId: item.id, item, isFlipped: true, isMatched: false });
            newCards.push({ id: `${item.id}-2`, pairId: item.id, item, isFlipped: true, isMatched: false });
        });
    
        newCards = newCards.sort(() => Math.random() - 0.5);
        setCards(newCards);
        setIsSetup(true);
        setTime(0);
        setErrors(0);
        setIsTimerActive(false);
    
        speak("Memorize as cartas!");
        previewTimeoutRef.current = setTimeout(() => {
            setCards(prev => prev.map(c => ({ ...c, isFlipped: false })));
            setBlockInput(false);
            speak("Valendo!");
            setIsTimerActive(true);
        }, Math.max(2000, pairCount * 400));
    };

    const saveResult = () => {
        const result: MemoryResult = {
            id: Date.now().toString(),
            date: Date.now(),
            difficulty: difficulty,
            timeSeconds: time,
            errors: errors
        };
    
        const allResults = [...history, result];
        const previousBestScore = history
            .filter(r => r.difficulty === difficulty)
            .reduce((best, curr) => {
                const score = calculateScore(curr.timeSeconds, curr.errors, curr.difficulty);
                return (!best || score > best) ? score : best;
            }, null as number | null);
            
        setPersonalBest(previousBestScore);
        setHistory(allResults);
    
        if (user) {
            addDoc(collection(db, "users", user.uid, "memory_results"), result)
                .catch(err => console.error("Error saving memory result:", err));
        }
        return result;
    };

    const handleCardClick = (cardId: string) => {
        if (blockInput || isVictory) return;
        const cardIndex = cards.findIndex(c => c.id === cardId);
        if (cardIndex === -1 || cards[cardIndex].isFlipped || cards[cardIndex].isMatched) return;
    
        const newCards = [...cards];
        newCards[cardIndex].isFlipped = true;
        setCards(newCards);
        speak(newCards[cardIndex].item.spokenText || newCards[cardIndex].item.text);
    
        const flippedCards = newCards.filter(c => c.isFlipped && !c.isMatched);
        if (flippedCards.length === 2) {
            setBlockInput(true);
            const [c1, c2] = flippedCards;
            
            if (c1.pairId === c2.pairId) {
                // Match
                setTimeout(() => {
                    const updatedCards = newCards.map(c => (c.id === c1.id || c.id === c2.id) ? { ...c, isMatched: true } : c);
                    setCards(updatedCards);
                    
                    if (confettiRef.current) confettiRef.current.explode(window.innerWidth / 2, window.innerHeight / 2);
                    
                    const allMatched = updatedCards.every(c => c.isMatched);
                    if (allMatched) {
                        setIsTimerActive(false);
                        const result = saveResult();
                        setLastResult(result);
                        setTimeout(() => {
                            setIsVictory(true);
                            speak("Incrível! Você conseguiu completar o desafio!");
                        }, 500);
                    } else {
                        speak("Muito bem!");
                        setBlockInput(false);
                    }
                }, 600);
            } else {
                // No Match
                setErrors(prev => prev + 1);
                setTimeout(() => {
                    setCards(prev => prev.map(c => (c.id === c1.id || c.id === c2.id) ? { ...c, isFlipped: false } : c));
                    setBlockInput(false);
                }, 1200);
            }
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getGridClass = (pairCount: number) => {
        const totalCards = pairCount * 2;
        if (totalCards === 12) return 'grid-cols-3 grid-rows-4 md:grid-cols-4 md:grid-rows-3';
        if (totalCards === 16) return 'grid-cols-4 grid-rows-4';
        if (totalCards === 20) return 'grid-cols-4 grid-rows-5 md:grid-cols-5 md:grid-rows-4';
        if (totalCards === 30) return 'grid-cols-5 grid-rows-6 md:grid-cols-6 md:grid-rows-5';
        return 'grid-cols-4 grid-rows-4 md:grid-cols-6 md:grid-rows-4';
    };

    return (
        <div className="w-full h-full flex flex-col items-center justify-center">
            {!isSetup ? (
                <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl shadow-xl flex flex-col items-center gap-6 animate-in fade-in zoom-in">
                    <h2 className="text-2xl font-bold text-slate-700">Escolha a Dificuldade</h2>
                    <div className="flex gap-4 flex-wrap justify-center">
                        <button onClick={() => startGame(6)} className="px-6 py-3 bg-green-400 text-white rounded-xl font-bold hover:scale-105 transition-transform shadow-green-200 shadow-lg">Fácil (6 Pares)</button>
                        <button onClick={() => startGame(8)} className="px-6 py-3 bg-blue-400 text-white rounded-xl font-bold hover:scale-105 transition-transform shadow-blue-200 shadow-lg">Médio (8 Pares)</button>
                        <button onClick={() => startGame(10)} className="px-6 py-3 bg-purple-400 text-white rounded-xl font-bold hover:scale-105 transition-transform shadow-purple-200 shadow-lg">Difícil (10 Pares)</button>
                        <button onClick={() => startGame(15)} className="px-6 py-3 bg-red-400 text-white rounded-xl font-bold hover:scale-105 transition-transform shadow-red-200 shadow-lg">Expert (15 Pares)</button>
                    </div>
                </div>
            ) : (
                <div className="w-full h-full flex flex-col items-center relative">
                    {isVictory && lastResult && (
                        <VictoryScreen 
                            result={lastResult} 
                            best={personalBest} 
                            onRetry={() => startGame(difficulty)} 
                            onSelectDifficulty={() => setIsSetup(false)} 
                        />
                    )}
                    <div className="mb-2 flex flex-wrap justify-center items-center gap-3 shrink-0">
                        <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm px-4 py-1.5 rounded-full border border-slate-200 shadow-sm text-xs md:text-sm font-bold">
                            <div className="flex items-center gap-1.5 text-slate-600 font-mono tracking-tighter"><Clock size={16} className="text-blue-400"/> {formatTime(time)}</div>
                            <div className="w-px h-4 bg-slate-300" />
                            <div className="flex items-center gap-1.5 text-red-500"><AlertCircle size={16} /> {errors}</div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setIsSetup(false)} className="px-4 py-1.5 bg-white/80 backdrop-blur-sm border border-slate-200 text-slate-500 rounded-full text-xs font-bold flex items-center gap-1 hover:bg-white transition-all shadow-sm active:scale-95"><Settings size={14}/> Mudar Nível</button>
                            <button onClick={() => startGame(difficulty)} className="px-4 py-1.5 bg-white/80 backdrop-blur-sm border border-slate-200 text-slate-500 rounded-full text-xs font-bold flex items-center gap-1 hover:bg-white transition-all shadow-sm active:scale-95"><RotateCcw size={14}/> Reiniciar</button>
                        </div>
                    </div>
                    <div className={`grid gap-1 md:gap-3 w-full h-full justify-items-center p-1 overflow-hidden transition-opacity duration-500 ${isVictory ? 'opacity-20 pointer-events-none grayscale' : 'opacity-100'} ${getGridClass(cards.length / 2)}`}>
                        {cards.map((card) => (
                            <div key={card.id} className="w-full h-full flex items-center justify-center min-h-0 min-w-0"><MemoryCard item={card.item} isFlipped={card.isFlipped} isMatched={card.isMatched} onClick={() => handleCardClick(card.id)} /></div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
