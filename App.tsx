
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
  Menu, X, Play, HelpCircle, Eye, Hash, Type, Volume2, CaseUpper, CaseLower, 
  Mic, Cat, Grid, Lock, LayoutDashboard, Clock, AlertCircle, Trophy, Loader2, LogOut
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
  const [memoryDifficulty, setMemoryDifficulty] = useState<number>(6); 
  const [isMemorySetup, setIsMemorySetup] = useState(false); 
  const [memoryTime, setMemoryTime] = useState(0);
  const [memoryErrors, setMemoryErrors] = useState(0);
  const [isMemoryTimerActive, setIsMemoryTimerActive] = useState(false);

  const { speak, voices, selectedVoice, setSelectedVoice } = useSpeech();
  const confettiRef = useRef<ConfettiHandle>(null);
  const flashcardIntervalRef = useRef<any>(null);
  const memoryTimerRef = useRef<any>(null);
  const memoryPreviewTimeoutRef = useRef<any>(null);

  // --- Auth State ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const d = await getDoc(doc(db, 'users', u.uid));
        if (d.exists()) setProfile(d.data() as UserProfile);
      } else {
        setProfile(null);
      }
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  // --- Fetch Animals from Firestore ---
  useEffect(() => {
    const fetchAnimals = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'animals'));
        const animalsData = querySnapshot.docs.map((doc, i) => {
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

  useEffect(() => {
    setDisplayStyle('standard');
  }, [contentType]);

  // --- Data Generation ---
  useEffect(() => {
    let newItems: GameItem[] = [];
    const isAlt = displayStyle === 'alternate';

    if (contentType === ContentType.NUMBERS) {
      newItems = Array.from({length: 10}, (_, i) => {
        const num = i + 1;
        const numStr = num.toString();
        return { id: `num-${num}`, text: numStr, spokenText: numStr, color: COLORS[i % COLORS.length] };
      });
    } 
    else if (contentType === ContentType.ANIMALS) {
        const shuffled = [...firebaseAnimals].sort(() => Math.random() - 0.5);
        newItems = shuffled.slice(0, 15);
    }
    else {
      let data: string[] = [];
      if (contentType === ContentType.VOWELS) data = ['A', 'E', 'I', 'O', 'U'];
      else if (contentType === ContentType.ALPHABET) data = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');

      newItems = data.map((char, i) => {
        const finalChar = isAlt ? char.toLowerCase() : char;
        return { id: `${contentType}-${i}`, text: finalChar, spokenText: char, color: COLORS[i % COLORS.length] };
      });
    }
    setItems(newItems);
  }, [contentType, displayStyle, firebaseAnimals]);

  useEffect(() => {
    if (flashcardIntervalRef.current) clearInterval(flashcardIntervalRef.current);
    if (memoryTimerRef.current) clearInterval(memoryTimerRef.current);
    if (memoryPreviewTimeoutRef.current) clearTimeout(memoryPreviewTimeoutRef.current);
    setFeedback(null);
    setBlockInput(false);
    setActiveItemId(null);
    setQuizTarget(null);
    setIsMemorySetup(false);
    setQuizSessionStats({ correct: 0, wrong: 0 });
    setIsMemoryTimerActive(false);
    if (gameMode === GameMode.QUIZ) startQuizRound(items);
    else if (gameMode === GameMode.FLASHCARD) startFlashcard(items);
  }, [gameMode, items, view]);

  useEffect(() => {
    if (isMemoryTimerActive) {
        memoryTimerRef.current = setInterval(() => setMemoryTime(prev => prev + 1), 1000);
    } else {
        clearInterval(memoryTimerRef.current);
    }
    return () => clearInterval(memoryTimerRef.current);
  }, [isMemoryTimerActive]);

  // --- Persistence Logic ---
  const saveQuizStats = async (isCorrect: boolean) => {
    setQuizSessionStats(prev => ({
        correct: prev.correct + (isCorrect ? 1 : 0),
        wrong: prev.wrong + (isCorrect ? 0 : 1)
    }));

    if (user) {
      const statsRef = doc(db, 'users', user.uid, 'stats', 'quiz');
      const d = await getDoc(statsRef);
      const data: any = d.exists() ? d.data() : {};
      const current = data[contentType] || { correct: 0, wrong: 0 };
      
      await setDoc(statsRef, {
        ...data,
        [contentType]: {
          correct: current.correct + (isCorrect ? 1 : 0),
          wrong: current.wrong + (isCorrect ? 0 : 1)
        }
      });
    }
  };

  const saveMemoryResult = async () => {
    const result: MemoryResult = {
        id: Date.now().toString(),
        date: Date.now(),
        difficulty: memoryDifficulty,
        timeSeconds: memoryTime,
        errors: memoryErrors
    };
    
    if (user) {
      const statsRef = doc(db, 'users', user.uid, 'stats', 'memory');
      const d = await getDoc(statsRef);
      if (d.exists()) {
        await updateDoc(statsRef, { results: arrayUnion(result) });
      } else {
        await setDoc(statsRef, { results: [result] });
      }
    }
  };

  // --- Game Mechanics ---
  const getPhonetic = (text: string) => PRONUNCIATION_MAP[text.toUpperCase()] || text;
  const getSpeakableText = (item: GameItem) => item.spokenText || item.text;
  const getArticle = (item: GameItem) => item.gender || ANIMAL_GENDER_MAP[item.text.toUpperCase()] || 'o';

  const startMemoryGame = (pairCount: number) => {
    if (memoryPreviewTimeoutRef.current) clearTimeout(memoryPreviewTimeoutRef.current);
    let sourceItems = contentType === ContentType.ANIMALS ? firebaseAnimals : items;
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

    const previewDuration = pairCount * 500;
    speak("Memorize as cartas!");
    
    memoryPreviewTimeoutRef.current = setTimeout(() => {
        setMemoryCards(prev => prev.map(c => ({ ...c, isFlipped: false })));
        setBlockInput(false);
        speak("Valendo!");
        setIsMemoryTimerActive(true);
    }, previewDuration);
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
                const allMatched = newCards.every(c => c.isMatched || (c.id === c1.id || c.id === c2.id));
                if (allMatched) {
                    setIsMemoryTimerActive(false);
                    saveMemoryResult();
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
      const speakable = getSpeakableText(target);
      const article = getArticle(target);
      speak(`Cadê ${article} ${getPhonetic(speakable)}?`, () => setBlockInput(false));
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
        const wrongSpeakable = getSpeakableText(item);
        const targetSpeakable = quizTarget ? getSpeakableText(quizTarget) : '';
        const wrongArticle = getArticle(item);
        const targetArticle = quizTarget ? getArticle(quizTarget) : 'o';
        speak(`Não! Esse é ${wrongArticle} ${getPhonetic(wrongSpeakable)}.`, () => {
            setFeedback(null);
            setTimeout(() => {
                if (quizTarget) speak(`Tente de novo. Cadê ${targetArticle} ${getPhonetic(targetSpeakable)}?`, () => setBlockInput(false));
                else setBlockInput(false);
            }, 500);
        });
      }
    }
  };

  if (authLoading || isLoadingAssets) {
    return (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
            <div className="animate-bounce mb-8"><Logo className="w-64 h-auto" /></div>
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="animate-spin text-blue-500" size={48} />
                <p className="text-xl font-bold text-slate-500 animate-pulse">Preparando a diversão...</p>
            </div>
        </div>
    );
  }

  if (!user) return <Auth />;

  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col text-slate-700 bg-transparent">
      <Confetti ref={confettiRef} />

      {/* --- Sidebar --- */}
      <div className={`fixed inset-y-4 left-4 z-50 w-72 bg-white/90 backdrop-blur-xl shadow-2xl rounded-3xl border border-white/50 transform transition-transform duration-300 ease-in-out flex flex-col md:absolute md:translate-x-0 md:h-auto md:m-0 md:rounded-3xl md:top-4 md:left-4 md:bottom-4 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-[120%]'}`}>
        <div className="p-6 border-b border-slate-100/50 flex flex-col justify-center h-24 shrink-0 relative">
          <Logo className="h-10 w-auto" />
          {profile && <span className="text-xs font-bold text-blue-500 uppercase mt-1">Olá, {profile.name}!</span>}
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden absolute top-4 right-4 p-2 bg-slate-100 rounded-full text-slate-500"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6">
          <SidebarBtn active={view === 'DASHBOARD'} onClick={() => { setView('DASHBOARD'); setIsSidebarOpen(false); }} icon={<LayoutDashboard size={20} />} label="Meu Progresso" colorClass="bg-slate-600 shadow-slate-300" />

          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">Aprender</h3>
            <div className="space-y-2">
              <SidebarBtn active={view === 'GAME' && contentType === ContentType.NUMBERS} onClick={() => { setView('GAME'); setContentType(ContentType.NUMBERS); setIsSidebarOpen(false); }} icon={<Hash size={20} />} label="123 Números" colorClass="bg-blue-400 shadow-blue-200" disabled={gameMode === GameMode.MEMORY} />
              <SidebarBtn active={view === 'GAME' && contentType === ContentType.ALPHABET} onClick={() => { setView('GAME'); setContentType(ContentType.ALPHABET); setIsSidebarOpen(false); }} icon={<Type size={20} />} label="ABC Alfabeto" colorClass="bg-green-400 shadow-green-200" disabled={gameMode === GameMode.MEMORY} />
              <SidebarBtn active={view === 'GAME' && contentType === ContentType.VOWELS} onClick={() => { setView('GAME'); setContentType(ContentType.VOWELS); setIsSidebarOpen(false); }} icon={<Volume2 size={20} />} label="AEIOU Vogais" colorClass="bg-purple-400 shadow-purple-200" disabled={gameMode === GameMode.MEMORY} />
              <SidebarBtn active={view === 'GAME' && contentType === ContentType.ANIMALS} onClick={() => { setView('GAME'); setContentType(ContentType.ANIMALS); setIsSidebarOpen(false); }} icon={<Cat size={20} />} label="Animais" colorClass="bg-yellow-400 shadow-yellow-200" />
            </div>
          </div>

          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">Jogar</h3>
            <div className="space-y-2">
              <SidebarBtn active={view === 'GAME' && gameMode === GameMode.EXPLORE} onClick={() => { setView('GAME'); setGameMode(GameMode.EXPLORE); setIsSidebarOpen(false); }} icon={<Eye size={20} />} label="Explorar" colorClass="bg-orange-400 shadow-orange-200" />
              <SidebarBtn active={view === 'GAME' && gameMode === GameMode.FLASHCARD} onClick={() => { setView('GAME'); setGameMode(GameMode.FLASHCARD); setIsSidebarOpen(false); }} icon={<Play size={20} />} label="Observe" colorClass="bg-pink-400 shadow-pink-200" />
              <SidebarBtn active={view === 'GAME' && gameMode === GameMode.QUIZ} onClick={() => { setView('GAME'); setGameMode(GameMode.QUIZ); setIsSidebarOpen(false); }} icon={<HelpCircle size={20} />} label="Quiz" colorClass="bg-teal-400 shadow-teal-200" />
              <SidebarBtn active={view === 'GAME' && gameMode === GameMode.MEMORY} onClick={() => { setView('GAME'); setGameMode(GameMode.MEMORY); setContentType(ContentType.ANIMALS); setIsSidebarOpen(false); }} icon={<Grid size={20} />} label="Memória" colorClass="bg-indigo-400 shadow-indigo-200" />
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100">
           <button onClick={() => signOut(auth)} className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 font-bold hover:text-red-500 transition-colors"><LogOut size={20} /> Sair</button>
        </div>
      </div>

      <main className="flex-1 flex flex-col relative h-full md:pl-[300px]">
        <header className="h-14 md:h-16 shrink-0 flex items-center justify-between px-4 z-20">
          <button onClick={() => setIsSidebarOpen(true)} className="p-3 rounded-2xl bg-white shadow-lg shadow-slate-200/50 text-slate-600 md:hidden"><Menu size={20} /></button>
          <div className="flex-1 flex justify-center items-center gap-4">
             {view === 'GAME' && gameMode === GameMode.QUIZ && (
                <div className="hidden md:flex items-center gap-4 bg-white/60 px-4 py-1 rounded-full border border-white/50 backdrop-blur-sm">
                    <div className="flex items-center gap-1 text-green-600 font-bold"><Trophy size={16} /> {quizSessionStats.correct}</div>
                    <div className="flex items-center gap-1 text-red-500 font-bold"><AlertCircle size={16} /> {quizSessionStats.wrong}</div>
                </div>
             )}
            <h1 className="text-xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 drop-shadow-sm truncate px-4">
              {view === 'DASHBOARD' ? "Meu Progresso" : gameMode === GameMode.MEMORY ? "Jogo da Memória" : gameMode === GameMode.QUIZ && quizTarget ? `Encontre: ${quizTarget.text}` : "Aprenda Brincando"}
            </h1>
          </div>
        </header>

        <div className="flex-1 overflow-hidden relative p-2 md:p-4 flex flex-col items-center justify-center min-h-0">
            {view === 'DASHBOARD' && <Dashboard user={user} />}
            {view === 'GAME' && (
                <div className="w-full h-full relative flex flex-col items-center">
                    {feedback && <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/20 backdrop-blur-sm animate-in fade-in duration-200 text-9xl animate-bounce">{feedback === 'correct' ? '🌟' : '🤔'}</div>}
                    
                    {gameMode === GameMode.EXPLORE && (
                        <div className={`grid content-center justify-center justify-items-center w-full h-full overflow-y-auto ${contentType === ContentType.ANIMALS ? 'grid-cols-3 md:grid-cols-5' : contentType === ContentType.ALPHABET ? 'grid-cols-4 md:grid-cols-7' : 'grid-cols-2 md:grid-cols-5'} gap-2 md:gap-4 p-2`}>
                            {items.map(item => (
                                <div key={item.id} className="w-full aspect-square flex items-center justify-center">
                                    <GameButton 
                                        text={contentType === ContentType.ANIMALS ? '' : item.text} color={item.color} 
                                        active={activeItemId === item.id} isWhiteVariant={activeItemId !== item.id}
                                        onClick={(e) => handleItemClick(item, e)} isFlat={contentType === ContentType.ANIMALS}
                                        className="w-full h-full"
                                    />
                                    {contentType === ContentType.ANIMALS && <div className="absolute pointer-events-none flex items-center justify-center p-[15%]"><img src={item.image} className="w-full h-full object-contain" /></div>}
                                </div>
                            ))}
                        </div>
                    )}

                    {gameMode === GameMode.FLASHCARD && items.length > 0 && (
                        <div className="w-full h-full flex items-center justify-center p-4">
                            <div className="w-[min(65vh,80vw)] aspect-square relative">
                                <GameButton text={contentType === ContentType.ANIMALS ? '' : items[flashcardIndex].text} color={items[flashcardIndex].color} size="large" isFlat={contentType === ContentType.ANIMALS} className="w-full h-full" onClick={() => {}} />
                                {contentType === ContentType.ANIMALS && <div className="absolute inset-0 flex flex-col items-center justify-center p-6"><img src={items[flashcardIndex].image} className="max-w-[70%] max-h-[70%] object-contain mb-4" /><span className="text-3xl font-black text-slate-700">{items[flashcardIndex].text}</span></div>}
                            </div>
                        </div>
                    )}

                    {gameMode === GameMode.QUIZ && (
                        <div className="flex gap-4 md:gap-12 flex-wrap justify-center items-center w-full h-full p-4">
                            {quizOptions.map(item => (
                                <div key={item.id} className="w-[28vw] md:w-[20vw] aspect-square max-w-[250px] relative">
                                    <GameButton text={contentType === ContentType.ANIMALS ? '' : item.text} color={item.color} onClick={(e) => handleItemClick(item, e)} isFlat={contentType === ContentType.ANIMALS} className="w-full h-full" />
                                    {contentType === ContentType.ANIMALS && <div className="absolute inset-0 pointer-events-none flex items-center justify-center"><img src={item.image} className="w-[70%] h-[70%] object-contain" /></div>}
                                </div>
                            ))}
                        </div>
                    )}

                    {gameMode === GameMode.MEMORY && (
                        <div className="w-full h-full flex flex-col items-center justify-center">
                            {!isMemorySetup ? (
                                <div className="bg-white/80 backdrop-blur-md p-8 rounded-[3rem] shadow-xl flex flex-col items-center gap-6">
                                    <h2 className="text-2xl font-bold text-slate-700">Escolha a Dificuldade</h2>
                                    <div className="flex gap-4 flex-wrap justify-center">
                                        {[6, 8, 10, 15].map(d => <button key={d} onClick={() => startMemoryGame(d)} className="px-8 py-4 bg-white border-4 border-slate-100 rounded-3xl font-black hover:scale-105 transition-transform text-slate-600">{d} Pares</button>)}
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full h-full grid grid-cols-4 md:grid-cols-6 gap-1 md:gap-3 p-2">
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
  <button onClick={disabled ? undefined : onClick} disabled={disabled} className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-sm font-bold transition-all ${disabled ? 'opacity-30 cursor-not-allowed' : active ? `${colorClass} text-white shadow-lg scale-105` : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>
    {icon} <span>{label}</span>
  </button>
);

export default App;
