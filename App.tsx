
import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, getDocs, doc, setDoc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { auth, db } from './firebase';
import { 
  ContentType, 
  GameMode, 
  COLORS, 
  GameItem, 
  PRONUNCIATION_MAP, 
  ANIMAL_GENDER_MAP, 
  MemoryResult, 
  QuizHistory, 
  UserProfile 
} from './types';
import { useSpeech } from './hooks/useSpeech';
import Confetti, { ConfettiHandle } from './components/Confetti';
import { GameButton } from './components/GameButton';
import { MemoryCard } from './components/MemoryCard';
import { Logo } from './components/Logo';
import { Dashboard } from './components/Dashboard';
import { Auth } from './components/Auth';
import { 
  Menu, X, Play, HelpCircle, Eye, Hash, Type, Volume2, 
  Cat, Grid, LayoutDashboard, Clock, AlertCircle, Trophy, Loader2, LogOut, RotateCcw
} from 'lucide-react';

interface MemoryCardState {
    id: string; 
    pairId: string; 
    item: GameItem;
    isFlipped: boolean;
    isMatched: boolean;
}

type ViewState = 'GAME' | 'DASHBOARD';

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);

  const [view, setView] = useState<ViewState>('GAME');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [contentType, setContentType] = useState<ContentType>(ContentType.NUMBERS);
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.EXPLORE);
  const [items, setItems] = useState<GameItem[]>([]);
  const [firebaseAnimals, setFirebaseAnimals] = useState<GameItem[]>([]);
  
  const [displayStyle, setDisplayStyle] = useState<'standard' | 'alternate'>('standard');
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [quizTarget, setQuizTarget] = useState<GameItem | null>(null);
  const [quizOptions, setQuizOptions] = useState<GameItem[]>([]);
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [blockInput, setBlockInput] = useState(false);

  const [quizSessionStats, setQuizSessionStats] = useState<{correct: number, wrong: number}>({ correct: 0, wrong: 0 });
  const [memoryCards, setMemoryCards] = useState<MemoryCardState[]>([]);
  const [memoryDifficulty, setMemoryDifficulty] = useState<number>(0); 
  const [isMemorySetup, setIsMemorySetup] = useState(false); 
  const [memoryTime, setMemoryTime] = useState(0);
  const [memoryErrors, setMemoryErrors] = useState(0);
  const [isMemoryTimerActive, setIsMemoryTimerActive] = useState(false);

  const { speak } = useSpeech();
  const confettiRef = useRef<ConfettiHandle>(null);
  const flashcardIntervalRef = useRef<any>(null);
  const memoryTimerRef = useRef<any>(null);
  const memoryPreviewTimeoutRef = useRef<any>(null);

  // --- Auth State ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        const d = await getDoc(doc(db, 'users', u.uid));
        if (d.exists()) setProfile(d.data() as UserProfile);
        setUser(u);
      } else {
        setUser(null);
        setProfile(null);
      }
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  // --- Fetch Animals ---
  useEffect(() => {
    const fetchAnimals = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'animals'));
        const animalsData = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: `animal-db-${doc.id}`,
            text: data.name,
            spokenText: data.name,
            color: '#E6DBBF',
            image: data.image_url,
            gender: data.gender || 'o'
          };
        });
        setFirebaseAnimals(animalsData);
      } catch (error) {
        console.error("Error fetching animals:", error);
      } finally {
        setIsLoadingAssets(false);
      }
    };
    fetchAnimals();
  }, []);

  // --- Data Generation ---
  useEffect(() => {
    let newItems: GameItem[] = [];
    const isAlt = displayStyle === 'alternate';

    if (contentType === ContentType.NUMBERS) {
      newItems = Array.from({length: 10}, (_, i) => ({
        id: `num-${i+1}`, text: (i+1).toString(), spokenText: (i+1).toString(), color: COLORS[i % COLORS.length]
      }));
    } else if (contentType === ContentType.ANIMALS) {
        const shuffled = [...firebaseAnimals].sort(() => Math.random() - 0.5);
        newItems = shuffled.slice(0, 15);
    } else {
      const data = contentType === ContentType.VOWELS ? ['A', 'E', 'I', 'O', 'U'] : "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');
      newItems = data.map((char, i) => ({
        id: `${contentType}-${i}`, text: isAlt ? char.toLowerCase() : char, spokenText: char, color: COLORS[i % COLORS.length]
      }));
    }
    setItems(newItems);
  }, [contentType, displayStyle, firebaseAnimals]);

  // --- Reset Game on Mode Change ---
  useEffect(() => {
    if (flashcardIntervalRef.current) clearInterval(flashcardIntervalRef.current);
    if (memoryTimerRef.current) clearInterval(memoryTimerRef.current);
    if (memoryPreviewTimeoutRef.current) clearTimeout(memoryPreviewTimeoutRef.current);
    
    setFeedback(null);
    setBlockInput(false);
    setActiveItemId(null);
    setQuizTarget(null);
    setIsMemorySetup(false);
    setIsMemoryTimerActive(false);
    setMemoryTime(0);
    setMemoryErrors(0);

    if (gameMode === GameMode.QUIZ) startQuizRound(items);
    else if (gameMode === GameMode.FLASHCARD) startFlashcard(items);
  }, [gameMode, contentType, view]);

  // --- Timer logic ---
  useEffect(() => {
    if (isMemoryTimerActive) {
        memoryTimerRef.current = setInterval(() => setMemoryTime(prev => prev + 1), 1000);
    } else {
        clearInterval(memoryTimerRef.current);
    }
    return () => clearInterval(memoryTimerRef.current);
  }, [isMemoryTimerActive]);

  // --- Helpers ---
  const getPhonetic = (text: string) => PRONUNCIATION_MAP[text.toUpperCase()] || text;
  const getSpeakableText = (item: GameItem) => item.spokenText || item.text;
  const getArticle = (item: GameItem) => {
    const text = item.text.toUpperCase();
    return ANIMAL_GENDER_MAP[text] === 'a' ? 'a' : 'o';
  };
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // --- Memory Game logic ---
  const startMemoryGame = (pairCount: number) => {
    if (memoryPreviewTimeoutRef.current) clearTimeout(memoryPreviewTimeoutRef.current);
    let sourceItems = contentType === ContentType.ANIMALS ? firebaseAnimals : items;
    if (sourceItems.length < pairCount) sourceItems = firebaseAnimals;
    if (sourceItems.length === 0) return;

    setBlockInput(true);
    setMemoryDifficulty(pairCount);
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
    }, pairCount * 450);
  };

  const handleMemoryCardClick = (cardId: string) => {
    if (blockInput) return;
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
                setMemoryCards(prev => prev.map(c => (c.id === c1.id || c.id === c2.id) ? { ...c, isMatched: true } : c));
                if (confettiRef.current) confettiRef.current.explode(window.innerWidth / 2, window.innerHeight / 2);
                speak("Muito bem!");
                setBlockInput(false);
                if (newCards.every(c => c.isMatched || (c.id === c1.id || c.id === c2.id))) {
                    setIsMemoryTimerActive(false);
                    setTimeout(() => speak("Você venceu!"), 1000);
                }
            }, 800);
        } else {
            setMemoryErrors(prev => prev + 1);
            setTimeout(() => {
                setMemoryCards(prev => prev.map(c => (c.id === c1.id || c.id === c2.id) ? { ...c, isFlipped: false } : c));
                setBlockInput(false);
            }, 1500);
        }
    }
  };

  // --- Quiz logic ---
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
      speak(`Cadê o ${getPhonetic(getSpeakableText(target))}?`, () => setBlockInput(false));
    }, 500);
  };

  const startFlashcard = (currentItems: GameItem[]) => {
    if (currentItems.length === 0) return;
    setFlashcardIndex(0);
    speak(getSpeakableText(currentItems[0]));
    flashcardIntervalRef.current = setInterval(() => {
      setFlashcardIndex(prev => {
        let next = (prev + 1) % currentItems.length;
        speak(getSpeakableText(currentItems[next]));
        return next;
      });
    }, 3500);
  };

  const handleItemClick = (item: GameItem, e: React.MouseEvent | React.TouchEvent) => {
    if (blockInput) return;
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    if (gameMode === GameMode.EXPLORE) {
      setActiveItemId(item.id);
      if (confettiRef.current) confettiRef.current.explode(x, y);
      speak(getSpeakableText(item));
    } else if (gameMode === GameMode.QUIZ) {
      if (item.id === quizTarget?.id) {
        setFeedback('correct');
        setQuizSessionStats(s => ({ ...s, correct: s.correct + 1 }));
        setBlockInput(true);
        if (confettiRef.current) confettiRef.current.explode(x, y);
        speak("Parabéns!", () => setTimeout(() => startQuizRound(items), 1000));
      } else {
        setFeedback('wrong');
        setQuizSessionStats(s => ({ ...s, wrong: s.wrong + 1 }));
        setBlockInput(true);
        speak(`Não! Esse é o ${getPhonetic(getSpeakableText(item))}.`, () => {
            setFeedback(null);
            setTimeout(() => {
                speak(`Tente de novo. Cadê o ${getPhonetic(getSpeakableText(quizTarget!))}?`, () => setBlockInput(false));
            }, 500);
        });
      }
    }
  };

  if (authLoading) {
    return (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-blue-50">
            <Loader2 className="animate-spin text-blue-500 mb-4" size={48} />
            <p className="font-bold text-slate-500">Iniciando...</p>
        </div>
    );
  }

  if (!user) return <Auth />;

  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col text-slate-700">
      <Confetti ref={confettiRef} />

      {/* Sidebar Desktop/Mobile */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl transform transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b flex items-center justify-between">
          <Logo className="h-8 w-auto" />
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400"><X size={24} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <SidebarBtn active={view === 'DASHBOARD'} onClick={() => { setView('DASHBOARD'); setIsSidebarOpen(false); }} icon={<LayoutDashboard size={20} />} label="Progresso" colorClass="bg-slate-600" />
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2">Categorias</p>
            <SidebarBtn active={view === 'GAME' && contentType === ContentType.NUMBERS} onClick={() => { setView('GAME'); setContentType(ContentType.NUMBERS); setIsSidebarOpen(false); }} icon={<Hash size={20} />} label="Números" colorClass="bg-blue-400" disabled={gameMode === GameMode.MEMORY} />
            <SidebarBtn active={view === 'GAME' && contentType === ContentType.ALPHABET} onClick={() => { setView('GAME'); setContentType(ContentType.ALPHABET); setIsSidebarOpen(false); }} icon={<Type size={20} />} label="Alfabeto" colorClass="bg-green-400" disabled={gameMode === GameMode.MEMORY} />
            <SidebarBtn active={view === 'GAME' && contentType === ContentType.ANIMALS} onClick={() => { setView('GAME'); setContentType(ContentType.ANIMALS); setIsSidebarOpen(false); }} icon={<Cat size={20} />} label="Animais" colorClass="bg-yellow-400" />
          </div>
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2">Modos</p>
            <SidebarBtn active={view === 'GAME' && gameMode === GameMode.EXPLORE} onClick={() => { setView('GAME'); setGameMode(GameMode.EXPLORE); setIsSidebarOpen(false); }} icon={<Eye size={20} />} label="Explorar" colorClass="bg-orange-400" />
            <SidebarBtn active={view === 'GAME' && gameMode === GameMode.FLASHCARD} onClick={() => { setView('GAME'); setGameMode(GameMode.FLASHCARD); setIsSidebarOpen(false); }} icon={<Play size={20} />} label="Assistir" colorClass="bg-pink-400" />
            <SidebarBtn active={view === 'GAME' && gameMode === GameMode.QUIZ} onClick={() => { setView('GAME'); setGameMode(GameMode.QUIZ); setIsSidebarOpen(false); }} icon={<HelpCircle size={20} />} label="Quiz" colorClass="bg-teal-400" />
            <SidebarBtn active={view === 'GAME' && gameMode === GameMode.MEMORY} onClick={() => { setView('GAME'); setGameMode(GameMode.MEMORY); setContentType(ContentType.ANIMALS); setIsSidebarOpen(false); }} icon={<Grid size={20} />} label="Memória" colorClass="bg-indigo-400" />
          </div>
        </div>
        <div className="p-4 border-t">
          <button onClick={() => signOut(auth)} className="w-full flex items-center gap-3 p-3 text-slate-400 font-bold hover:text-red-500 transition-colors"><LogOut size={20} /> Sair</button>
        </div>
      </div>

      <main className="flex-1 flex flex-col min-h-0 bg-transparent">
        <header className="h-16 flex items-center justify-between px-4 shrink-0">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 md:hidden"><Menu size={24} /></button>
          
          <div className="flex-1 flex justify-center">
            {gameMode === GameMode.MEMORY && isMemorySetup ? (
                <div className="flex items-center gap-4 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-2xl shadow-sm border">
                    <div className="flex items-center gap-2 font-black text-orange-500"><Clock size={18} /> {formatTime(memoryTime)}</div>
                    <div className="w-px h-4 bg-slate-200" />
                    <button onClick={() => setIsMemorySetup(false)} className="flex items-center gap-2 font-black text-blue-500 hover:scale-105 transition-transform"><RotateCcw size={18} /> Reiniciar</button>
                </div>
            ) : (
                <h1 className="text-xl md:text-2xl font-black text-slate-700 truncate px-4">
                  {view === 'DASHBOARD' ? "Meu Progresso" : gameMode === GameMode.MEMORY ? "Jogo da Memória" : gameMode === GameMode.QUIZ && quizTarget ? `Cadê o ${quizTarget.text}?` : "Aprenda Brincando"}
                </h1>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-hidden relative p-2 md:p-6 flex flex-col items-center justify-center">
            {view === 'DASHBOARD' && <Dashboard user={user} />}
            {view === 'GAME' && (
                <div className="w-full h-full flex flex-col items-center justify-center">
                    {feedback && <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none text-9xl animate-bounce">{feedback === 'correct' ? '🌟' : '🤔'}</div>}
                    
                    {gameMode === GameMode.EXPLORE && (
                        <div className={`grid w-full h-full p-2 gap-3 overflow-y-auto content-start justify-items-center ${contentType === ContentType.ANIMALS ? 'grid-cols-2 md:grid-cols-4 lg:grid-cols-5' : 'grid-cols-3 md:grid-cols-6 lg:grid-cols-8'}`}>
                            {items.map(item => (
                                <div key={item.id} className="w-full aspect-square relative flex items-center justify-center">
                                    <GameButton 
                                        text={contentType === ContentType.ANIMALS ? '' : item.text} color={item.color} 
                                        active={activeItemId === item.id} isWhiteVariant={activeItemId !== item.id}
                                        onClick={(e) => handleItemClick(item, e)} isFlat={contentType === ContentType.ANIMALS}
                                        className="w-full h-full"
                                    />
                                    {contentType === ContentType.ANIMALS && (
                                        <div className="absolute inset-0 p-4 pointer-events-none flex flex-col items-center justify-center">
                                            <img src={item.image} className="w-[75%] h-[75%] object-contain" alt={item.text} />
                                            <span className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-tighter">{item.text}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {gameMode === GameMode.FLASHCARD && items.length > 0 && (
                        <div className="w-full max-w-lg aspect-square p-4">
                            <div className="relative w-full h-full">
                                <GameButton text={contentType === ContentType.ANIMALS ? '' : items[flashcardIndex].text} color={items[flashcardIndex].color} className="w-full h-full" onClick={() => {}} />
                                {contentType === ContentType.ANIMALS && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 pointer-events-none">
                                        <img src={items[flashcardIndex].image} className="w-2/3 h-2/3 object-contain mb-4" />
                                        <span className="text-4xl font-black text-slate-700 uppercase">{items[flashcardIndex].text}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {gameMode === GameMode.QUIZ && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl p-4 place-items-center">
                            {quizOptions.map(item => (
                                <div key={item.id} className="w-full max-w-[280px] aspect-square relative">
                                    <GameButton text={contentType === ContentType.ANIMALS ? '' : item.text} color={item.color} onClick={(e) => handleItemClick(item, e)} isFlat={contentType === ContentType.ANIMALS} className="w-full h-full" />
                                    {contentType === ContentType.ANIMALS && (
                                        <div className="absolute inset-0 p-8 pointer-events-none flex items-center justify-center">
                                            <img src={item.image} className="w-full h-full object-contain" alt={item.text} />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {gameMode === GameMode.MEMORY && (
                        <div className="w-full h-full flex flex-col items-center justify-center p-2">
                            {!isMemorySetup ? (
                                <div className="bg-white/90 p-8 rounded-[3rem] shadow-xl border border-white flex flex-col items-center gap-8 w-full max-w-lg">
                                    <div className="text-center space-y-2">
                                        <h2 className="text-2xl font-black text-slate-700">Dificuldade</h2>
                                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Escolha quantos pares</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 w-full">
                                        {[6, 8, 10, 15].map((d, i) => (
                                            <button 
                                                key={d} onClick={() => startMemoryGame(d)} 
                                                className="py-6 rounded-[2rem] text-xl font-black text-white shadow-lg active:scale-95 transition-all"
                                                style={{ backgroundColor: COLORS[i % COLORS.length] }}
                                            >
                                                {d} Pares
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className={`grid w-full h-full gap-2 p-1 content-center ${memoryDifficulty <= 8 ? 'grid-cols-4' : 'grid-cols-4 md:grid-cols-5 lg:grid-cols-6'}`}>
                                    {memoryCards.map(card => <MemoryCard key={card.id} item={card.item} isFlipped={card.isFlipped} isMatched={card.isMatched} onClick={() => handleMemoryCardClick(card.id)} />)}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
      </main>
    </div>
  );
};

const SidebarBtn: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string; colorClass: string; disabled?: boolean; }> = ({ active, onClick, icon, label, colorClass, disabled = false }) => (
  <button onClick={disabled ? undefined : onClick} disabled={disabled} className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-sm font-black transition-all ${disabled ? 'opacity-30' : active ? `${colorClass} text-white shadow-lg` : 'text-slate-400 hover:bg-slate-50'}`}>
    {icon} <span>{label}</span>
  </button>
);

export default App;
