
import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, getDocs, doc, setDoc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { ContentType, GameMode, COLORS, GameItem, MemoryResult, QuizHistory, UserProfile } from './types';
import { useSpeech } from './hooks/useSpeech';
import Confetti, { ConfettiHandle } from './components/Confetti';
import { GameButton } from './components/GameButton';
import { MemoryCard } from './components/MemoryCard';
import { Logo } from './components/Logo';
import { Dashboard } from './components/Dashboard';
import { AuthForm } from './components/AuthForm';
import { 
  Menu, X, Play, HelpCircle, Eye, Hash, Type, Volume2, 
  CaseUpper, CaseLower, Mic, Cat, Grid, Lock, LayoutDashboard, 
  Clock, AlertCircle, Trophy, Loader2, LogOut 
} from 'lucide-react';

type ViewState = 'GAME' | 'DASHBOARD';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);

  const [view, setView] = useState<ViewState>('GAME');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [contentType, setContentType] = useState<ContentType>(ContentType.NUMBERS);
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.EXPLORE);
  const [items, setItems] = useState<GameItem[]>([]);
  const [displayStyle, setDisplayStyle] = useState<'standard' | 'alternate'>('standard');
  
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [quizTarget, setQuizTarget] = useState<GameItem | null>(null);
  const [quizOptions, setQuizOptions] = useState<GameItem[]>([]);
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [blockInput, setBlockInput] = useState(false);
  const [quizSessionStats, setQuizSessionStats] = useState({ correct: 0, wrong: 0 });

  const [memoryCards, setMemoryCards] = useState<any[]>([]);
  const [memoryDifficulty, setMemoryDifficulty] = useState(6);
  const [isMemorySetup, setIsMemorySetup] = useState(false);
  const [memoryTime, setMemoryTime] = useState(0);
  const [memoryErrors, setMemoryErrors] = useState(0);
  const [isMemoryTimerActive, setIsMemoryTimerActive] = useState(false);

  const { speak, voices, selectedVoice, setSelectedVoice } = useSpeech();
  const confettiRef = useRef<ConfettiHandle>(null);
  const flashcardIntervalRef = useRef<any>(null);
  const memoryTimerRef = useRef<any>(null);

  // --- Firebase Auth Observer ---
  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        if (userDoc.exists()) {
            setUser(userDoc.data() as UserProfile);
        } else {
            setUser({
                uid: firebaseUser.uid,
                displayName: firebaseUser.displayName || 'Explorador',
                email: firebaseUser.email || '',
                age: 0
            });
        }
      } else {
        setUser(null);
      }
      setAuthLoading(false);
      setIsLoadingAssets(false);
    });
  }, []);

  // --- Fetch Items (including Animals from Firestore) ---
  useEffect(() => {
    const loadContent = async () => {
        let newItems: GameItem[] = [];
        const isAlt = displayStyle === 'alternate';

        if (contentType === ContentType.ANIMALS) {
            try {
                const querySnapshot = await getDocs(collection(db, "animals"));
                const docs = querySnapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        text: data.name,
                        spokenText: data.name,
                        image: data.image_url,
                        gender: data.gender || 'm',
                        color: '#E6DBBF'
                    } as GameItem;
                });
                newItems = docs.sort(() => Math.random() - 0.5).slice(0, 15);
            } catch (e) {
                console.error("Error fetching animals:", e);
            }
        } else if (contentType === ContentType.NUMBERS) {
            newItems = Array.from({length: 10}, (_, i) => ({
                id: `num-${i+1}`,
                text: (i + 1).toString(),
                spokenText: (i + 1).toString(),
                color: COLORS[i % COLORS.length]
            }));
        } else {
            let data = contentType === ContentType.VOWELS ? ['A', 'E', 'I', 'O', 'U'] : "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');
            newItems = data.map((char, i) => ({
                id: `${contentType}-${i}`,
                text: isAlt ? char.toLowerCase() : char,
                spokenText: char,
                color: COLORS[i % COLORS.length]
            }));
        }
        setItems(newItems);
    };

    if (user) loadContent();
  }, [contentType, displayStyle, user]);

  // --- Game State Handlers ---
  const saveQuizStats = async (isCorrect: boolean) => {
    if (!user) return;
    setQuizSessionStats(prev => ({
        correct: prev.correct + (isCorrect ? 1 : 0),
        wrong: prev.wrong + (isCorrect ? 0 : 1)
    }));

    const statsRef = doc(db, "users", user.uid, "stats", "quiz");
    const snap = await getDoc(statsRef);
    
    if (!snap.exists()) {
        await setDoc(statsRef, { [contentType]: { correct: isCorrect ? 1 : 0, wrong: isCorrect ? 0 : 1 } });
    } else {
        await updateDoc(statsRef, {
            [`${contentType}.correct`]: increment(isCorrect ? 1 : 0),
            [`${contentType}.wrong`]: increment(isCorrect ? 0 : 1)
        });
    }
  };

  const saveMemoryResult = async () => {
    if (!user) return;
    const result: MemoryResult = {
        id: Date.now().toString(),
        date: Date.now(),
        difficulty: memoryDifficulty,
        timeSeconds: memoryTime,
        errors: memoryErrors
    };
    const resultsRef = doc(db, "users", user.uid, "stats", "memory_history");
    const snap = await getDoc(resultsRef);
    const existing = snap.exists() ? snap.data().history || [] : [];
    await setDoc(resultsRef, { history: [...existing, result] });
  };

  // --- Quiz & Memory Implementation ---
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
        const article = target.gender === 'f' ? 'a' : 'o';
        speak(`Cadê ${article} ${target.text}?`, () => setBlockInput(false));
    }, 500);
  };

  const handleItemClick = (item: GameItem, e: React.MouseEvent) => {
    if (blockInput) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    if (gameMode === GameMode.EXPLORE) {
      setActiveItemId(item.id);
      if (confettiRef.current) confettiRef.current.explode(x, y);
      speak(item.spokenText || item.text);
    } else if (gameMode === GameMode.QUIZ) {
      if (item.id === quizTarget?.id) {
        setFeedback('correct');
        saveQuizStats(true);
        if (confettiRef.current) confettiRef.current.explode(x, y);
        speak("Parabéns!", () => setTimeout(() => startQuizRound(items), 1000));
      } else {
        setFeedback('wrong');
        saveQuizStats(false);
        setBlockInput(true);
        const article = item.gender === 'f' ? 'a' : 'o';
        const targetArticle = quizTarget?.gender === 'f' ? 'a' : 'o';
        speak(`Não! Esse é ${article} ${item.text}. Cadê ${targetArticle} ${quizTarget?.text}?`, () => {
            setFeedback(null);
            setBlockInput(false);
        });
      }
    }
  };

  // --- UI Logic ---
  if (authLoading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-500" size={48} /></div>;
  if (!user) return <AuthForm />;

  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col text-slate-700 bg-transparent">
      <Confetti ref={confettiRef} />
      
      {/* Sidebar */}
      <div className={`fixed inset-y-4 left-4 z-50 w-72 bg-white/90 backdrop-blur-xl shadow-2xl rounded-3xl border border-white/50 transform transition-transform duration-300 md:absolute md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-[120%]'}`}>
        <div className="p-6 border-b flex justify-between items-center h-24">
          <Logo className="h-14" />
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 bg-slate-100 rounded-full"><X size={20} /></button>
        </div>
        <div className="p-4 space-y-6 overflow-y-auto h-[calc(100%-160px)] custom-scrollbar">
            <SidebarBtn active={view === 'DASHBOARD'} onClick={() => {setView('DASHBOARD'); setIsSidebarOpen(false);}} icon={<LayoutDashboard size={20}/>} label="Progresso" colorClass="bg-slate-600"/>
            <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Conteúdo</p>
                <SidebarBtn active={contentType === ContentType.NUMBERS && view === 'GAME'} onClick={() => setContentType(ContentType.NUMBERS)} icon={<Hash size={20}/>} label="Números" colorClass="bg-blue-400"/>
                <SidebarBtn active={contentType === ContentType.ANIMALS && view === 'GAME'} onClick={() => setContentType(ContentType.ANIMALS)} icon={<Cat size={20}/>} label="Animais" colorClass="bg-yellow-400"/>
            </div>
            <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Modos</p>
                <SidebarBtn active={gameMode === GameMode.EXPLORE} onClick={() => setGameMode(GameMode.EXPLORE)} icon={<Eye size={20}/>} label="Explorar" colorClass="bg-orange-400"/>
                <SidebarBtn active={gameMode === GameMode.QUIZ} onClick={() => {setGameMode(GameMode.QUIZ); startQuizRound(items);}} icon={<HelpCircle size={20}/>} label="Quiz" colorClass="bg-teal-400"/>
            </div>
        </div>
        <div className="absolute bottom-4 left-4 right-4">
            <button onClick={() => signOut(auth)} className="w-full flex items-center justify-center gap-2 p-3 bg-red-50 text-red-500 rounded-2xl font-bold hover:bg-red-100 transition-colors">
                <LogOut size={18}/> Sair
            </button>
        </div>
      </div>

      <main className="flex-1 flex flex-col relative h-full md:pl-[300px]">
        <header className="h-16 flex items-center justify-between px-6 z-20">
          <button onClick={() => setIsSidebarOpen(true)} className="p-3 bg-white shadow-md rounded-2xl md:hidden"><Menu size={20}/></button>
          <div className="flex-1 text-center">
            <span className="text-sm font-bold text-slate-400">Olá, {user.displayName}!</span>
            <h1 className="text-xl md:text-3xl font-black text-slate-700">{view === 'DASHBOARD' ? 'Seu Progresso' : contentType}</h1>
          </div>
          <div className="w-10"></div>
        </header>

        <div className="flex-1 p-4 relative overflow-hidden">
            {view === 'DASHBOARD' ? <Dashboard userId={user.uid} /> : (
                <div className={`grid h-full w-full gap-4 ${contentType === ContentType.ANIMALS ? 'grid-cols-3 md:grid-cols-5' : 'grid-cols-2 md:grid-cols-5'}`}>
                    {(gameMode === GameMode.QUIZ ? quizOptions : items).map(item => (
                        <GameButton 
                            key={item.id}
                            text={contentType === ContentType.ANIMALS ? '' : item.text}
                            color={item.color}
                            onClick={(e) => handleItemClick(item, e as any)}
                            active={activeItemId === item.id}
                            isFlat={contentType === ContentType.ANIMALS}
                            className="h-full aspect-square"
                        >
                            {item.image && <img src={item.image} className="w-[80%] h-[80%] object-contain drop-shadow-lg" />}
                        </GameButton>
                    ))}
                </div>
            )}
        </div>
      </main>
    </div>
  );
};

const SidebarBtn: React.FC<{active: boolean, onClick: () => void, icon: any, label: string, colorClass: string}> = ({active, onClick, icon, label, colorClass}) => (
    <button onClick={onClick} className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${active ? `${colorClass} text-white shadow-lg scale-105` : 'text-slate-400 hover:bg-slate-50'}`}>
        {icon} <span>{label}</span>
    </button>
);

export default App;
