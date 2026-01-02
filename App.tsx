
import React, { useState, useEffect, useRef } from 'react';
import { ContentType, GameMode, GameItem, PRONUNCIATION_MAP, UserProfile } from './types';
import { useSpeech } from './hooks/useSpeech';
import { useGameData } from './hooks/useGameData';
import { useQuizGame } from './hooks/useQuizGame';
import { useFlashcardGame } from './hooks/useFlashcardGame';
import { useAnalytics } from './hooks/useAnalytics'; // Analytics Import
import Confetti, { ConfettiHandle } from './components/Confetti';
import { GameButton } from './components/GameButton';
import { Logo } from './components/Logo';
import { Dashboard } from './components/Dashboard';
import { AuthScreen } from './components/AuthScreen';
import { TracingGame } from './components/TracingGame';
import { MemoryGame } from './components/MemoryGame';
import { useAuth } from './context/AuthContext';
import { HomeCard } from './components/HomeCard';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { LayoutWrapper } from './components/LayoutWrapper';
import { db } from './firebase';
import { doc, setDoc } from 'firebase/firestore';
import { LayoutDashboard, Loader2, Settings, LogOut, CheckCircle2, ArrowRight, Mic, PawPrint } from 'lucide-react';

type ViewState = 'HOME' | 'GAME' | 'DASHBOARD' | 'SETTINGS';

const App: React.FC = () => {
  // --- Auth & Profile ---
  const { user, userProfile, loading: authLoading, setUserProfile, signOut } = useAuth();
  const [profileCompletionData, setProfileCompletionData] = useState({ name: '', age: '' });
  const [isCompletingProfile, setIsCompletingProfile] = useState(false);

  // --- UI State ---
  const [view, setView] = useState<ViewState>('HOME'); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [shake, setShake] = useState(false); // New state for visual feedback
  
  // --- Game Config ---
  const [contentType, setContentType] = useState<ContentType>(ContentType.NUMBERS);
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.EXPLORE);
  const [displayStyle, setDisplayStyle] = useState<'standard' | 'alternate'>('standard');
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  
  // --- Hooks ---
  const { items, dbAnimals, isLoading: isLoadingAssets } = useGameData(contentType, displayStyle);
  const { speak, voices, selectedVoice, setSelectedVoice } = useSpeech();
  const { trackScreen, trackSelectContent, logGameEvent } = useAnalytics(); // Analytics Hook
  
  // --- Helpers ---
  const getPhonetic = (text: string) => PRONUNCIATION_MAP[text.toUpperCase()] || text;
  const getSpeakableText = (item: GameItem) => item.spokenText || item.text;
  const getArticle = (item: GameItem) => item.gender === 'f' ? 'a' : 'o';

  // --- Game Logic ---
  const quiz = useQuizGame(items, contentType, user, speak, getSpeakableText, getPhonetic, getArticle);
  const flashcard = useFlashcardGame(items, gameMode === GameMode.FLASHCARD, speak, getSpeakableText);
  
  // --- Local State ---
  const [tracingIndex, setTracingIndex] = useState(0);
  const [isChildLocked, setIsChildLocked] = useState(false);
  const lockTapCount = useRef(0);
  const lockResetTimer = useRef<any>(null);
  const confettiRef = useRef<ConfettiHandle>(null);

  // --- Effects ---
  useEffect(() => {
    setIsCompletingProfile(!!(user && !authLoading && !userProfile));
  }, [user, userProfile, authLoading]);

  // Analytics: Track Screens
  useEffect(() => {
      let screenName: string = view;
      if (view === 'GAME') screenName = `GAME_${contentType}_${gameMode}`;
      trackScreen(screenName);
  }, [view, contentType, gameMode]);

  // Reset Display Style only when content type changes
  useEffect(() => {
    setDisplayStyle('standard');
  }, [contentType]);

  useEffect(() => {
      // Logic Reset
      if (contentType === ContentType.ANIMALS && gameMode === GameMode.TRACING) setGameMode(GameMode.EXPLORE);
      if (contentType !== ContentType.ANIMALS && gameMode === GameMode.MEMORY) setGameMode(GameMode.EXPLORE);
      
      setActiveItemId(null);
      setTracingIndex(0);
      setIsChildLocked(false);
      
      if (gameMode === GameMode.QUIZ) quiz.startRound();
      else quiz.reset();
  }, [contentType, gameMode, items]);

  // Trigger Shake on Quiz Wrong Answer
  useEffect(() => {
    if (quiz.feedback === 'wrong') {
        setShake(true);
        const t = setTimeout(() => setShake(false), 500);
        return () => clearTimeout(t);
    }
  }, [quiz.feedback]);

  // --- Handlers ---
  const handleLogout = async () => { 
      logGameEvent('logout');
      await signOut(); 
      setView('HOME'); 
  };

  const handleCompleteProfile = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user || !profileCompletionData.name || !profileCompletionData.age) return;
      try {
          const profile: UserProfile = {
              uid: user.uid, childName: profileCompletionData.name, age: profileCompletionData.age, parentEmail: user.email || '', createdAt: Date.now()
          };
          await setDoc(doc(db, "users", user.uid), profile);
          setUserProfile(profile);
          logGameEvent('tutorial_complete', { method: 'profile_setup' });
      } catch (err) { console.error(err); }
  };

  const handleLockInteraction = () => {
    if (!isChildLocked) { setIsChildLocked(true); speak("Tela bloqueada"); return; }
    lockTapCount.current += 1;
    if (lockResetTimer.current) clearTimeout(lockResetTimer.current);
    if (lockTapCount.current === 1) speak("Toque três vezes");
    lockResetTimer.current = setTimeout(() => { lockTapCount.current = 0; }, 1000); 
    if (lockTapCount.current >= 3) { setIsChildLocked(false); lockTapCount.current = 0; speak("Desbloqueada"); }
  };

  const handleItemClick = (item: GameItem, e: React.MouseEvent | React.TouchEvent) => {
    if (isChildLocked) return;
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    if (gameMode === GameMode.EXPLORE) {
      setActiveItemId(item.id);
      if (confettiRef.current) confettiRef.current.explode(x, y);
      speak(getSpeakableText(item));
      trackSelectContent(contentType, item.text); // Analytics
    } 
    else if (gameMode === GameMode.QUIZ) {
      quiz.handleAnswer(item, () => { if (confettiRef.current) confettiRef.current.explode(x, y); });
    }
  };

  const handleTracingComplete = () => {
    if (confettiRef.current) confettiRef.current.explode(window.innerWidth / 2, window.innerHeight / 2);
    speak("Muito bem!");
    setTimeout(() => {
        setTracingIndex(prev => (prev + 1) % items.length);
    }, 1500);
  };

  // --- View Logic ---
  const selectContentType = (type: ContentType) => { 
      setContentType(type); 
      setGameMode(GameMode.EXPLORE); 
      setView('GAME'); 
  };

  const getTitle = () => {
    if (view === 'DASHBOARD') return "Dashboard";
    if (view === 'SETTINGS') return "Configurações";
    if (gameMode === GameMode.MEMORY) return "Jogo da Memória";
    if (gameMode === GameMode.TRACING) return "Vamos Desenhar!";
    if (gameMode === GameMode.QUIZ && quiz.target) return `Encontre: ${quiz.target.text}`;
    if (gameMode === GameMode.FLASHCARD) return "Observe";
    return "Toque para Aprender";
  };

  const getGridClass = () => {
    if (contentType === ContentType.ANIMALS) return 'grid-cols-3 grid-rows-5 md:grid-cols-5 md:grid-rows-3 gap-2 md:gap-3 p-2 h-full';
    if (contentType === ContentType.ALPHABET) return 'grid-cols-4 grid-rows-7 md:grid-cols-7 md:grid-rows-4 gap-2 md:gap-3 p-2 h-full';
    if (contentType === ContentType.NUMBERS) return 'grid-cols-2 grid-rows-5 md:grid-cols-5 md:grid-rows-2 gap-3 p-4 h-full';
    return 'grid-cols-2 grid-rows-3 md:grid-cols-5 md:grid-rows-1 gap-4 md:gap-8 p-8 h-full';
  };
  
  const showToggle = view === 'GAME' && contentType !== ContentType.ANIMALS && gameMode !== GameMode.MEMORY && !(gameMode === GameMode.TRACING && contentType === ContentType.NUMBERS);

  // --- Render ---
  if (authLoading || isLoadingAssets) return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
            <div className="animate-bounce mb-8"><Logo className="w-64 h-auto" /></div>
            <div className="flex flex-col items-center gap-4"><Loader2 className="animate-spin text-blue-500" size={48} /></div>
        </div>
  );

  if (!user) return <AuthScreen onLoginSuccess={() => {}} />;

  if (isCompletingProfile) return (
      <LayoutWrapper className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl p-8 md:p-12 w-full max-w-md">
              <h2 className="text-3xl font-black text-slate-700 mb-2 text-center">Quase lá!</h2>
              <form onSubmit={handleCompleteProfile} className="space-y-4 mt-6">
                <input type="text" required placeholder="Nome da Criança" className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-600" value={profileCompletionData.name} onChange={e => setProfileCompletionData(p => ({...p, name: e.target.value}))} />
                <input type="number" required placeholder="Idade" className="w-full px-5 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-600" value={profileCompletionData.age} onChange={e => setProfileCompletionData(p => ({...p, age: e.target.value}))} />
                <button type="submit" className="w-full py-4 bg-green-500 text-white rounded-2xl font-black text-lg shadow-lg hover:scale-[1.02] active:scale-95 transition-all mt-4"><CheckCircle2 className="inline mr-2"/> Concluir</button>
              </form>
          </div>
      </LayoutWrapper>
  );

  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col text-slate-700 bg-transparent pb-safe">
      <Confetti ref={confettiRef} />
      
      {view === 'GAME' && <Sidebar isOpen={isSidebarOpen} toggle={() => setIsSidebarOpen(!isSidebarOpen)} contentType={contentType} gameMode={gameMode} setGameMode={setGameMode} />}
      
      <main className={`flex-1 flex flex-col relative h-full transition-all duration-300 ${view === 'GAME' ? 'md:pl-[300px]' : 'pl-0'}`}>
        <Header view={view} title={getTitle()} goHome={() => { setView('HOME'); setIsSidebarOpen(false); }} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} isChildLocked={isChildLocked} handleLockInteraction={handleLockInteraction} showToggle={showToggle} contentType={contentType} displayStyle={displayStyle} setDisplayStyle={setDisplayStyle} />

        <div className={`flex-1 overflow-hidden relative p-2 md:p-4 flex flex-col items-center justify-center min-h-0 ${shake ? 'animate-shake' : ''}`}>
            
            {/* Mobile Quiz Title */}
            {view === 'GAME' && gameMode === GameMode.QUIZ && quiz.target && (
                <div className="w-full text-center py-2 md:hidden animate-in fade-in slide-in-from-top-2 shrink-0"><span className="text-xl font-black text-slate-700 drop-shadow-sm">{getTitle()}</span></div>
            )}

            {view === 'HOME' && (
                <LayoutWrapper keyId="home" className="pt-safe">
                    <div className="flex justify-between items-center px-4 py-4 md:px-8">
                         <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-black border-2 border-white shadow-md">{userProfile?.childName.charAt(0).toUpperCase()}</div>
                             <div><p className="text-xs font-bold text-slate-400 uppercase">Olá,</p><p className="text-lg font-black text-slate-700 leading-none">{userProfile?.childName}</p></div>
                         </div>
                         <button onClick={() => setView('SETTINGS')} className="p-3 bg-white rounded-2xl shadow-md shadow-slate-200 text-slate-400 hover:text-blue-500 transition-colors"><Settings size={24} /></button>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center p-4 gap-6 md:gap-10 overflow-y-auto custom-scrollbar pb-20">
                        <div className="mb-2 animate-bounce"><Logo className="w-64 h-auto" /></div>
                        <div className="grid grid-cols-2 gap-4 w-full max-w-2xl">
                             <HomeCard title="Números" gradient="bg-gradient-to-br from-cyan-400 to-blue-500" shadowColor="shadow-blue-200" content={<span className="text-6xl font-black text-white drop-shadow-md">123</span>} onClick={() => selectContentType(ContentType.NUMBERS)} />
                             <HomeCard title="Alfabeto" gradient="bg-gradient-to-br from-lime-400 to-green-500" shadowColor="shadow-green-200" content={<span className="text-6xl font-black text-white drop-shadow-md">ABC</span>} onClick={() => selectContentType(ContentType.ALPHABET)} />
                             <HomeCard title="Vogais" gradient="bg-gradient-to-br from-fuchsia-400 to-purple-500" shadowColor="shadow-purple-200" content={<div className="flex flex-col items-center leading-none"><span className="text-4xl font-black text-white drop-shadow-md tracking-tighter">AEI</span><span className="text-4xl font-black text-white drop-shadow-md tracking-tighter">OU</span></div>} onClick={() => selectContentType(ContentType.VOWELS)} />
                             <HomeCard title="Animais" gradient="bg-gradient-to-br from-amber-400 to-orange-500" shadowColor="shadow-orange-200" content={<PawPrint size={56} className="text-white drop-shadow-md" />} onClick={() => selectContentType(ContentType.ANIMALS)} />
                        </div>
                        <button onClick={() => setView('DASHBOARD')} className="w-full max-w-2xl p-6 bg-white rounded-3xl shadow-lg border-2 border-slate-100 flex items-center gap-4 hover:scale-[1.02] transition-transform group">
                            <div className="p-3 bg-slate-100 rounded-2xl text-slate-500 group-hover:bg-slate-200 transition-colors"><LayoutDashboard size={32} /></div>
                            <div className="text-left"><h3 className="text-xl font-black text-slate-700">Meu Progresso</h3><p className="text-slate-400 font-semibold text-sm">Veja suas conquistas e medalhas</p></div>
                            <div className="ml-auto text-slate-300"><ArrowRight size={24} /></div>
                        </button>
                    </div>
                </LayoutWrapper>
            )}

            {view === 'SETTINGS' && (
                <LayoutWrapper keyId="settings" className="flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-white rounded-3xl shadow-lg border border-slate-100 p-6 md:p-8">
                        <h2 className="text-2xl font-black text-slate-700 mb-6 flex items-center gap-2"><Settings className="text-slate-400"/> Configurações</h2>
                        <div className="space-y-6">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2 flex items-center gap-2"><Mic size={14} /> Voz do Narrador</label>
                                <select className="w-full p-4 rounded-xl border-2 border-slate-100 bg-slate-50 text-base font-semibold text-slate-600 focus:outline-none focus:border-blue-300" onChange={(e) => setSelectedVoice(voices[parseInt(e.target.value)])} value={voices.indexOf(selectedVoice as SpeechSynthesisVoice)}>
                                    {voices.length === 0 && <option>Padrão</option>}
                                    {voices.map((v, i) => (<option key={i} value={i}>{v.name.replace(/(Microsoft|Google) /, '').slice(0, 30)}</option>))}
                                </select>
                            </div>
                            <div className="pt-6 border-t border-slate-100">
                                <button onClick={handleLogout} className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl text-base font-black transition-all bg-red-50 text-red-500 hover:bg-red-100 border border-red-100"><LogOut size={20} /><span>Sair da Conta</span></button>
                            </div>
                        </div>
                    </div>
                </LayoutWrapper>
            )}

            {view === 'DASHBOARD' && <LayoutWrapper keyId="dashboard"><Dashboard /></LayoutWrapper>}

            {view === 'GAME' && (
                <LayoutWrapper keyId={`game-${contentType}-${gameMode}`} className="w-full h-full">
                    {/* Visual Feedback Overlay */}
                    {quiz.feedback && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/20 backdrop-blur-sm animate-in fade-in duration-200 pointer-events-none">
                            <div className={`text-9xl filter drop-shadow-2xl ${quiz.feedback === 'correct' ? 'animate-bounce' : 'animate-shake'}`}>
                                {quiz.feedback === 'correct' ? '🌟' : '🤔'}
                            </div>
                        </div>
                    )}
                    
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
                            <div className="w-[min(65vh,80vw)] aspect-square animate-pop relative group">
                                <GameButton text={contentType === ContentType.ANIMALS ? '' : items[flashcard.index].text} color={items[flashcard.index].color} size="large" showDots={displayStyle === 'alternate' && contentType === ContentType.NUMBERS} onClick={(e) => handleItemClick(items[flashcard.index], e)} isFlat={contentType === ContentType.ANIMALS} className="w-full h-full" />
                                {contentType === ContentType.ANIMALS && (
                                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6 pb-8">
                                        <div className="flex-1 w-full flex items-center justify-center overflow-hidden mb-4"><img src={items[flashcard.index].image} alt={items[flashcard.index].text} className="max-w-full max-h-full object-contain drop-shadow-sm" /></div>
                                        <span className="text-3xl md:text-5xl font-black text-slate-700 drop-shadow-sm tracking-wide">{items[flashcard.index].text}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {gameMode === GameMode.QUIZ && (
                        <div className="w-full h-full flex items-center justify-center">
                            <div className="flex gap-4 md:gap-12 flex-wrap justify-center items-center w-full max-w-6xl">
                                {quiz.options.map((item) => (
                                    <div key={item.id} className="w-[28vw] md:w-[20vw] aspect-square max-w-[250px] relative animate-pop">
                                        <GameButton text={contentType === ContentType.ANIMALS ? '' : item.text} color={item.color} onClick={(e) => handleItemClick(item, e)} size="normal" showDots={displayStyle === 'alternate' && contentType === ContentType.NUMBERS} isFlat={contentType === ContentType.ANIMALS} />
                                        {contentType === ContentType.ANIMALS && (<div className="absolute inset-0 pointer-events-none flex items-center justify-center"><img src={item.image} alt={item.text} className="w-[70%] h-[70%] object-contain" /></div>)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {gameMode === GameMode.TRACING && items.length > 0 && (
                        <TracingGame item={items[tracingIndex]} onComplete={handleTracingComplete} speak={speak} />
                    )}

                    {gameMode === GameMode.MEMORY && contentType === ContentType.ANIMALS && (
                        <MemoryGame items={dbAnimals} user={user} speak={speak} confettiRef={confettiRef} onExit={() => setGameMode(GameMode.EXPLORE)} />
                    )}
                </LayoutWrapper>
            )}
        </div>
      </main>
    </div>
  );
};

export default App;
