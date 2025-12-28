import React, { useEffect, useState } from 'react';
import { MemoryResult, QuizHistory, ContentType } from '../types';
import { Trophy, Clock, AlertCircle, BarChart2, Calendar, Brain, List, Activity, TrendingUp } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [memoryResults, setMemoryResults] = useState<MemoryResult[]>([]);
  const [quizHistory, setQuizHistory] = useState<QuizHistory | null>(null);
  
  // Dashboard Controls
  const [memoryViewMode, setMemoryViewMode] = useState<'table' | 'chart'>('chart');
  const [selectedDifficulty, setSelectedDifficulty] = useState<number>(6); // Default 6 pairs

  useEffect(() => {
    // Load data from localStorage
    const savedMemory = localStorage.getItem('ab_memory_results');
    if (savedMemory) {
        setMemoryResults(JSON.parse(savedMemory)); 
    }

    const savedQuiz = localStorage.getItem('ab_quiz_history');
    if (savedQuiz) setQuizHistory(JSON.parse(savedQuiz));
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

            <div className="flex flex-wrap items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                {/* Difficulty Selector */}
                <div className="flex bg-slate-100 rounded-lg p-1">
                    {[6, 8, 10, 15].map(diff => (
                        <button
                            key={diff}
                            onClick={() => setSelectedDifficulty(diff)}
                            className={`
                                px-3 py-1.5 rounded-md text-xs font-bold transition-all
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

                <div className="w-px h-6 bg-slate-200 mx-1"></div>

                {/* View Toggle */}
                <div className="flex bg-slate-100 rounded-lg p-1">
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
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden min-h-[400px]">
                
                {memoryViewMode === 'table' ? (
                    /* --- TABLE VIEW --- */
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-slate-600">
                            <thead className="text-xs text-slate-400 uppercase bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4 font-bold">Data</th>
                                    <th className="px-6 py-4 font-bold text-center">Tempo</th>
                                    <th className="px-6 py-4 font-bold text-center">Erros</th>
                                    <th className="px-6 py-4 font-bold text-center">Eficiência</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Reverse for table to show newest first */}
                                {[...filteredMemoryResults].reverse().map((result) => {
                                    const score = calculateEfficiency(result.timeSeconds, result.errors, result.difficulty);
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
                                                <span className="font-bold text-orange-500">{score}%</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    /* --- CHART VIEW --- */
                    <div className="p-4 md:p-8 w-full h-[400px] flex justify-center">
                       <PerformanceChart data={filteredMemoryResults} difficulty={selectedDifficulty} />
                    </div>
                )}
            </div>
        )}
      </section>

    </div>
  );
};

// --- Helper: Efficiency Calculation ---
const calculateEfficiency = (time: number, errors: number, difficulty: number) => {
    // 3s para 6 pares, 4s para 8, 5s para 10 e 6s para 15
    let timePerPair = 3;
    if (difficulty === 8) timePerPair = 4;
    else if (difficulty === 10) timePerPair = 5;
    else if (difficulty === 15) timePerPair = 6;

    const parTime = difficulty * timePerPair;
    
    // Penalidade de tempo: Se exceder o par, perde 1 ponto a cada 2s extras
    const timePenalty = Math.max(0, (time - parTime) / 2);
    
    // Penalidade de erro: 10 pontos por erro
    const errorPenalty = errors * 10;
    
    const score = 100 - timePenalty - errorPenalty;
    return Math.max(0, Math.round(score));
};

// --- Sub-Component: Custom SVG Chart ---
const PerformanceChart: React.FC<{ data: MemoryResult[], difficulty: number }> = ({ data, difficulty }) => {
    // Only show last 20 games to keep chart readable
    const chartData = data.slice(-20);
    
    if (chartData.length < 2) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                <BarChart2 size={48} className="mb-2 opacity-50" />
                <p>Jogue mais partidas neste nível para ver o gráfico de evolução.</p>
            </div>
        );
    }

    // Dimensions
    const width = 100; // viewBox units
    const height = 100; 
    const padding = 10;
    const graphWidth = width - (padding * 2);
    const graphHeight = height - (padding * 2);

    // Scales
    const maxTime = Math.max(...chartData.map(d => d.timeSeconds), difficulty * 10); // Ensure minimal scale
    const maxErrors = Math.max(...chartData.map(d => d.errors), 5); // Ensure minimal scale
    
    // X Scale: index based
    const stepX = graphWidth / (chartData.length - 1 || 1);

    return (
        <div className="w-full h-full flex flex-col">
            <div className="flex items-center justify-between mb-2 text-xs font-bold px-4">
                 <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-blue-400 rounded-sm"></span> Tempo (s)
                    <span className="w-3 h-3 bg-red-400 rounded-sm"></span> Erros
                 </div>
                 <div className="flex items-center gap-2 text-yellow-600">
                    <TrendingUp size={14} /> Aproveitamento (%)
                 </div>
            </div>

            {/* Added extra padding on sides (px-12) to prevent labels from being cut off */}
            <div className="relative flex-1 w-full border-l border-b border-slate-200 px-10 md:px-12">
                {/* Y Axis Labels (Left - Time) */}
                <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-[10px] text-slate-400 py-2 text-right w-8">
                    <span>{Math.round(maxTime)}s</span>
                    <span>{Math.round(maxTime / 2)}s</span>
                    <span>0s</span>
                </div>
                
                {/* Y Axis Labels (Right - Errors) */}
                 <div className="absolute right-0 top-0 bottom-0 flex flex-col justify-between text-[10px] text-slate-400 py-2 text-left w-8">
                    <span>{maxErrors}E</span>
                    <span>{Math.round(maxErrors / 2)}E</span>
                    <span>0E</span>
                </div>

                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
                    
                    {/* Grid Lines */}
                    <line x1={padding} y1={padding} x2={width-padding} y2={padding} stroke="#f1f5f9" strokeWidth="0.5" />
                    <line x1={padding} y1={height/2} x2={width-padding} y2={height/2} stroke="#f1f5f9" strokeWidth="0.5" />

                    {chartData.map((d, i) => {
                        const x = padding + (i * stepX);
                        
                        // Calculate Heights (Inverted Y)
                        // Graph Y starts at padding, ends at height-padding. 
                        // Value 0 is at height-padding. Value Max is at padding.
                        
                        const timeH = (d.timeSeconds / maxTime) * graphHeight;
                        const errorH = (d.errors / maxErrors) * graphHeight;
                        
                        const efficiency = calculateEfficiency(d.timeSeconds, d.errors, difficulty);
                        const scoreY = (height - padding) - ((efficiency / 100) * graphHeight);

                        // Previous point for line
                        const prevD = i > 0 ? chartData[i-1] : null;
                        const prevX = i > 0 ? padding + ((i-1) * stepX) : x;
                        const prevScoreY = prevD ? (height - padding) - ((calculateEfficiency(prevD.timeSeconds, prevD.errors, difficulty) / 100) * graphHeight) : scoreY;

                        return (
                            <g key={d.id} className="group">
                                {/* Time Bar (Blue) - Width fixed slightly */}
                                <rect 
                                    x={x - 1} 
                                    y={(height - padding) - timeH} 
                                    width="2" 
                                    height={timeH} 
                                    fill="#60A5FA" 
                                    opacity="0.6"
                                    className="transition-all hover:opacity-100"
                                />
                                
                                {/* Error Bar (Red) - Offset slightly right */}
                                <rect 
                                    x={x + 1} 
                                    y={(height - padding) - errorH} 
                                    width="2" 
                                    height={errorH} 
                                    fill="#F87171" 
                                    opacity="0.8"
                                    className="transition-all hover:opacity-100"
                                />

                                {/* Efficiency Line Segment */}
                                {i > 0 && (
                                    <line 
                                        x1={prevX} y1={prevScoreY} 
                                        x2={x} y2={scoreY} 
                                        stroke="#CA8A04" 
                                        strokeWidth="0.5" 
                                    />
                                )}
                                {/* Efficiency Point */}
                                <circle cx={x} cy={scoreY} r="1.5" fill="#EAB308" stroke="white" strokeWidth="0.2" />

                                {/* Tooltip Area (Invisible rect for hover) */}
                                <rect x={x - 2} y={padding} width="4" height={graphHeight} fill="transparent">
                                    <title>{`Rodada ${i+1}\nTempo: ${d.timeSeconds}s\nErros: ${d.errors}\nAproveitamento: ${efficiency}%`}</title>
                                </rect>
                            </g>
                        );
                    })}
                </svg>
                
                {/* X Axis Label */}
                <div className="absolute bottom-0 left-0 right-0 text-center text-[10px] text-slate-400">
                    Histórico de Partidas (Antigo → Recente)
                </div>
            </div>
        </div>
    );
};