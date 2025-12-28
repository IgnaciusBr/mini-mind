
import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { 
  ContentType, GameMode, COLORS, GameItem, 
  PRONUNCIATION_MAP, ANIMAL_GENDER_MAP, UserProfile 
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
  Cat, Grid, LayoutDashboard, Clock, RotateCcw, LogOut, Loader2
} from 'lucide-react';

interface MemoryCardState {
    id: string; 
    pairId: string; 
    item: GameItem;
    isFlipped: boolean;
    isMatched: boolean;
}

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState<'GAME' | 'DASHBOARD'>('GAME');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [contentType, setContentType] = useState<ContentType>(ContentType.NUMBERS);
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.EXPLORE);
  const [items, setItems] = useState<GameItem[]>([]);
  const [firebaseAnimals, setFirebaseAnimals] = useState<GameItem[]>([]);
  
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [quizTarget, setQuizTarget] = useState<GameItem | null>(null);
  const [quizOptions, setQuizOptions] = useState<GameItem[]>([]);
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [blockInput, setBlockInput] = useState(false);

  const [memoryCards, setMemoryCards] = useState<MemoryCardState[]>([]);
  const [isMemorySetup, setIsMemorySetup] = useState(false); 
  const [memoryTime, setMemoryTime] = useState(0);
  const [isMemoryTimerActive, setIsMemoryTimerActive] = useState(false);

  const { speak } = useSpeech();
  const confettiRef = useRef<ConfettiHandle>(null);
  const flashcardIntervalRef = useRef<any>(null);
  const memoryTimerRef = useRef<any>(null);

  // --- Auth & Initial Load ---
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

  useEffect(() => {
    const fetchAnimals = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'animals'));
        setFirebaseAnimals(querySnapshot.docs.map(doc => ({
          id: doc.id,
          text: doc.data().name,
          color: '#F8F1E1',
          image: doc.data().image_url,
          gender: doc.data().gender
        })));
      } catch (e) { console.error(e); }
    };
    fetchAnimals();
  }, []);

  // --- Content Generation ---
  useEffect(() => {
    if (contentType === ContentType.ANIMALS) {
      setItems([...firebaseAnimals].sort(() => Math.random() - 0.5).slice(0, 15));
    } else if (contentType === ContentType.NUMBERS) {
      setItems(Array.from({length: 10}, (_, i) => ({ id: `n-${i+1}`, text: (i+1).toString(), color: COLORS[i % COLORS.length] })));
    } else {
      const data = contentType === ContentType.VOWELS ? ['A', 'E', 'I', 'O', 'U'] : "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');
      setItems(data.map((c, i) => ({ id: `c-${i}`, text: c, color: COLORS[i % COLORS.length] })));
    }
  }, [contentType, firebaseAnimals]);

  // --- Reset State on Mode Change ---
  useEffect(() => {
    if (flashcardIntervalRef.current) clearInterval(flashcardIntervalRef.current);
    if (memoryTimerRef.current) clearInterval(memoryTimerRef.current);
    
    setFeedback(null);
    setBlockInput(false);
    setQuizTarget(null);
    setIsMemorySetup(false);
    setIsMemoryTimerActive(false);

    if (gameMode === GameMode.QUIZ) startQuizRound(items);
    else if (gameMode === GameMode.FLASHCARD) startFlashcard(items);
  }, [gameMode, contentType, view]);

  useEffect(() => {
    if (isMemoryTimerActive) memoryTimerRef.current = setInterval(() => setMemoryTime(t => t + 1), 1000);
    else clearInterval(memoryTimerRef.current);
    return () => clearInterval(memoryTimerRef.current);
  }, [isMemoryTimerActive]);

  // --- Helpers ---
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  const getArt = (it: GameItem) => ANIMAL_GENDER_MAP[it.text.toUpperCase()] === 'a' ? 'a' : 'o';

  // --- Game Logic ---
  const startMemoryGame = (pairs: number) => {
    let pool = contentType === ContentType.ANIMALS ? firebaseAnimals : items;
    if (pool.length < pairs) pool = firebaseAnimals;
    const selected = [...pool].sort(() => Math.random() - 0.5).slice(0, pairs);
    let cards: MemoryCardState[] = [];
    selected.forEach(it => {
      cards.push({ id: `${it.id}-1`, pairId: it.id, item: it, isFlipped: true, isMatched: false });
      cards.push({ id: `${it.id}-2`, pairId: it.id, item: it, isFlipped: true, isMatched: false });
    });
    setMemoryCards(cards.sort(() => Math.random() - 0.5));
    setIsMemorySetup(true);
    setMemoryTime(0);
    setBlockInput(true);
    speak("Memorize!");
    setTimeout(() => {
      setMemoryCards(prev => prev.map(c => ({ ...c, isFlipped: false })));
      setBlockInput(false);
      setIsMemoryTimerActive(true);
    }, pairs * 500);
  };

  const handleMemoryClick = (id: string) => {
    if (blockInput) return;
    const idx = memoryCards.findIndex(c => c.id === id);
    if (idx === -1 || memoryCards[idx].isFlipped || memoryCards[idx].isMatched) return;

    const newCards = [...memoryCards];
    newCards[idx].isFlipped = true;
    setMemoryCards(newCards);
    speak(newCards[idx].item.text);

    const active = newCards.filter(c => c.isFlipped && !c.isMatched);
    if (active.length === 2) {
      setBlockInput(true);
      const [c1, c2] = active;
      if (c1.pairId === c2.pairId) {
        setTimeout(() => {
          setMemoryCards(prev => prev.map(c => (c.id === c1.id || c.id === c2.id) ? { ...c, isMatched: true } : c));
          confettiRef.current?.explode(window.innerWidth/2, window.innerHeight/2);
          setBlockInput(false);
          if (newCards.every(c => c.isMatched || (c.id === c1.id || c.id === c2.id))) {
            setIsMemoryTimerActive(false);
            speak("Você ganhou!");
          }
        }, 500);
      } else {
        setTimeout(() => {
          setMemoryCards(prev => prev.map(c => (c.id === c1.id || c.id === c2.id) ? { ...c, isFlipped: false } : c));
          setBlockInput(false);
        }, 1200);
      }
    }
  };

  const startQuizRound = (its: GameItem[]) => {
    if (its.length === 0) return;
    const target = its[Math.floor(Math.random() * its.length)];
    setQuizTarget(target);
    const opts = [target, ...its.filter(i => i.id !== target.id).sort(() => Math.random() - 0.5).slice(0, 2)];
    setQuizOptions(opts.sort(() => Math.random() - 0.5));
    setBlockInput(true);
    setTimeout(() => speak(`Onde está ${getArt(target)} ${target.text}?`, () => setBlockInput(false)), 500);
  };

  const startFlashcard = (its: GameItem[]) => {
    if (its.length === 0) return;
    setFlashcardIndex(0);
    speak(its[0].text);
    flashcardIntervalRef.current = setInterval(() => {
      setFlashcardIndex(p => {
        const next = (p + 1) % its.length;
        speak(its[next].text);
        return next;
      });
    }, 3500);
  };

  const handleItemClick = (it: GameItem, e: any) => {
    if (blockInput) return;
    if (gameMode === GameMode.EXPLORE) {
      setActiveItemId(it.id);
      confettiRef.current?.explode(e.clientX, e.clientY);
      speak(it.text);
    } else if (gameMode === GameMode.QUIZ) {
      if (it.id === quizTarget?.id) {
        setFeedback('correct');
        setBlockInput(true);
        confettiRef.current?.explode(e.clientX, e.clientY);
        speak("Parabéns!", () => setTimeout(() => startQuizRound(items), 1000));
      } else {
        setFeedback('wrong');
        setBlockInput(true);
        speak(`Não! Esse é ${getArt(it)} ${it.text}.`, () => {
          setFeedback(null);
          setTimeout(() => speak(`Tente de novo. Onde está ${getArt(quizTarget!)} ${quizTarget!.text}?`, () => setBlockInput(false)), 500);
        });
      }
    }
  };

  if (authLoading) return <div className="h-screen w-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={48} /></div>;
  if (!user) return <Auth />;

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-slate-50 relative">
      <Confetti ref={confettiRef} />
      
      {/* Sidebar Overlay */}
      <div className={`fixed inset-0 z-50 transition-all ${isSidebarOpen ? 'bg-black/20 backdrop-blur-sm pointer-events-auto' : 'pointer-events-none bg-transparent'}`} onClick={() => setIsSidebarOpen(false)} />
      
      <div className={`fixed inset-y-0 left-0 z-[60] w-72 bg-white shadow-2xl transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
        <div className="p-6 border-b flex items-center justify-between">
          <Logo className="h-8 w-auto" />
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 text-slate-400"><X /></button>
        </div>
        <div className="p-4 space-y-6 overflow-y-auto h-[calc(100vh-160px)] custom-scrollbar">
          <SidebarBtn active={view === 'DASHBOARD'} onClick={() => { setView('DASHBOARD'); setIsSidebarOpen(false); }} icon={<LayoutDashboard size={20} />} label="Progresso" color="#64748b" />
          <div>
            <p className="px-3 text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2">Categorias</p>
            <SidebarBtn active={view === 'GAME' && contentType === ContentType.NUMBERS} onClick={() => { setView('GAME'); setContentType(ContentType.NUMBERS); setIsSidebarOpen(false); }} icon={<Hash size={20} />} label="Números" color="#60a5fa" disabled={gameMode === GameMode.MEMORY} />
            <SidebarBtn active={view === 'GAME' && contentType === ContentType.ALPHABET} onClick={() => { setView('GAME'); setContentType(ContentType.ALPHABET); setIsSidebarOpen(false); }} icon={<Type size={20} />} label="Alfabeto" color="#4ade80" disabled={gameMode === GameMode.MEMORY} />
            <SidebarBtn active={view === 'GAME' && contentType === ContentType.ANIMALS} onClick={() => { setView('GAME'); setContentType(ContentType.ANIMALS); setIsSidebarOpen(false); }} icon={<Cat size={20} />} label="Animais" color="#fbbf24" />
          </div>
          <div>
            <p className="px-3 text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2">Jogar</p>
            <SidebarBtn active={view === 'GAME' && gameMode === GameMode.EXPLORE} onClick={() => { setView('GAME'); setGameMode(GameMode.EXPLORE); setIsSidebarOpen(false); }} icon={<Eye size={20} />} label="Explorar" color="#fb923c" />
            <SidebarBtn active={view === 'GAME' && gameMode === GameMode.FLASHCARD} onClick={() => { setView('GAME'); setGameMode(GameMode.FLASHCARD); setIsSidebarOpen(false); }} icon={<Play size={20} />} label="Assistir" color="#f472b6" />
            <SidebarBtn active={view === 'GAME' && gameMode === GameMode.QUIZ} onClick={() => { setView('GAME'); setGameMode(GameMode.QUIZ); setIsSidebarOpen(false); }} icon={<HelpCircle size={20} />} label="Quiz" color="#2dd4bf" />
            <SidebarBtn active={view === 'GAME' && gameMode === GameMode.MEMORY} onClick={() => { setView('GAME'); setGameMode(GameMode.MEMORY); setContentType(ContentType.ANIMALS); setIsSidebarOpen(false); }} icon={<Grid size={20} />} label="Memória" color="#818cf8" />
          </div>
        </div>
        <div className="p-4 border-t">
          <button onClick={() => signOut(auth)} className="w-full flex items-center gap-3 p-3 text-slate-400 font-bold hover:text-red-500 transition-colors"><LogOut size={18} /> Sair</button>
        </div>
      </div>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center justify-between px-4 shrink-0 bg-white/50 backdrop-blur-md">
          <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 text-slate-600"><Menu /></button>
          <div className="flex-1 flex justify-center">
            {gameMode === GameMode.MEMORY && isMemorySetup ? (
              <div className="flex items-center gap-4 bg-white px-4 py-1.5 rounded-2xl shadow-sm border">
                <div className="flex items-center gap-2 font-black text-orange-500 text-sm"><Clock size={16}/>{formatTime(memoryTime)}</div>
                <button onClick={() => setIsMemorySetup(false)} className="text-blue-500 font-black text-sm flex items-center gap-1 hover:scale-105 transition-transform"><RotateCcw size={16}/>Novo</button>
              </div>
            ) : (
              <h1 className="text-lg md:text-xl font-black text-slate-700 truncate px-2">
                {view === 'DASHBOARD' ? "Meu Progresso" : gameMode === GameMode.QUIZ && quizTarget ? `Onde está ${getArt(quizTarget)} ${quizTarget.text}?` : "Aprenda Brincando"}
              </h1>
            )}
          </div>
          <div className="w-10 md:hidden" />
        </header>

        <div className="flex-1 p-2 md:p-6 overflow-hidden relative flex flex-col items-center justify-center">
          {view === 'DASHBOARD' && <Dashboard user={user} />}
          {view === 'GAME' && (
            <div className="w-full h-full flex flex-col items-center justify-center">
              {feedback && <div className="fixed inset-0 z-50 flex items-center justify-center text-8xl md:text-9xl animate-bounce pointer-events-none">{feedback === 'correct' ? '🌟' : '🤔'}</div>}
              
              {gameMode === GameMode.EXPLORE && (
                <div className={`grid w-full h-full gap-3 p-2 overflow-y-auto content-start justify-items-center ${contentType === ContentType.ANIMALS ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-3 md:grid-cols-6'}`}>
                  {items.map(it => (
                    <div key={it.id} className="w-full aspect-square relative group">
                      <GameButton 
                        text={contentType === ContentType.ANIMALS ? '' : it.text} color={it.color} 
                        active={activeItemId === it.id} isWhiteVariant={activeItemId !== it.id}
                        onClick={(e) => handleItemClick(it, e)} isFlat={contentType === ContentType.ANIMALS}
                        className="w-full h-full"
                      />
                      {contentType === ContentType.ANIMALS && (
                        <div className="absolute inset-0 p-3 pointer-events-none flex flex-col items-center justify-center">
                          <img src={it.image} className="w-4/5 h-4/5 object-contain" alt={it.text} />
                          <span className="text-[10px] font-black text-slate-400 mt-1 uppercase truncate w-full text-center">{it.text}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {gameMode === GameMode.FLASHCARD && items.length > 0 && (
                <div className="w-full max-w-sm aspect-square p-4 relative">
                  <GameButton text={contentType === ContentType.ANIMALS ? '' : items[flashcardIndex].text} color={items[flashcardIndex].color} className="w-full h-full" onClick={() => {}} />
                  {contentType === ContentType.ANIMALS && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                      <img src={items[flashcardIndex].image} className="w-2/3 h-2/3 object-contain mb-4" />
                      <span className="text-3xl font-black text-slate-700 uppercase">{items[flashcardIndex].text}</span>
                    </div>
                  )}
                </div>
              )}

              {gameMode === GameMode.QUIZ && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-2xl p-4">
                  {quizOptions.map(it => (
                    <div key={it.id} className="w-full aspect-square relative">
                      <GameButton text={contentType === ContentType.ANIMALS ? '' : it.text} color={it.color} onClick={(e) => handleItemClick(it, e)} isFlat={contentType === ContentType.ANIMALS} className="w-full h-full" />
                      {contentType === ContentType.ANIMALS && <div className="absolute inset-0 p-6 pointer-events-none flex items-center justify-center"><img src={it.image} className="w-full h-full object-contain" /></div>}
                    </div>
                  ))}
                </div>
              )}

              {gameMode === GameMode.MEMORY && (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  {!isMemorySetup ? (
                    <div className="bg-white p-8 rounded-[3rem] shadow-xl border w-full max-w-md flex flex-col gap-6 text-center">
                      <h2 className="text-2xl font-black text-slate-700">Dificuldade</h2>
                      <div className="grid grid-cols-2 gap-4">
                        {[6, 8, 10, 15].map((d, i) => (
                          <button key={d} onClick={() => startMemoryGame(d)} className="py-6 rounded-3xl text-xl font-black text-white shadow-lg active:scale-95 transition-all" style={{ backgroundColor: COLORS[i % COLORS.length] }}>{d} Pares</button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className={`grid w-full h-full gap-2 p-1 overflow-y-auto content-center ${memoryCards.length > 16 ? 'grid-cols-4' : 'grid-cols-3 md:grid-cols-4'}`}>
                      {memoryCards.map(c => <MemoryCard key={c.id} item={c.item} isFlipped={c.isFlipped} isMatched={c.isMatched} onClick={() => handleMemoryClick(c.id)} />)}
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

const SidebarBtn: React.FC<{ active: boolean, onClick: () => void, icon: any, label: string, color: string, disabled?: boolean }> = ({ active, onClick, icon, label, color, disabled }) => (
  <button onClick={disabled ? undefined : onClick} className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-sm font-black transition-all ${disabled ? 'opacity-30' : active ? 'text-white shadow-lg scale-[1.02]' : 'text-slate-400 hover:bg-slate-50'}`} style={active ? { backgroundColor: color } : {}}>
    {icon} <span>{label}</span>
  </button>
);

export default App;
