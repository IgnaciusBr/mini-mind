
import React, { useEffect, useState } from 'react';
import { MemoryResult, QuizHistory, ContentType } from '../types';
import { Trophy, Clock, AlertCircle, BarChart2, Calendar, Brain, List, Activity, TrendingUp, Loader2, Maximize2, X, Smartphone } from 'lucide-react';
import { db, auth } from '../firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

interface DashboardProps {
    onRequestLandscape: (allowed: boolean) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onRequestLandscape }) => {
  const [memoryResults, setMemoryResults] = useState<MemoryResult[]>([]);
  const [quizHistory, setQuizHistory] = useState<QuizHistory | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Dashboard Controls
  const [memoryViewMode, setMemoryViewMode] = useState<'table' | 'chart'>('table');
  const [selectedDifficulty, setSelectedDifficulty] = useState<number>(6); // Default 6 pairs
  const [showChartModal, setShowChartModal] = useState(false);

  // Manage Orientation Permission based on Modal State
  useEffect(() => {
    onRequestLandscape(showChartModal);
  }, [showChartModal, onRequestLandscape]);

  useEffect(() => {
    const fetchData = async () => {
        const user = auth.currentUser;
        if (!user) {
            setLoading(false);
            return;
        }

        try {
            // Fetch Quiz Stats
            const quizRef = doc(db, "users", user.uid, "stats", "quiz");
            const quizSnap = await getDoc(quizRef);
            if (quizSnap.exists()) {
                setQuizHistory(quizSnap.data() as QuizHistory);
            }

            // Fetch Memory Results
            const memoryRef = collection(db, "users", user.uid, "memory_results");
            const memorySnap = await getDocs(memoryRef);
            const memoryData = memorySnap.docs.map(doc => doc.data() as MemoryResult);
            setMemoryResults(memoryData);

        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    fetchData();
  }, []);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateQuizPercentage = (stats: {correct: number, wrong: number}) => {
    const total = stats.correct + stats.wrong;
    if (total === 0) return 0;
    return Math.round((stats.correct / total) * 100);
  };

  // --- Filtered Data for Memory Section ---
  const filteredMemoryResults = memoryResults
    .filter(r => r.difficulty === selectedDifficulty)
    .sort((a, b) => a.date - b.date); // Oldest first for Chart

  if (loading) {
      return (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 animate-in fade-in">
              <Loader2 className="animate-spin mb-2" size={32} />
              <p className="text-sm font-bold">Carregando estatísticas...</p>
          </div>
      );
  }

  return (
    <div className="w-full h-full overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-8 bg-slate-50/50">
      
      <header className="mb-8">
        <h2 className="text-3xl font-black text-slate-700 flex items-center gap-3">
          <BarChart2 className="text-blue-500" size={32} />
          Painel de Progresso
        </h2>
        <p className="text-slate-500 font-medium">Acompanhe o desempenho e evolução do aprendizado.</p>
      </header>

      {/* --- Quiz Section --- */}
      <section>
        <h3 className="text-xl font-bold text-slate-600 mb-4 flex items-center gap-2">
            <Brain size={24} className="text-purple-500"/>
            Desempenho no Quiz
        </h3>
        
        {!quizHistory ? (
           <div className="p-8 bg-white rounded-3xl shadow-sm border border-slate-100 text-center text-slate-400">
             Nenhum dado de quiz registrado ainda.
           </div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.values(ContentType).map((type) => {
                    const stats = quizHistory[type] || { correct: 0, wrong: 0 };
                    const total = stats.correct + stats.wrong;
                    const percentage = calculateQuizPercentage(stats);
                    
                    let colorClass = 'bg-slate-100 text-slate-500';
                    if (total > 0) {
                        if (percentage >= 80) colorClass = 'bg-green-100 text-green-700 border-green-200';
                        else if (percentage >= 50) colorClass = 'bg-yellow-100 text-yellow-700 border-yellow-200';
                        else colorClass = 'bg-red-100 text-red-700 border-red-200';
                    }

                    return (
                        <div key={type} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-4">
                            <div className="flex justify-between items-start">
                                <h4 className="font-bold text-slate-700 capitalize">{type.toLowerCase()}</h4>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${colorClass}`}>
                                    {percentage}% Acertos
                                </span>
                            </div>
                            
                            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-blue-500 transition-all duration-500" 
                                    style={{ width: `${percentage}%` }}
                                />
                            </div>

                            <div className="flex justify-between text-sm font-semibold">
                                <div className="text-green-600 flex items-center gap-1">
                                    <Trophy size={14} /> {stats.correct}
                                </div>
                                <div className="text-red-500 flex items-center gap-1">
                                    <AlertCircle size={14} /> {stats.wrong}
                                </div>
                                <div className="text-slate-400">
                                    Total: {total}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        )}
      </section>

      {/* --- Memory Game Section --- */}
      <section className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h3 className="text-xl font-bold text-slate-600 flex items-center gap-2">
                <Clock size={24} className="text-orange-500"/>
                Histórico da Memória
            </h3>

            <div className="flex flex-wrap items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm w-full md:w-auto justify-between md:justify-end">
                {/* Difficulty Selector */}
                <div className="flex bg-slate-100 rounded-lg p-1 overflow-x-auto">
                    {[6, 8, 10, 15].map(diff => (
                        <button
                            key={diff}
                            onClick={() => setSelectedDifficulty(diff)}
                            className={`
                                px-3 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap
                                ${selectedDifficulty === diff 
                                    ? 'bg-white text-blue-600 shadow-sm' 
                                    : 'text-slate-500 hover:text-slate-700'
                                }
                            `}
                        >
                            {diff} Pares
                        </button>
                    ))}
                </div>

                <div className="w-px h-6 bg-slate-200 mx-1 hidden md:block"></div>

                {/* View Toggle (Desktop Only) */}
                <div className="hidden md:flex bg-slate-100 rounded-lg p-1">
                    <button 
                        onClick={() => setMemoryViewMode('chart')}
                        className={`p-1.5 rounded-md transition-all ${memoryViewMode === 'chart' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
                        title="Gráfico"
                    >
                        <Activity size={18} />
                    </button>
                    <button 
                        onClick={() => setMemoryViewMode('table')}
                        className={`p-1.5 rounded-md transition-all ${memoryViewMode === 'table' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
                        title="Tabela"
                    >
                        <List size={18} />
                    </button>
                </div>
            </div>
        </div>

        {memoryResults.length === 0 ? (
            <div className="p-8 bg-white rounded-3xl shadow-sm border border-slate-100 text-center text-slate-400">
                Nenhuma partida de memória registrada.
            </div>
        ) : filteredMemoryResults.length === 0 ? (
            <div className="p-8 bg-white rounded-3xl shadow-sm border border-slate-100 text-center text-slate-400">
                Nenhum resultado encontrado para a dificuldade selecionada ({selectedDifficulty} pares).
            </div>
        ) : (
            <div className="space-y-4">
                
                {/* Mobile Button for Fullscreen Chart */}
                <button 
                    onClick={() => setShowChartModal(true)}
                    className="w-full md:hidden bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 font-bold hover:scale-[1.02] active:scale-95 transition-all"
                >
                    <Activity size={20} />
                    Ver Gráfico de Evolução
                </button>

                <div className={`bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden min-h-[400px] ${memoryViewMode === 'chart' ? 'hidden md:block' : ''}`}>
                    
                    {/* Always show Table on Mobile (unless modal open), Chart or Table on Desktop based on toggle */}
                    {(memoryViewMode === 'table' || window.innerWidth < 768) && (
                        /* --- TABLE VIEW --- */
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-slate-600">
                                <thead className="text-xs text-slate-400 uppercase bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4 font-bold">Data</th>
                                        <th className="px-6 py-4 font-bold text-center">Tempo</th>
                                        <th className="px-6 py-4 font-bold text-center">Erros</th>
                                        <th className="px-6 py-4 font-bold text-center">Pontuação</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Reverse for table to show newest first */}
                                    {[...filteredMemoryResults].reverse().map((result) => {
                                        const score = calculateScore(result.timeSeconds, result.errors, result.difficulty);
                                        return (
                                            <tr key={result.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4 flex items-center gap-2">
                                                    <Calendar size={14} className="text-slate-400"/>
                                                    {formatDate(result.date)}
                                                </td>
                                                <td className="px-6 py-4 text-center font-mono bg-slate-50/50">
                                                    {formatTime(result.timeSeconds)}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-2 py-1 rounded-md font-bold ${result.errors === 0 ? 'bg-green-100 text-green-600' : 'bg-red-50 text-red-500'}`}>
                                                        {result.errors}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="font-bold text-blue-600 font-mono text-base">{score.toLocaleString()}</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                    
                    {/* Desktop Inline Chart */}
                    {memoryViewMode === 'chart' && (
                        <div className="p-4 md:p-8 w-full h-[400px] flex justify-center hidden md:flex">
                           <PerformanceChart data={filteredMemoryResults} difficulty={selectedDifficulty} />
                        </div>
                    )}
                </div>
            </div>
        )}
      </section>

      {/* --- Fullscreen Chart Modal --- */}
      {showChartModal && (
        <div className="fixed inset-0 z-[110] bg-white flex flex-col animate-in fade-in slide-in-from-bottom-4">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <Activity className="text-blue-500" />
                    <h3 className="font-black text-slate-700">Evolução ({selectedDifficulty} Pares)</h3>
                </div>
                <button 
                    onClick={() => setShowChartModal(false)}
                    className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
                >
                    <X size={24} />
                </button>
            </div>
            
            <div className="flex-1 w-full h-full p-4 relative bg-slate-50/50">
                 {/* Prompt to rotate if in portrait */}
                 <div className="md:hidden absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-slate-800/80 backdrop-blur text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 shadow-lg landscape:hidden">
                    <Smartphone size={14} className="rotate-90" />
                    Gire a tela para ver melhor
                 </div>

                 {filteredMemoryResults.length < 2 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <Activity size={48} className="mb-4 opacity-30" />
                        <p>Jogue mais partidas para ver o gráfico!</p>
                    </div>
                 ) : (
                    <PerformanceChart data={filteredMemoryResults} difficulty={selectedDifficulty} />
                 )}
            </div>
        </div>
      )}

    </div>
  );
};

// --- MATH LOGIC: Inverse Efficiency Model (Hyperbola) ---
const calculateScore = (time: number, errors: number, difficulty: number) => {
    const K = difficulty * 10000;
    const P = 10;
    const cost = time + (errors * P) + 1;
    const score = Math.round(K / cost);
    return score;
};

// --- Sub-Component: Improved Bezier Chart ---
const PerformanceChart: React.FC<{ data: MemoryResult[], difficulty: number }> = ({ data, difficulty }) => {
    // Only show last 20 games
    const chartData = data.slice(-20);
    
    if (chartData.length < 2) return null;

    // Dimensions
    const width = 100; // viewBox units
    const height = 50; // Widescreen aspect ratio for better look
    const padding = 8;
    const graphWidth = width - (padding * 2);
    const graphHeight = height - (padding * 2);

    // Calculate Scores
    const scores = chartData.map(d => calculateScore(d.timeSeconds, d.errors, difficulty));
    const maxScore = Math.max(...scores) * 1.1; // Add 10% headroom
    const minScore = Math.min(...scores) * 0.9;

    // X Coordinates generator
    const getX = (index: number) => padding + (index * (graphWidth / (chartData.length - 1)));
    
    // Y Coordinates generator (Inverted)
    const getY = (score: number) => (height - padding) - (((score - minScore) / (maxScore - minScore)) * graphHeight);

    // Generate Points
    const points = scores.map((score, i) => ({ x: getX(i), y: getY(score), val: score, data: chartData[i] }));

    // Generate Smooth Path (Catmull-Rom or Cubic Bezier)
    // Simple logic: Control points are midway between points X, but flat at current Y? No, standard smoothing.
    const generatePath = (pts: typeof points) => {
        if (pts.length === 0) return "";
        let d = `M ${pts[0].x} ${pts[0].y}`;
        
        for (let i = 0; i < pts.length - 1; i++) {
            const p0 = pts[i];
            const p1 = pts[i + 1];
            
            // Control points for simple curve
            const cp1x = p0.x + (p1.x - p0.x) / 2;
            const cp1y = p0.y;
            const cp2x = p0.x + (p1.x - p0.x) / 2; // Midpoint X
            const cp2y = p1.y;

            d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
        }
        return d;
    };

    const linePath = generatePath(points);
    const areaPath = `${linePath} L ${points[points.length-1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

    return (
        <div className="w-full h-full flex flex-col">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                    </linearGradient>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                         <feGaussianBlur stdDeviation="1" result="blur" />
                         <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>

                {/* Grid Lines */}
                <line x1={padding} y1={padding} x2={width-padding} y2={padding} stroke="#E2E8F0" strokeWidth="0.2" strokeDasharray="1" />
                <line x1={padding} y1={height/2} x2={width-padding} y2={height/2} stroke="#E2E8F0" strokeWidth="0.2" strokeDasharray="1" />
                <line x1={padding} y1={height-padding} x2={width-padding} y2={height-padding} stroke="#E2E8F0" strokeWidth="0.2" />

                {/* Area Fill */}
                <path d={areaPath} fill="url(#chartFill)" />

                {/* Line */}
                <path d={linePath} fill="none" stroke="#3B82F6" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />

                {/* Data Points */}
                {points.map((p, i) => (
                    <g key={i} className="group cursor-pointer">
                        {/* Interactive Area */}
                        <circle cx={p.x} cy={p.y} r="3" fill="transparent" />
                        
                        {/* Visual Dot */}
                        <circle 
                            cx={p.x} 
                            cy={p.y} 
                            r="1.2" 
                            fill="#FFFFFF" 
                            stroke="#2563EB" 
                            strokeWidth="0.5" 
                            className="transition-all duration-300 group-hover:r-2"
                        />
                        
                        {/* Tooltip on Hover */}
                        <foreignObject x={p.x - 10} y={p.y - 12} width="20" height="10" className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none overflow-visible">
                            <div className="flex flex-col items-center">
                                <div className="bg-slate-800 text-white text-[3px] px-1 py-0.5 rounded shadow-lg whitespace-nowrap z-50">
                                    {p.val.toLocaleString()} pts
                                </div>
                                <div className="w-0 h-0 border-l-[1px] border-l-transparent border-r-[1px] border-r-transparent border-t-[1px] border-t-slate-800"></div>
                            </div>
                        </foreignObject>
                    </g>
                ))}
            </svg>
            
            <div className="flex justify-between px-4 mt-2 text-xs font-bold text-slate-400">
                <span>Partidas Anteriores</span>
                <span>Mais Recente</span>
            </div>
        </div>
    );
};
