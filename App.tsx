import React, { useState, useEffect, useRef } from 'react';
import { ContentType, GameMode, COLORS, GameItem, PRONUNCIATION_MAP, ANIMAL_URLS, ANIMAL_GENDER_MAP, MemoryResult, QuizHistory, QuizStats } from './types';
import { useSpeech } from './hooks/useSpeech';
import Confetti, { ConfettiHandle } from './components/Confetti';
import { GameButton } from './components/GameButton';
import { MemoryCard } from './components/MemoryCard';
import { Logo } from './components/Logo';
import { Dashboard } from './components/Dashboard';
import { 
  Menu, 
  X,
  Play,
  HelpCircle,
  Eye,
  Hash,
  Type,
  Volume2,
  CaseUpper,
  CaseLower,
  Mic,
  Cat,
  Grid,
  Lock,
  LayoutDashboard,
  Clock,
  AlertCircle,
  Trophy,
  Loader2
} from 'lucide-react';

// Memory Game Interface
interface MemoryCardState {
    id: string; // Unique ID for the card instance
    pairId: string; // ID of the content (to match pairs)
    item: GameItem;
    isFlipped: boolean;
    isMatched: boolean;
}

const STORAGE_KEY_MEMORY = 'ab_memory_results';
const STORAGE_KEY_QUIZ = 'ab_quiz_history';

type ViewState = 'GAME' | 'DASHBOARD';

const App: React.FC = () => {
  // --- Loading State ---
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);

  // State
  const [view, setView] = useState<ViewState>('GAME');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [contentType, setContentType] = useState<ContentType>(ContentType.NUMBERS);
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.EXPLORE);
  const [items, setItems] = useState<GameItem[]>([]);
  
  // 'standard' = 123 / ABC
  // 'alternate' = ••• / abc
  const [displayStyle, setDisplayStyle] = useState<'standard' | 'alternate'>('standard');
  
  // Game State
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [quizTarget, setQuizTarget] = useState<GameItem | null>(null);
  const [quizOptions, setQuizOptions] = useState<GameItem[]>([]);
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [blockInput, setBlockInput] = useState(false);

  // Stats State (Live Counters)
  const [quizSessionStats, setQuizSessionStats] = useState<{correct: number, wrong: number}>({ correct: 0, wrong: 0 });

  // Memory Game State
  const [memoryCards, setMemoryCards] = useState<MemoryCardState[]>([]);
  const [memoryDifficulty, setMemoryDifficulty] = useState<number>(6); // Number of pairs
  const [isMemorySetup, setIsMemorySetup] = useState(false); // If true, game is running
  
  // Memory Stats
  const [memoryTime, setMemoryTime] = useState(0);
  const [memoryErrors, setMemoryErrors] = useState(0);
  const [isMemoryTimerActive, setIsMemoryTimerActive] = useState(false);

  // Refs & Hooks
  const { speak, voices, selectedVoice, setSelectedVoice } = useSpeech();
  const confettiRef = useRef<ConfettiHandle>(null);
  const flashcardIntervalRef = useRef<any>(null);
  const memoryTimerRef = useRef<any>(null);
  const memoryPreviewTimeoutRef = useRef<any>(null);

  // --- Preload Images Logic ---
  useEffect(() => {
    const preloadImages = async () => {
      try {
        const promises = ANIMAL_URLS.map((src) => {
          return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = src;
            // We resolve on load AND error so the app doesn't get stuck if one image fails
            img.onload = resolve;
            img.onerror = resolve; 
          });
        });

        await Promise.all(promises);
      } catch (error) {
        console.error("Error preloading images", error);
      } finally {
        // Add a small delay for smooth transition even if internet is super fast
        setTimeout(() => {
            setIsLoadingAssets(false);
        }, 500);
      }
    };

    preloadImages();
  }, []);

  // --- Reset display style when content type changes ---
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
        return {
          id: `num-${num}`,
          text: numStr,
          spokenText: numStr, 
          color: COLORS[i % COLORS.length]
        };
      });
    } 
    else if (contentType === ContentType.ANIMALS) {
        // Randomly shuffle and pick 15 animals (was 20) for Explore mode
        const shuffled = [...ANIMAL_URLS].sort(() => Math.random() - 0.5);
        
        // CHANGED: Slice to 15 items for Explore mode
        const selection = shuffled.slice(0, 15);

        newItems = selection.map((url, i) => {
            // Extract name from URL (e.g., .../ARANHA.png -> ARANHA)
            const filename = url.split('/').pop()?.split('.')[0] || '';
            const name = decodeURIComponent(filename).replace(/[_-]/g, ' ');
            // Capitalize first letter
            const formattedName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
            
            return {
                id: `animal-${i}`,
                text: formattedName,
                spokenText: formattedName,
                color: '#E6DBBF', // Solid beige color requested
                image: url
            };
        });
    }
    else {
      // Logic for Alphabet and Vowels
      let data: string[] = [];
      if (contentType === ContentType.VOWELS) data = ['A', 'E', 'I', 'O', 'U'];
      else if (contentType === ContentType.ALPHABET) data = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');

      newItems = data.map((char, i) => {
        const finalChar = isAlt ? char.toLowerCase() : char;
        return {
          id: `${contentType}-${i}`,
          text: finalChar,
          spokenText: char, 
          color: COLORS[i % COLORS.length]
        };
      });
    }
    
    setItems(newItems);
  }, [contentType, displayStyle]);

  // --- Game Mode Reset ---
  useEffect(() => {
    // Cleanup
    if (flashcardIntervalRef.current) clearInterval(flashcardIntervalRef.current);
    if (memoryTimerRef.current) clearInterval(memoryTimerRef.current);
    if (memoryPreviewTimeoutRef.current) clearTimeout(memoryPreviewTimeoutRef.current);
    
    setFeedback(null);
    setBlockInput(false);
    setActiveItemId(null); // Reset visual state
    setQuizTarget(null);
    setIsMemorySetup(false); // Reset memory game
    setQuizSessionStats({ correct: 0, wrong: 0 }); // Reset live session stats
    setIsMemoryTimerActive(false);

    // Initialize logic
    if (gameMode === GameMode.QUIZ) {
      startQuizRound(items);
    } else if (gameMode === GameMode.FLASHCARD) {
      startFlashcard(items);
    }

  }, [gameMode, items, view]); // Added view to dependencies to reset when switching back

  // --- Memory Timer Logic ---
  useEffect(() => {
    if (isMemoryTimerActive) {
        memoryTimerRef.current = setInterval(() => {
            setMemoryTime(prev => prev + 1);
        }, 1000);
    } else {
        clearInterval(memoryTimerRef.current);
    }
    return () => clearInterval(memoryTimerRef.current);
  }, [isMemoryTimerActive]);

  // --- Helper: Save Quiz Stats ---
  const saveQuizStats = (isCorrect: boolean) => {
    setQuizSessionStats(prev => ({
        correct: prev.correct + (isCorrect ? 1 : 0),
        wrong: prev.wrong + (isCorrect ? 0 : 1)
    }));

    const saved = localStorage.getItem(STORAGE_KEY_QUIZ);
    let history: QuizHistory = saved ? JSON.parse(saved) : {};
    
    if (!history[contentType]) history[contentType] = { correct: 0, wrong: 0 };
    
    if (isCorrect) history[contentType].correct++;
    else history[contentType].wrong++;
    
    localStorage.setItem(STORAGE_KEY_QUIZ, JSON.stringify(history));
  };

  // --- Helper: Save Memory Result ---
  const saveMemoryResult = () => {
    const result: MemoryResult = {
        id: Date.now().toString(),
        date: Date.now(),
        difficulty: memoryDifficulty,
        timeSeconds: memoryTime,
        errors: memoryErrors
    };
    
    const saved = localStorage.getItem(STORAGE_KEY_MEMORY);
    const results: MemoryResult[] = saved ? JSON.parse(saved) : [];
    results.push(result);
    localStorage.setItem(STORAGE_KEY_MEMORY, JSON.stringify(results));
  };

  // --- Logic Implementations ---

  const getPhonetic = (text: string) => PRONUNCIATION_MAP[text.toUpperCase()] || text;
  const getSpeakableText = (item: GameItem) => item.spokenText || item.text;
  
  // Helper to determine gender-aware article (o/a)
  const getArticle = (text: string) => {
      // Look up in gender map, default to 'o'
      return ANIMAL_GENDER_MAP[text.toUpperCase()] || 'o';
  };

  // --- Memory Game Logic ---
  const startMemoryGame = (pairCount: number) => {
    // Clear any existing preview timeout
    if (memoryPreviewTimeoutRef.current) clearTimeout(memoryPreviewTimeoutRef.current);

    let sourceItems = items;
    if (contentType === ContentType.ANIMALS) {
        sourceItems = ANIMAL_URLS.map((url, i) => {
            const filename = url.split('/').pop()?.split('.')[0] || '';
            const name = decodeURIComponent(filename).replace(/[_-]/g, ' ');
            const formattedName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
            return {
                id: `animal-full-${i}`,
                text: formattedName,
                spokenText: formattedName,
                color: '#E6DBBF',
                image: url
            };
        });
    }

    if (sourceItems.length === 0) return;

    setBlockInput(true);
    setMemoryDifficulty(pairCount);
    
    // Select random items
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
    
    // Reset Stats for new game
    setMemoryTime(0);
    setMemoryErrors(0);
    setIsMemoryTimerActive(false); // Do NOT start timer yet

    // Preview Duration Calculation: 500ms per pair
    const previewDuration = pairCount * 500;

    // Preview logic
    speak("Memorize as cartas!");
    
    memoryPreviewTimeoutRef.current = setTimeout(() => {
        setMemoryCards(prev => prev.map(c => ({ ...c, isFlipped: false })));
        setBlockInput(false);
        speak("Valendo!");
        setIsMemoryTimerActive(true); // Start Timer ONLY after cards flip back
    }, previewDuration);
  };

  const handleMemoryCardClick = (cardId: string) => {
    if (blockInput) return;
    
    const cardIndex = memoryCards.findIndex(c => c.id === cardId);
    if (cardIndex === -1 || memoryCards[cardIndex].isFlipped || memoryCards[cardIndex].isMatched) return;

    // Flip
    const newCards = [...memoryCards];
    newCards[cardIndex].isFlipped = true;
    setMemoryCards(newCards);

    speak(getSpeakableText(newCards[cardIndex].item));

    const flippedCards = newCards.filter(c => c.isFlipped && !c.isMatched);
    
    if (flippedCards.length === 2) {
        setBlockInput(true);
        const [c1, c2] = flippedCards;
        
        if (c1.pairId === c2.pairId) {
            // Match
            setTimeout(() => {
                setMemoryCards(prev => prev.map(c => 
                    (c.id === c1.id || c.id === c2.id) ? { ...c, isMatched: true } : c
                ));
                if (confettiRef.current) confettiRef.current.explode(window.innerWidth / 2, window.innerHeight / 2);
                speak("Muito bem!");
                setBlockInput(false);

                // Check Win
                const allMatched = newCards.every(c => c.isMatched || (c.id === c1.id || c.id === c2.id));
                if (allMatched) {
                    setIsMemoryTimerActive(false); // Stop Timer
                    saveMemoryResult(); // Save Stats
                    setTimeout(() => speak("Você venceu!"), 1000);
                }

            }, 800);
        } else {
            // Mismatch
            // Increment Errors
            setMemoryErrors(prev => prev + 1);

            setTimeout(() => {
                setMemoryCards(prev => prev.map(c => 
                    (c.id === c1.id || c.id === c2.id) ? { ...c, isFlipped: false } : c
                ));
                setBlockInput(false);
            }, 1500);
        }
    }
  };


  // --- Quiz Logic ---
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
      const article = getArticle(target.text);
      speak(`Cadê ${article} ${getPhonetic(speakable)}?`, () => {
        setBlockInput(false);
      });
    }, 500);
  };

  const startFlashcard = (currentItems: GameItem[]) => {
    if (currentItems.length === 0) return;
    setFlashcardIndex(0);
    speak(getSpeakableText(currentItems[0]));

    flashcardIntervalRef.current = setInterval(() => {
      setFlashcardIndex(prev => {
        let next = prev + 1;
        const rand = Math.floor(Math.random() * currentItems.length);
        next = rand === prev ? (rand + 1) % currentItems.length : rand;
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
        saveQuizStats(true); // Save Correct
        setBlockInput(true);
        if (confettiRef.current) confettiRef.current.explode(x, y);
        speak("Parabéns!", () => {
          setTimeout(() => startQuizRound(items), 1000);
        });
      } else {
        setFeedback('wrong');
        saveQuizStats(false); // Save Wrong
        setBlockInput(true);
        const wrongSpeakable = getSpeakableText(item);
        const targetSpeakable = quizTarget ? getSpeakableText(quizTarget) : '';
        const wrongArticle = getArticle(item.text);
        const targetArticle = quizTarget ? getArticle(quizTarget.text) : 'o';

        speak(`Não! Esse é ${wrongArticle} ${getPhonetic(wrongSpeakable)}.`, () => {
            setFeedback(null);
            setTimeout(() => {
                if (quizTarget) {
                  speak(`Tente de novo. Cadê ${targetArticle} ${getPhonetic(targetSpeakable)}?`, () => {
                      setBlockInput(false);
                  });
                } else {
                  setBlockInput(false);
                }
            }, 500);
        });
      }
    }
    else if (gameMode === GameMode.FLASHCARD) {
        if (flashcardIntervalRef.current) {
            clearInterval(flashcardIntervalRef.current);
            startFlashcard(items); 
        }
    }
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const getTitle = () => {
    if (view === 'DASHBOARD') return "Dashboard";
    if (gameMode === GameMode.MEMORY) return "Jogo da Memória";
    if (gameMode === GameMode.QUIZ && quizTarget) {
        return `Encontre: ${quizTarget.text}`;
    }
    if (gameMode === GameMode.FLASHCARD) return "Observe";
    return "Toque para Aprender";
  };

  const shouldShowDots = displayStyle === 'alternate' && contentType === ContentType.NUMBERS;

  // --- Grid Layout Logic ---
  const getGridClass = () => {
    if (contentType === ContentType.ANIMALS) {
        // CHANGED: 3x5 (mobile) or 5x3 (desktop) for 15 items
        return 'grid-cols-3 grid-rows-5 md:grid-cols-5 md:grid-rows-3 gap-2 md:gap-3 p-2 h-full';
    }
    if (contentType === ContentType.ALPHABET) {
        // CHANGED: Added h-full and explicit rows to prevent button collapse
        return 'grid-cols-4 grid-rows-7 md:grid-cols-7 md:grid-rows-4 gap-2 md:gap-3 p-2 h-full';
    }
    if (contentType === ContentType.NUMBERS) {
        // CHANGED: Enforce 5 rows on mobile to fit screen without scroll
        return 'grid-cols-2 grid-rows-5 md:grid-cols-5 md:grid-rows-2 gap-3 p-4 h-full';
    }
    // Fallback (Vowels)
    // CHANGED: Added h-full and explicit rows
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

  // Helper to format time MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // --- Render Loading Screen ---
  if (isLoadingAssets) {
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
            <div className="animate-bounce mb-8">
                <Logo className="w-64 h-auto" />
            </div>
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="animate-spin text-blue-500" size={48} />
                <p className="text-xl font-bold text-slate-500 animate-pulse">
                    Preparando a diversão...
                </p>
            </div>
        </div>
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col text-slate-700 bg-transparent">
      <Confetti ref={confettiRef} />

      {/* --- Sidebar --- */}
      <div 
        className={`
          fixed inset-y-4 left-4 z-50 w-72 
          bg-white/90 backdrop-blur-xl shadow-2xl rounded-3xl border border-white/50
          transform transition-transform duration-300 ease-in-out
          flex flex-col
          md:absolute md:translate-x-0 md:h-auto md:m-0 md:rounded-3xl md:top-4 md:left-4 md:bottom-4
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-[120%]'}
        `}
      >
        <div className="p-6 border-b border-slate-100/50 flex justify-between items-center h-24 shrink-0">
          <div className="flex items-center justify-start w-full">
            <Logo className="h-14 w-auto" />
          </div>
          <button onClick={toggleSidebar} className="md:hidden p-2 bg-slate-100 rounded-full text-slate-500">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-8">
          
          {/* Dashboard Button */}
          <div className="mb-4">
              <SidebarBtn 
                active={view === 'DASHBOARD'}
                onClick={() => { setView('DASHBOARD'); if(window.innerWidth<768) setIsSidebarOpen(false); }}
                icon={<LayoutDashboard size={20} />}
                label="Dashboard"
                colorClass="bg-slate-600 shadow-slate-300"
              />
          </div>

          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">Aprender</h3>
            <div className="space-y-3">
              <SidebarBtn 
                active={view === 'GAME' && contentType === ContentType.NUMBERS} 
                onClick={() => { setView('GAME'); if(gameMode !== GameMode.MEMORY) setContentType(ContentType.NUMBERS); if(window.innerWidth<768) setIsSidebarOpen(false); }}
                icon={<Hash size={20} />}
                label="123 Números"
                colorClass="bg-blue-400 shadow-blue-200"
                disabled={gameMode === GameMode.MEMORY}
              />
              <SidebarBtn 
                active={view === 'GAME' && contentType === ContentType.ALPHABET} 
                onClick={() => { setView('GAME'); if(gameMode !== GameMode.MEMORY) setContentType(ContentType.ALPHABET); if(window.innerWidth<768) setIsSidebarOpen(false); }}
                icon={<Type size={20} />}
                label="ABC Alfabeto"
                colorClass="bg-green-400 shadow-green-200"
                disabled={gameMode === GameMode.MEMORY}
              />
              <SidebarBtn 
                active={view === 'GAME' && contentType === ContentType.VOWELS} 
                onClick={() => { setView('GAME'); if(gameMode !== GameMode.MEMORY) setContentType(ContentType.VOWELS); if(window.innerWidth<768) setIsSidebarOpen(false); }}
                icon={<Volume2 size={20} />}
                label="AEIOU Vogais"
                colorClass="bg-purple-400 shadow-purple-200"
                disabled={gameMode === GameMode.MEMORY}
              />
              <SidebarBtn 
                active={view === 'GAME' && contentType === ContentType.ANIMALS} 
                onClick={() => { setView('GAME'); setContentType(ContentType.ANIMALS); if(window.innerWidth<768) setIsSidebarOpen(false); }}
                icon={<Cat size={20} />}
                label="Animais"
                colorClass="bg-yellow-400 shadow-yellow-200"
              />
            </div>
          </div>

          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">Modo de Jogo</h3>
            <div className="space-y-3">
              <SidebarBtn 
                active={view === 'GAME' && gameMode === GameMode.EXPLORE} 
                onClick={() => { setView('GAME'); setGameMode(GameMode.EXPLORE); if(window.innerWidth<768) setIsSidebarOpen(false); }}
                icon={<Eye size={20} />}
                label="Explorar"
                colorClass="bg-orange-400 shadow-orange-200"
              />
              <SidebarBtn 
                active={view === 'GAME' && gameMode === GameMode.FLASHCARD} 
                onClick={() => { setView('GAME'); setGameMode(GameMode.FLASHCARD); if(window.innerWidth<768) setIsSidebarOpen(false); }}
                icon={<Play size={20} />}
                label="Flashcards"
                colorClass="bg-pink-400 shadow-pink-200"
              />
              <SidebarBtn 
                active={view === 'GAME' && gameMode === GameMode.QUIZ} 
                onClick={() => { setView('GAME'); setGameMode(GameMode.QUIZ); if(window.innerWidth<768) setIsSidebarOpen(false); }}
                icon={<HelpCircle size={20} />}
                label="Quiz"
                colorClass="bg-teal-400 shadow-teal-200"
              />
              <SidebarBtn 
                active={view === 'GAME' && gameMode === GameMode.MEMORY} 
                onClick={() => { 
                    setView('GAME');
                    setGameMode(GameMode.MEMORY); 
                    setContentType(ContentType.ANIMALS); // Force Animals
                    if(window.innerWidth<768) setIsSidebarOpen(false); 
                }}
                icon={<Grid size={20} />}
                label="Memória"
                colorClass="bg-indigo-400 shadow-indigo-200"
              />
            </div>
          </div>

          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 ml-2 flex items-center gap-2">
               <Mic size={14} /> Voz
            </h3>
            <select 
              className="w-full p-3 rounded-xl border-2 border-slate-100 bg-slate-50 text-sm font-semibold text-slate-600 focus:outline-none focus:border-blue-300 transition-colors"
              onChange={(e) => setSelectedVoice(voices[parseInt(e.target.value)])}
              value={voices.indexOf(selectedVoice as SpeechSynthesisVoice)}
            >
              {voices.length === 0 && <option>Padrão</option>}
              {voices.map((v, i) => (
                <option key={i} value={i}>{v.name.replace(/(Microsoft|Google) /, '').slice(0, 20)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden" onClick={toggleSidebar} />
      )}

      {/* --- Main Area --- */}
      <main className="flex-1 flex flex-col relative h-full md:pl-[300px]">
        
        {/* Header */}
        <header className="h-14 md:h-16 shrink-0 flex items-center justify-between px-4 z-20">
          <button 
            onClick={toggleSidebar}
            className="p-3 rounded-2xl bg-white shadow-lg shadow-slate-200/50 text-slate-600 md:hidden active:scale-95 transition-transform"
          >
            <Menu size={20} />
          </button>
          
          <div className="flex-1 flex justify-center items-center gap-4">
             {/* Live Counters for Quiz */}
             {view === 'GAME' && gameMode === GameMode.QUIZ && (
                <div className="hidden md:flex items-center gap-4 bg-white/60 px-4 py-1 rounded-full border border-white/50 backdrop-blur-sm mr-4">
                    <div className="flex items-center gap-1 text-green-600 font-bold">
                        <Trophy size={16} /> {quizSessionStats.correct}
                    </div>
                    <div className="flex items-center gap-1 text-red-500 font-bold">
                        <AlertCircle size={16} /> {quizSessionStats.wrong}
                    </div>
                </div>
             )}

            <h1 className="text-xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 drop-shadow-sm truncate px-4 py-2">
              {getTitle()}
            </h1>

            {/* Live Counters for Memory */}
            {view === 'GAME' && gameMode === GameMode.MEMORY && isMemorySetup && (
                <div className="hidden md:flex items-center gap-4 bg-white/60 px-4 py-1 rounded-full border border-white/50 backdrop-blur-sm ml-4">
                    <div className="flex items-center gap-1 text-slate-600 font-bold font-mono">
                        <Clock size={16} /> {formatTime(memoryTime)}
                    </div>
                    <div className="flex items-center gap-1 text-red-500 font-bold">
                        <AlertCircle size={16} /> {memoryErrors}
                    </div>
                </div>
             )}
          </div>
          
          <div className="w-12 md:hidden"></div>
        </header>

        {/* --- TOGGLE CONTROLS (Hidden for Animals/Memory/Dashboard) --- */}
        {view === 'GAME' && gameMode !== GameMode.MEMORY && contentType !== ContentType.ANIMALS && (
            <div className="w-full flex justify-center z-20 mb-1 shrink-0">
                <div className="bg-white/60 backdrop-blur-md p-1.5 rounded-full shadow-sm flex gap-2 border border-white/50">
                    {contentType === ContentType.NUMBERS ? (
                        <>
                            <ToggleOption 
                                active={displayStyle === 'standard'} 
                                onClick={() => setDisplayStyle('standard')}
                                icon={<span>123</span>}
                            />
                            <ToggleOption 
                                active={displayStyle === 'alternate'} 
                                onClick={() => setDisplayStyle('alternate')}
                                icon={<div className="grid grid-cols-2 gap-0.5"><div className="w-1 h-1 rounded-full bg-current"/><div className="w-1 h-1 rounded-full bg-current"/><div className="w-1 h-1 rounded-full bg-current"/><div className="w-1 h-1 rounded-full bg-current"/></div>}
                            />
                        </>
                    ) : (
                        <>
                            <ToggleOption 
                                active={displayStyle === 'standard'} 
                                onClick={() => setDisplayStyle('standard')}
                                icon={<CaseUpper size={20} />}
                            />
                            <ToggleOption 
                                active={displayStyle === 'alternate'} 
                                onClick={() => setDisplayStyle('alternate')}
                                icon={<CaseLower size={20} />}
                            />
                        </>
                    )}
                </div>
            </div>
        )}

        {/* --- MAIN CONTENT AREA --- */}
        <div className="flex-1 overflow-hidden relative p-2 md:p-4 flex flex-col items-center justify-center min-h-0">
            
            {/* --- DASHBOARD VIEW --- */}
            {view === 'DASHBOARD' && <Dashboard />}

            {/* --- GAME VIEW --- */}
            {view === 'GAME' && (
                <>
                    {feedback && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/20 backdrop-blur-sm animate-in fade-in duration-200">
                            <div className="text-9xl animate-bounce filter drop-shadow-2xl">
                                {feedback === 'correct' ? '🌟' : '🤔'}
                            </div>
                        </div>
                    )}

                    {/* Mobile Counters (Visible only on small screens) */}
                     {gameMode === GameMode.QUIZ && (
                        <div className="md:hidden w-full flex justify-center gap-6 mb-2">
                             <div className="flex items-center gap-1 text-green-600 font-bold bg-white/50 px-3 py-1 rounded-full">
                                <Trophy size={14} /> {quizSessionStats.correct}
                            </div>
                            <div className="flex items-center gap-1 text-red-500 font-bold bg-white/50 px-3 py-1 rounded-full">
                                <AlertCircle size={14} /> {quizSessionStats.wrong}
                            </div>
                        </div>
                    )}
                    {gameMode === GameMode.MEMORY && isMemorySetup && (
                        <div className="md:hidden w-full flex justify-center gap-6 mb-2">
                             <div className="flex items-center gap-1 text-slate-600 font-bold bg-white/50 px-3 py-1 rounded-full font-mono">
                                <Clock size={14} /> {formatTime(memoryTime)}
                            </div>
                            <div className="flex items-center gap-1 text-red-500 font-bold bg-white/50 px-3 py-1 rounded-full">
                                <AlertCircle size={14} /> {memoryErrors}
                            </div>
                        </div>
                    )}


                    {/* Grid - Explore Mode */}
                    {gameMode === GameMode.EXPLORE && (
                        <div className={`
                            w-full h-full 
                            grid content-center justify-center justify-items-center overflow-y-auto custom-scrollbar
                            ${getGridClass()}
                        `}>
                            {items.map((item) => (
                                <div key={item.id} className="w-full h-full flex items-center justify-center relative group min-w-0 min-h-0"> 
                                    {/* Wrapper to control sizing and prevent overlap for Animals */}
                                    {contentType === ContentType.ANIMALS ? (
                                        <div className="aspect-square h-[95%] w-auto max-w-full flex items-center justify-center relative shadow-sm rounded-2xl">
                                            <GameButton 
                                                text="" // Empty text to remove labels in Explore mode for animals
                                                color={item.color}
                                                active={activeItemId === item.id}
                                                isWhiteVariant={false}
                                                showDots={false}
                                                onClick={(e) => handleItemClick(item, e)}
                                                isFlat={true}
                                                className="w-full h-full !aspect-auto"
                                            />
                                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-[15%]">
                                                <img src={item.image} alt={item.text} className="w-full h-full object-contain drop-shadow-sm" />
                                            </div>
                                        </div>
                                    ) : (
                                        // Standard rendering for other types
                                        // CHANGED: Removed max-w-[25vh] to allow flexibility in the new grid
                                        <div className="w-full h-full flex items-center justify-center min-h-0 min-w-0">
                                            <GameButton 
                                                text={item.text}
                                                color={item.color}
                                                active={activeItemId === item.id}
                                                isWhiteVariant={activeItemId !== item.id}
                                                showDots={shouldShowDots}
                                                onClick={(e) => handleItemClick(item, e)}
                                                // Override default GameButton sizing to fit the grid cell exactly
                                                // Using h-[85%] ensures it fits vertically with gaps
                                                // w-auto + aspect-square calculates width based on height
                                                // max-w-full prevents overflow if cell is very wide
                                                className="h-[85%] w-auto max-w-full aspect-square shadow-sm"
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Flashcard */}
                    {gameMode === GameMode.FLASHCARD && items.length > 0 && (
                        <div className="w-full h-full flex items-center justify-center p-4">
                            <div className="w-[min(65vh,80vw)] aspect-square animate-fade-in relative group">
                                <GameButton 
                                    text={contentType === ContentType.ANIMALS ? '' : items[flashcardIndex].text}
                                    color={items[flashcardIndex].color}
                                    size="large"
                                    showDots={shouldShowDots}
                                    onClick={(e) => handleItemClick(items[flashcardIndex], e)}
                                    // Match Quiz style: Flat for animals (Beige Card), 3D for others
                                    isFlat={contentType === ContentType.ANIMALS}
                                    className="w-full h-full"
                                />
                                {contentType === ContentType.ANIMALS && (
                                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6 pb-8">
                                        <div className="flex-1 w-full flex items-center justify-center overflow-hidden mb-4">
                                            <img 
                                                src={items[flashcardIndex].image} 
                                                alt={items[flashcardIndex].text} 
                                                className="max-w-full max-h-full object-contain drop-shadow-sm" 
                                            />
                                        </div>
                                        <span className="text-3xl md:text-5xl font-black text-slate-700 drop-shadow-sm tracking-wide">
                                            {items[flashcardIndex].text}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Quiz */}
                    {gameMode === GameMode.QUIZ && (
                        <div className="w-full h-full flex items-center justify-center">
                            <div className="flex gap-4 md:gap-12 flex-wrap justify-center items-center w-full max-w-6xl">
                                {quizOptions.map((item) => (
                                    <div key={item.id} className="w-[28vw] md:w-[20vw] aspect-square max-w-[250px] relative">
                                        <GameButton 
                                            text={contentType === ContentType.ANIMALS ? '' : item.text}
                                            color={item.color}
                                            onClick={(e) => handleItemClick(item, e)}
                                            size="normal"
                                            showDots={shouldShowDots}
                                            isFlat={contentType === ContentType.ANIMALS}
                                        />
                                        {contentType === ContentType.ANIMALS && (
                                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                                <img src={item.image} alt={item.text} className="w-[70%] h-[70%] object-contain" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Memory Game */}
                    {gameMode === GameMode.MEMORY && (
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
                                <div className="w-full h-full flex flex-col items-center">
                                    <div className="mb-2 flex gap-4 shrink-0">
                                        <button onClick={() => { setIsMemorySetup(false); setIsMemoryTimerActive(false); }} className="px-4 py-1 bg-slate-200 text-slate-600 rounded-full text-sm font-bold">Reiniciar</button>
                                    </div>
                                    <div className={`
                                        grid gap-1 md:gap-3 w-full h-full justify-items-center
                                        p-1 overflow-hidden
                                        ${getMemoryGridClass(memoryCards.length / 2)}
                                    `}>
                                        {memoryCards.map((card) => (
                                            <div key={card.id} className="w-full h-full flex items-center justify-center min-h-0 min-w-0">
                                                <MemoryCard 
                                                    item={card.item}
                                                    isFlipped={card.isFlipped}
                                                    isMatched={card.isMatched}
                                                    onClick={() => handleMemoryCardClick(card.id)}
                                                />
                                            </div>
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

// Toggle Option Component
const ToggleOption: React.FC<{
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
}> = ({ active, onClick, icon }) => (
    <button
        onClick={onClick}
        className={`
            px-6 py-2 rounded-full font-bold text-sm transition-all duration-200 flex items-center justify-center
            ${active 
                ? 'bg-blue-500 text-white shadow-md scale-105' 
                : 'bg-transparent text-slate-500 hover:bg-slate-100'
            }
        `}
    >
        {icon}
    </button>
);

// Sidebar Button Component
const SidebarBtn: React.FC<{
  active: boolean; 
  onClick: () => void; 
  icon: React.ReactNode; 
  label: string;
  colorClass: string;
  disabled?: boolean;
}> = ({ active, onClick, icon, label, colorClass, disabled = false }) => (
  <button
    onClick={disabled ? undefined : onClick}
    disabled={disabled}
    className={`
      w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-sm font-bold transition-all duration-200
      ${disabled ? 'opacity-40 cursor-not-allowed bg-slate-50 text-slate-300' : ''}
      ${!disabled && active 
        ? `${colorClass} text-white shadow-lg scale-105` 
        : !disabled ? 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 hover:scale-102' : ''
      }
    `}
  >
    <div className={`${!disabled && active ? 'text-white' : disabled ? 'text-slate-300' : 'text-slate-400'}`}>
        {disabled ? <Lock size={20} /> : icon}
    </div>
    <span className="tracking-wide">{label}</span>
  </button>
);

export default App;