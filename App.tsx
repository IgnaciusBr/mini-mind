
import React, { useState, useEffect, useRef } from 'react';
import { ContentType, GameMode, GameItem, PRONUNCIATION_MAP, MemoryResult, UserProfile } from './types';
import { useSpeech } from './hooks/useSpeech';
import { useGameData } from './hooks/useGameData';
import Confetti, { ConfettiHandle } from './components/Confetti';
import { GameButton } from './components/GameButton';
import { MemoryCard } from './components/MemoryCard';
import { Logo } from './components/Logo';
import { Dashboard } from './components/Dashboard';
import { AuthScreen } from './components/AuthScreen';
import { TracingGame } from './components/TracingGame';
import { useAuth } from './context/AuthContext';
import { VictoryScreen } from './components/VictoryScreen';
import { HomeCard } from './components/HomeCard';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { calculateScore } from './utils/scoring';
import { db } from './firebase';
import { collection, getDocs, doc, setDoc, addDoc, increment } from 'firebase/firestore';
import { 
  LayoutDashboard, Clock, AlertCircle, Loader2, RotateCcw, Settings, LogOut, CheckCircle2, ArrowRight, Mic, PawPrint 
} from 'lucide-react';

interface MemoryCardState {
    id: string; 
    pairId: string; 
    item: GameItem;
    isFlipped: boolean;
    isMatched: boolean;
}

type ViewState = 'HOME' | 'GAME' | 'DASHBOARD' | 'SETTINGS';

const App: React.FC = () => {
  // --- Auth State ---
  const { user, userProfile, loading: authLoading, setUserProfile, signOut } = useAuth();
  
  const [profileCompletionData, setProfileCompletionData] = useState({ name: '', age: '' });
  const [isCompletingProfile, setIsCompletingProfile] = useState(false);

  // --- UI State ---
  const [view, setView] = useState<ViewState>('HOME'); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // --- Game Config State ---
  const [contentType, setContentType] = useState<ContentType>(ContentType.NUMBERS);
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.EXPLORE);
  const [displayStyle, setDisplayStyle] = useState<'standard' | 'alternate'>('standard');
  
  // --- Data Hook ---
  const { items, dbAnimals, isLoading: isLoadingAssets } = useGameData(contentType, displayStyle);

  // --- Game Session State ---
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [quizTarget, setQuizTarget] = useState<GameItem | null>(null);
  const [quizOptions, setQuizOptions] = useState<GameItem[]>([]);
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [tracingIndex, setTracingIndex] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [blockInput, setBlockInput] = useState(false);

  // --- Child Lock State ---
  const [isChildLocked, setIsChildLocked] = useState(false);
  const lockTapCount = useRef(0);
  const lockResetTimer = useRef<any>(null);

  // --- Memory Game State ---
  const [memoryCards, setMemoryCards] = useState<MemoryCardState[]>([]);
  const [memoryDifficulty, setMemoryDifficulty] = useState<number>(6); 
  const [isMemorySetup, setIsMemorySetup] = useState(false); 
  const [memoryTime, setMemoryTime] = useState(0);
  const [memoryErrors, setMemoryErrors] = useState(0);
  const [isMemoryTimerActive, setIsMemoryTimerActive] = useState(false);
  const [isVictory, setIsVictory] = useState(false);
  const [lastResult, setLastResult] = useState<MemoryResult | null>(null);
  const [personalBest, setPersonalBest] = useState<number | null>(null);
  const [memoryHistory, setMemoryHistory] = useState<MemoryResult[]>([]);

  const { speak, voices, selectedVoice, setSelectedVoice } = useSpeech();
  const confettiRef = useRef<ConfettiHandle>(null);
  const flashcardIntervalRef = useRef<any>(null);
  const memoryTimerRef = useRef<any>(null);
  const memoryPreviewTimeoutRef = useRef<any>(null);

  // --- Effects ---

  // Check Profile Completion
  useEffect(() => {
    if (user && !authLoading && !userProfile) {
        setIsCompletingProfile(true);
    } else {
        setIsCompletingProfile(false);
    }
  }, [user, userProfile, authLoading]);

  // Load Memory History
  useEffect(() => {
    if (user) {
        const fetchHistory = async () => {
             const memoryRef = collection(db, "users", user.uid, "memory_results");
             const memorySnap = await getDocs(memoryRef);
             const history = memorySnap.docs.map(d => d.data() as MemoryResult);
             setMemoryHistory(history);
        };
        fetchHistory();
    } else {
        setMemoryHistory([]);
    }
  }, [user]);

  // Mode Switching Logic
  useEffect(() => {
      // If switching to Animals from a Tracing mode, reset to explore or memory
      if (contentType === ContentType.ANIMALS && gameMode === GameMode.TRACING) {
          setGameMode(GameMode.EXPLORE);
      }
      // If switching to Numbers/Letters from Memory, reset to explore
      if (contentType !== ContentType.ANIMALS && gameMode === GameMode.MEMORY) {
          setGameMode(GameMode.EXPLORE);
      }
      // Reset Display Style
      setDisplayStyle('standard');
  }, [contentType]);

  // Game Reset Logic when Mode/Items change
  useEffect(() => {
    if (flashcardIntervalRef.current) clearInterval(flashcardIntervalRef.current);
    if (memoryTimerRef.current) clearInterval(memoryTimerRef.current);
    if (memoryPreviewTimeoutRef.current) clearTimeout(memoryPreviewTimeoutRef.current);
    
    setFeedback(null);
    setBlockInput(false);
    setActiveItemId(null); 
    setQuizTarget(null);
    if (gameMode !== GameMode.MEMORY) setIsMemorySetup(false); 
    setIsMemoryTimerActive(false);
    setIsVictory(false);
    setIsChildLocked(false);

    if (gameMode === GameMode.QUIZ) {
      startQuizRound(items);
    } else if (gameMode === GameMode.FLASHCARD) {
      startFlashcard(items);
    } else if (gameMode === GameMode.TRACING) {
      setTracingIndex(0);
    }
  }, [gameMode, items, view]);

  // Memory Timer
  useEffect(() => {
    if (isMemoryTimerActive) {
        memoryTimerRef.current = setInterval(() => setMemoryTime(prev => prev + 1), 1000);
    } else {
        clearInterval(memoryTimerRef.current);
    }
    return () => clearInterval(memoryTimerRef.current);
  }, [isMemoryTimerActive]);

  // --- Handlers ---

  const handleLogout = async () => {
      await signOut();
      setView('HOME');
  };

  const handleCompleteProfile = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user || !profileCompletionData.name || !profileCompletionData.age) return;

      try {
          const profile: UserProfile = {
              uid: user.uid,
              childName: profileCompletionData.name,
              age: profileCompletionData.age,
              parentEmail: user.email || '',
              createdAt: Date.now()
          };
          await setDoc(doc(db, "users", user.uid), profile);
          setUserProfile(profile);
          setIsCompletingProfile(false);
      } catch (err) {
          console.error("Error creating profile", err);
      }
  };

  const handleLockInteraction = () => {
    if (!isChildLocked) {
        setIsChildLocked(true);
        speak("Tela bloqueada");
        return;
    }

    lockTapCount.current += 1;
    if (lockResetTimer.current) clearTimeout(lockResetTimer.current);
    
    if (lockTapCount.current === 1) {
        speak("Toque três vezes para desbloquear");
    }

    lockResetTimer.current = setTimeout(() => {
        lockTapCount.current = 0;
    }, 1000); 

    if (lockTapCount.current >= 3) {
        setIsChildLocked(false);
        lockTapCount.current = 0;
        speak("Tela desbloqueada");
        if (lockResetTimer.current) clearTimeout(lockResetTimer.current);
    }
  };

  const saveQuizStats = async (isCorrect: boolean) => {
    if (!user) return;
    try {
        const statsRef = doc(db, "users", user.uid, "stats", "quiz");
        await setDoc(statsRef, {
            [contentType]: {
                correct: increment(isCorrect ? 1 : 0),
                wrong: increment(isCorrect ? 0 : 1)
            }
        }, { merge: true });
    } catch (error) {
        console.error("Error saving quiz stats:", error);
    }
  };

  const saveMemoryResult = () => {
    const result: MemoryResult = {
        id: Date.now().toString(),
        date: Date.now(),
        difficulty: memoryDifficulty,
        timeSeconds: memoryTime,
        errors: memoryErrors
    };

    const allResults = [...memoryHistory, result];
    const previousBestScore = memoryHistory
        .filter(r => r.difficulty === memoryDifficulty)
        .reduce((best, curr) => {
            const score = calculateScore(curr.timeSeconds, curr.errors, curr.difficulty);
            return (!best || score > best) ? score : best;
        }, null as number | null);
        
    setPersonalBest(previousBestScore);
    setMemoryHistory(allResults);

    if (user) {
        addDoc(collection(db, "users", user.uid, "memory_results"), result)
            .catch(err => console.error("Error saving memory result:", err));
    }
    return result;
  };

  const getPhonetic = (text: string) => PRONUNCIATION_MAP[text.toUpperCase()] || text;
  const getSpeakableText = (item: GameItem) => item.spokenText || item.text;
  const getArticle = (item: GameItem) => item.gender === 'f' ? 'a' : 'o';

  // --- Game Mechanics ---

  const startMemoryGame = (pairCount: number) => {
    if (memoryPreviewTimeoutRef.current) clearTimeout(memoryPreviewTimeoutRef.current);
    let sourceItems = contentType === ContentType.ANIMALS ? dbAnimals : items;
    if (sourceItems.length === 0) return;

    setBlockInput(true);
    setMemoryDifficulty(pairCount);
    setIsVictory(false);
    setLastResult(null);
    
    const shuffledItems = [...sourceItems].sort(() => Math.random() - 0.5);
    const selectedItems = shuffledItems.slice(0, pairCount);
    
    let cards: MemoryCardState[] = [];
    selectedItems.forEach(item => {
        cards.push({ id: `${item.id}-1`, pairId: item.id, item, isFlipped: true, isMatched: false });
        cards.push({ id: `${item.id}-2`, pairId: item.id, item, isFlipped: true, isMatched: false });
    });

    cards = cards.sort(() => Math.random() - 0.5);
    setMemoryCards(cards);
    setIsMemorySetup(true);
    setMemoryTime(0);
    setMemoryErrors(0);
    setIsMemoryTimerActive(false);

    speak("Memorize as cartas!");
    memoryPreviewTimeoutRef.current = setTimeout(() => {
        setMemoryCards(prev => prev.map(c => ({ ...c, isFlipped: false })));
        setBlockInput(false);
        speak("Valendo!");
        setIsMemoryTimerActive(true);
    }, Math.max(2000, pairCount * 400));
  };

  const handleMemoryCardClick = (cardId: string) => {
    if (blockInput || isVictory) return;
    const cardIndex = memoryCards.findIndex(c => c.id === cardId);
    if (cardIndex === -1 || memoryCards[cardIndex].isFlipped || memoryCards[cardIndex].isMatched) return;

    const newCards = [...memoryCards];
    newCards[cardIndex].isFlipped = true;
    setMemoryCards(newCards);
    speak(getSpeakableText(newCards[cardIndex].item));

    const flippedCards = newCards.filter(c => c.isFlipped && !c.isMatched);
    if (flippedCards.length === 2) {
        setBlockInput(true);
        const [c1, c2] = flippedCards;
        if (c1.pairId === c2.pairId) {
            setTimeout(() => {
                const updatedCards = newCards.map(c => (c.id === c1.id || c.id === c2.id) ? { ...c, isMatched: true } : c);
                setMemoryCards(updatedCards);
                
                if (confettiRef.current) confettiRef.current.explode(window.innerWidth / 2, window.innerHeight / 2);
                
                const allMatched = updatedCards.every(c => c.isMatched);
                if (allMatched) {
                    setIsMemoryTimerActive(false);
                    const result = saveMemoryResult();
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
            setMemoryErrors(prev => prev + 1);
            setTimeout(() => {
                setMemoryCards(prev => prev.map(c => (c.id === c1.id || c.id === c2.id) ? { ...c, isFlipped: false } : c));
                setBlockInput(false);
            }, 1200);
        }
    }
  };

  const startQuizRound = (currentItems: GameItem[]) => {
    if (currentItems.length === 0) return;
    setFeedback(null);
    setBlockInput(true); 
    const target = currentItems[Math.floor(Math.random() * currentItems.length)];
    setQuizTarget(target);
    const opts = [target];
    const pool = currentItems.filter(i => i.id !== target.id);
    while(opts.length < 3 && pool.length > 0) {
      const idx = Math.floor(Math.random() * pool.length);
      opts.push(pool[idx]);
      pool.splice(idx, 1);
    }
    setQuizOptions(opts.sort(() => Math.random() - 0.5));
    setTimeout(() => {
      speak(`Cadê ${getArticle(target)} ${getPhonetic(getSpeakableText(target))}?`, () => setBlockInput(false));
    }, 500);
  };

  const startFlashcard = (currentItems: GameItem[]) => {
    if (currentItems.length === 0) return;
    setFlashcardIndex(0);
    speak(getSpeakableText(currentItems[0]));
    flashcardIntervalRef.current = setInterval(() => {
      setFlashcardIndex(prev => {
        const next = (prev + 1) % currentItems.length;
        speak(getSpeakableText(currentItems[next]));
        return next;
      });
    }, 3500);
  };

  const handleTracingComplete = () => {
      speak("Muito bem!");
      if (confettiRef.current) confettiRef.current.explode(window.innerWidth/2, window.innerHeight/2);
      setTimeout(() => {
          setTracingIndex(prev => (prev + 1) % items.length);
      }, 1500);
  };

  const handleItemClick = (item: GameItem, e: React.MouseEvent | React.TouchEvent) => {
    if (blockInput) return;
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const speakable = getSpeakableText(item);

    if (gameMode === GameMode.EXPLORE) {
      setActiveItemId(item.id);
      if (confettiRef.current) confettiRef.current.explode(x, y);
      speak(speakable);
    } 
    else if (gameMode === GameMode.QUIZ) {
      if (item.id === quizTarget?.id) {
        setFeedback('correct');
        saveQuizStats(true);
        setBlockInput(true);
        if (confettiRef.current) confettiRef.current.explode(x, y);
        speak("Parabéns!", () => setTimeout(() => startQuizRound(items), 1000));
      } else {
        setFeedback('wrong');
        saveQuizStats(false);
        setBlockInput(true);
        speak(`Não! Esse é ${getArticle(item)} ${getPhonetic(speakable)}.`, () => {
            setFeedback(null);
            setTimeout(() => {
                if (quizTarget) {
                  speak(`Tente de novo. Cadê ${getArticle(quizTarget)} ${getPhonetic(getSpeakableText(quizTarget))}?`, () => setBlockInput(false));
                } else { setBlockInput(false); }
            }, 500);
        });
      }
    }
  };

  // --- Helpers ---
  const selectContentType = (type: ContentType) => {
      setContentType(type);
      setGameMode(GameMode.EXPLORE);
      setView('GAME');
  };

  const getTitle = () => {
    if (view === 'DASHBOARD') return "Dashboard";
    if (view === 'SETTINGS') return "Configurações";
    if (gameMode === GameMode.MEMORY) return isVictory ? "Vitória!" : "Jogo da Memória";
    if (gameMode === GameMode.TRACING) return "Vamos Desenhar!";
    if (gameMode === GameMode.QUIZ && quizTarget) return `Encontre: ${quizTarget.text}`;
    if (gameMode === GameMode.FLASHCARD) return "Observe";
    return "Toque para Aprender";
  };
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  const getGridClass = () => {
    if (contentType === ContentType.ANIMALS) return 'grid-cols-3 grid-rows-5 md:grid-cols-5 md:grid-rows-3 gap-2 md:gap-3 p-2 h-full';
    if (contentType === ContentType.ALPHABET) return 'grid-cols-4 grid-rows-7 md:grid-cols-7 md:grid-rows-4 gap-2 md:gap-3 p-2 h-full';
    if (contentType === ContentType.NUMBERS) return 'grid-cols-2 grid-rows-5 md:grid-cols-5 md:grid-rows-2 gap-3 p-4 h-full';
    return 'grid-cols-2 grid-rows-3 md:grid-cols-5 md:grid-rows-1 gap-4 md:gap-8 p-8 h-full';
  };
  const getMemoryGridClass = (pairCount: number) => {
      const totalCards = pairCount * 2;
      if (totalCards === 12) return 'grid-cols-3 grid-rows-4 md:grid-cols-4 md:grid-rows-3';
      if (totalCards === 16) return 'grid-cols-4 grid-rows-4';
      if (totalCards === 20) return 'grid-cols-4 grid-rows-5 md:grid-cols-5 md:grid-rows-4';
      if (totalCards === 30) return 'grid-cols-5 grid-rows-6 md:grid-cols-6 md:grid-rows-5';
      return 'grid-cols-4 grid-rows-4 md:grid-cols-6 md:grid-rows-4';
  };
  
  const showToggle = view === 'GAME' 
    && contentType !== ContentType.ANIMALS 
    && gameMode !== GameMode.MEMORY
    && !(gameMode === GameMode.TRACING && contentType === ContentType.NUMBERS);

  // --- Render ---

  if (authLoading || isLoadingAssets) {
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
            <div className="animate-bounce mb-8">
                <Logo className="w-64 h-auto" />
            </div>
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="animate-spin text-blue-500" size={48} />
                <p className="text-xl font-bold text-slate-500 animate-pulse">
                    {authLoading ? 'Verificando usuário...' : 'Preparando a diversão...'}
                </p>
            </div>
        </div>
    );
  }

  if (!user) {
      return <AuthScreen onLoginSuccess={() => {}} />;
  }

  if (isCompletingProfile) {
      return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
              <div className="bg-white rounded-[2rem] shadow-2xl p-8 md:p-12 w-full max-w-md animate-in zoom-in">
                  <h2 className="text-3xl font-black text-slate-700 mb-2 text-center">Quase lá!</h2>
                  <p className="text-slate-500 text-center mb-8 font-medium">Precisamos saber quem vai brincar.</p>
                  <form onSubmit={handleCompleteProfile} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 ml-3 uppercase">Nome da Criança</label>
                        <input 
                            type="text" 
                            required
                            placeholder="Ex: Ana"
                            className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-blue-400 font-bold text-slate-600"
                            value={profileCompletionData.name}
                            onChange={e => setProfileCompletionData(p => ({...p, name: e.target.value}))}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 ml-3 uppercase">Idade</label>
                        <input 
                            type="number" 
                            required
                            placeholder="Anos"
                            className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-blue-400 font-bold text-slate-600"
                            value={profileCompletionData.age}
                            onChange={e => setProfileCompletionData(p => ({...p, age: e.target.value}))}
                        />
                    </div>
                    <button type="submit" className="w-full py-4 bg-green-500 text-white rounded-2xl font-black text-lg shadow-lg shadow-green-200 hover:scale-[1.02] active:scale-95 transition-all mt-4 flex items-center justify-center gap-2">
                        <CheckCircle2 /> Concluir
                    </button>
                    <button type="button" onClick={handleLogout} className="w-full py-2 text-slate-400 font-bold text-sm hover:text-slate-600">
                        Cancelar e Sair
                    </button>
                  </form>
              </div>
          </div>
      );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col text-slate-700 bg-transparent pb-safe">
      <Confetti ref={confettiRef} />
      
      {view === 'GAME' && (
        <Sidebar 
            isOpen={isSidebarOpen} 
            toggle={() => setIsSidebarOpen(!isSidebarOpen)} 
            contentType={contentType} 
            gameMode={gameMode} 
            setGameMode={setGameMode} 
        />
      )}
      
      <main className={`flex-1 flex flex-col relative h-full transition-all duration-300 ${view === 'GAME' ? 'md:pl-[300px]' : 'pl-0'}`}>
        
        <Header 
            view={view}
            title={getTitle()}
            goHome={() => { setView('HOME'); setIsSidebarOpen(false); }}
            toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            isChildLocked={isChildLocked}
            handleLockInteraction={handleLockInteraction}
            showToggle={showToggle}
            contentType={contentType}
            displayStyle={displayStyle}
            setDisplayStyle={setDisplayStyle}
        />

        <div className="flex-1 overflow-hidden relative p-2 md:p-4 flex flex-col items-center justify-center min-h-0">
            {/* Mobile Quiz Header */}
            {view === 'GAME' && gameMode === GameMode.QUIZ && quizTarget && (
                <div className="w-full text-center py-2 md:hidden animate-in fade-in slide-in-from-top-2 shrink-0">
                     <span className="text-xl font-black text-slate-700 drop-shadow-sm">
                        {getTitle()}
                     </span>
                </div>
            )}

            {view === 'HOME' && (
                <div className="w-full h-full flex flex-col pt-safe">
                    <div className="flex justify-between items-center px-4 py-4 md:px-8">
                         <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-black border-2 border-white shadow-md">
                                 {userProfile?.childName.charAt(0).toUpperCase()}
                             </div>
                             <div>
                                 <p className="text-xs font-bold text-slate-400 uppercase">Olá,</p>
                                 <p className="text-lg font-black text-slate-700 leading-none">{userProfile?.childName}</p>
                             </div>
                         </div>
                         <button 
                            onClick={() => setView('SETTINGS')}
                            className="p-3 bg-white rounded-2xl shadow-md shadow-slate-200 text-slate-400 hover:text-blue-500 transition-colors"
                         >
                             <Settings size={24} />
                         </button>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center p-4 gap-6 md:gap-10 overflow-y-auto custom-scrollbar pb-20">
                        <div className="mb-2 animate-bounce">
                            <Logo className="w-64 h-auto" />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 w-full max-w-2xl">
                             <HomeCard 
                                title="Números" 
                                gradient="bg-gradient-to-br from-cyan-400 to-blue-500" 
                                shadowColor="shadow-blue-200"
                                content={<span className="text-6xl font-black text-white drop-shadow-md">123</span>} 
                                onClick={() => selectContentType(ContentType.NUMBERS)} 
                             />
                             <HomeCard 
                                title="Alfabeto" 
                                gradient="bg-gradient-to-br from-lime-400 to-green-500" 
                                shadowColor="shadow-green-200"
                                content={<span className="text-6xl font-black text-white drop-shadow-md">ABC</span>} 
                                onClick={() => selectContentType(ContentType.ALPHABET)} 
                             />
                             <HomeCard 
                                title="Vogais" 
                                gradient="bg-gradient-to-br from-fuchsia-400 to-purple-500" 
                                shadowColor="shadow-purple-200"
                                content={
                                    <div className="flex flex-col items-center leading-none">
                                        <span className="text-4xl font-black text-white drop-shadow-md tracking-tighter">AEI</span>
                                        <span className="text-4xl font-black text-white drop-shadow-md tracking-tighter">OU</span>
                                    </div>
                                } 
                                onClick={() => selectContentType(ContentType.VOWELS)} 
                             />
                             <HomeCard 
                                title="Animais" 
                                gradient="bg-gradient-to-br from-amber-400 to-orange-500" 
                                shadowColor="shadow-orange-200"
                                content={<PawPrint size={56} className="text-white drop-shadow-md" />} 
                                onClick={() => selectContentType(ContentType.ANIMALS)} 
                             />
                        </div>

                        <button 
                            onClick={() => setView('DASHBOARD')}
                            className="w-full max-w-2xl p-6 bg-white rounded-3xl shadow-lg border-2 border-slate-100 flex items-center gap-4 hover:scale-[1.02] transition-transform group"
                        >
                            <div className="p-3 bg-slate-100 rounded-2xl text-slate-500 group-hover:bg-slate-200 transition-colors">
                                <LayoutDashboard size={32} />
                            </div>
                            <div className="text-left">
                                <h3 className="text-xl font-black text-slate-700">Meu Progresso</h3>
                                <p className="text-slate-400 font-semibold text-sm">Veja suas conquistas e medalhas</p>
                            </div>
                            <div className="ml-auto text-slate-300">
                                <ArrowRight size={24} />
                            </div>
                        </button>
                    </div>
                </div>
            )}

            {view === 'SETTINGS' && (
                <div className="w-full max-w-md bg-white rounded-3xl shadow-lg border border-slate-100 p-6 md:p-8 animate-in zoom-in-95 duration-200">
                    <h2 className="text-2xl font-black text-slate-700 mb-6 flex items-center gap-2">
                        <Settings className="text-slate-400"/> Configurações
                    </h2>
                    
                    <div className="space-y-6">
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2 flex items-center gap-2">
                                <Mic size={14} /> Voz do Narrador
                            </label>
                            <select 
                                className="w-full p-4 rounded-xl border-2 border-slate-100 bg-slate-50 text-base font-semibold text-slate-600 focus:outline-none focus:border-blue-300 transition-colors cursor-pointer" 
                                onChange={(e) => setSelectedVoice(voices[parseInt(e.target.value)])} 
                                value={voices.indexOf(selectedVoice as SpeechSynthesisVoice)}
                            >
                                {voices.length === 0 && <option>Padrão</option>}
                                {voices.map((v, i) => (<option key={i} value={i}>{v.name.replace(/(Microsoft|Google) /, '').slice(0, 30)}</option>))}
                            </select>
                            <p className="text-xs text-slate-400 mt-2 px-1">Selecione a voz que irá narrar os jogos.</p>
                        </div>

                        <div className="pt-6 border-t border-slate-100">
                            <button onClick={handleLogout} className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl text-base font-black transition-all bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 border border-red-100">
                                <LogOut size={20} />
                                <span>Sair da Conta</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {view === 'DASHBOARD' && <Dashboard />}

            {view === 'GAME' && (
                <>
                    {feedback && (<div className="absolute inset-0 z-50 flex items-center justify-center bg-white/20 backdrop-blur-sm animate-in fade-in duration-200"><div className="text-9xl animate-bounce filter drop-shadow-2xl">{feedback === 'correct' ? '🌟' : '🤔'}</div></div>)}
                    
                    {gameMode === GameMode.EXPLORE && (
                        <div className={`w-full h-full grid content-center justify-center justify-items-center overflow-y-auto custom-scrollbar ${getGridClass()}`}>
                            {items.map((item) => (
                                <div key={item.id} className="w-full h-full flex items-center justify-center relative group min-w-0 min-h-0"> 
                                    {contentType === ContentType.ANIMALS ? (
                                        <div className="aspect-square h-[95%] w-auto max-w-full flex items-center justify-center relative shadow-sm rounded-2xl">
                                            <GameButton text="" color={item.color} active={activeItemId === item.id} onClick={(e) => handleItemClick(item, e)} isFlat={true} className="w-full h-full !aspect-auto" />
                                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-[15%]"><img src={item.image} alt={item.text} className="w-full h-full object-contain drop-shadow-sm" /></div>
                                        </div>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center min-h-0 min-w-0"><GameButton text={item.text} color={item.color} active={activeItemId === item.id} isWhiteVariant={activeItemId !== item.id} showDots={displayStyle === 'alternate' && contentType === ContentType.NUMBERS} onClick={(e) => handleItemClick(item, e)} className="h-[85%] w-auto max-w-full aspect-square shadow-sm" /></div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {gameMode === GameMode.FLASHCARD && items.length > 0 && (
                        <div className="w-full h-full flex items-center justify-center p-4">
                            <div className="w-[min(65vh,80vw)] aspect-square animate-fade-in relative group">
                                <GameButton text={contentType === ContentType.ANIMALS ? '' : items[flashcardIndex].text} color={items[flashcardIndex].color} size="large" showDots={displayStyle === 'alternate' && contentType === ContentType.NUMBERS} onClick={(e) => handleItemClick(items[flashcardIndex], e)} isFlat={contentType === ContentType.ANIMALS} className="w-full h-full" />
                                {contentType === ContentType.ANIMALS && (
                                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6 pb-8">
                                        <div className="flex-1 w-full flex items-center justify-center overflow-hidden mb-4"><img src={items[flashcardIndex].image} alt={items[flashcardIndex].text} className="max-w-full max-h-full object-contain drop-shadow-sm" /></div>
                                        <span className="text-3xl md:text-5xl font-black text-slate-700 drop-shadow-sm tracking-wide">{items[flashcardIndex].text}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {gameMode === GameMode.QUIZ && (
                        <div className="w-full h-full flex items-center justify-center">
                            <div className="flex gap-4 md:gap-12 flex-wrap justify-center items-center w-full max-w-6xl">
                                {quizOptions.map((item) => (
                                    <div key={item.id} className="w-[28vw] md:w-[20vw] aspect-square max-w-[250px] relative">
                                        <GameButton text={contentType === ContentType.ANIMALS ? '' : item.text} color={item.color} onClick={(e) => handleItemClick(item, e)} size="normal" showDots={displayStyle === 'alternate' && contentType === ContentType.NUMBERS} isFlat={contentType === ContentType.ANIMALS} />
                                        {contentType === ContentType.ANIMALS && (<div className="absolute inset-0 pointer-events-none flex items-center justify-center"><img src={item.image} alt={item.text} className="w-[70%] h-[70%] object-contain" /></div>)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {gameMode === GameMode.TRACING && items.length > 0 && (
                        <TracingGame 
                            item={items[tracingIndex]} 
                            onComplete={handleTracingComplete} 
                            speak={speak} 
                        />
                    )}

                    {gameMode === GameMode.MEMORY && contentType === ContentType.ANIMALS && (
                        <div className="w-full h-full flex flex-col items-center justify-center">
                            {!isMemorySetup ? (
                                <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl shadow-xl flex flex-col items-center gap-6 animate-in fade-in zoom-in">
                                    <h2 className="text-2xl font-bold text-slate-700">Escolha a Dificuldade</h2>
                                    <div className="flex gap-4 flex-wrap justify-center">
                                        <button onClick={() => startMemoryGame(6)} className="px-6 py-3 bg-green-400 text-white rounded-xl font-bold hover:scale-105 transition-transform shadow-green-200 shadow-lg">Fácil (6 Pares)</button>
                                        <button onClick={() => startMemoryGame(8)} className="px-6 py-3 bg-blue-400 text-white rounded-xl font-bold hover:scale-105 transition-transform shadow-blue-200 shadow-lg">Médio (8 Pares)</button>
                                        <button onClick={() => startMemoryGame(10)} className="px-6 py-3 bg-purple-400 text-white rounded-xl font-bold hover:scale-105 transition-transform shadow-purple-200 shadow-lg">Difícil (10 Pares)</button>
                                        <button onClick={() => startMemoryGame(15)} className="px-6 py-3 bg-red-400 text-white rounded-xl font-bold hover:scale-105 transition-transform shadow-red-200 shadow-lg">Expert (15 Pares)</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full h-full flex flex-col items-center relative">
                                    {isVictory && lastResult && (
                                        <VictoryScreen 
                                            result={lastResult} 
                                            best={personalBest} 
                                            onRetry={() => startMemoryGame(memoryDifficulty)} 
                                            onSelectDifficulty={() => setIsMemorySetup(false)} 
                                        />
                                    )}
                                    <div className="mb-2 flex flex-wrap justify-center items-center gap-3 shrink-0">
                                        <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm px-4 py-1.5 rounded-full border border-slate-200 shadow-sm text-xs md:text-sm font-bold">
                                            <div className="flex items-center gap-1.5 text-slate-600 font-mono tracking-tighter"><Clock size={16} className="text-blue-400"/> {formatTime(memoryTime)}</div>
                                            <div className="w-px h-4 bg-slate-300" />
                                            <div className="flex items-center gap-1.5 text-red-500"><AlertCircle size={16} /> {memoryErrors}</div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => setIsMemorySetup(false)} className="px-4 py-1.5 bg-white/80 backdrop-blur-sm border border-slate-200 text-slate-500 rounded-full text-xs font-bold flex items-center gap-1 hover:bg-white transition-all shadow-sm active:scale-95"><Settings size={14}/> Mudar Nível</button>
                                            <button onClick={() => startMemoryGame(memoryDifficulty)} className="px-4 py-1.5 bg-white/80 backdrop-blur-sm border border-slate-200 text-slate-500 rounded-full text-xs font-bold flex items-center gap-1 hover:bg-white transition-all shadow-sm active:scale-95"><RotateCcw size={14}/> Reiniciar</button>
                                        </div>
                                    </div>
                                    <div className={`grid gap-1 md:gap-3 w-full h-full justify-items-center p-1 overflow-hidden transition-opacity duration-500 ${isVictory ? 'opacity-20 pointer-events-none grayscale' : 'opacity-100'} ${getMemoryGridClass(memoryCards.length / 2)}`}>
                                        {memoryCards.map((card) => (
                                            <div key={card.id} className="w-full h-full flex items-center justify-center min-h-0 min-w-0"><MemoryCard item={card.item} isFlipped={card.isFlipped} isMatched={card.isMatched} onClick={() => handleMemoryCardClick(card.id)} /></div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
      </main>
    </div>
  );
};

export default App;
