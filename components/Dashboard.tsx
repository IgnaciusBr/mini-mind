
import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { MemoryResult, QuizHistory, ContentType } from '../types';
import { Trophy, Clock, AlertCircle, BarChart2, Brain, Activity, List, TrendingUp } from 'lucide-react';

export const Dashboard: React.FC<{ user: any }> = ({ user }) => {
  const [memoryResults, setMemoryResults] = useState<MemoryResult[]>([]);
  const [quizHistory, setQuizHistory] = useState<QuizHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDifficulty, setSelectedDifficulty] = useState<number>(6);
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const quizRef = doc(db, 'users', user.uid, 'stats', 'quiz');
        const memoryRef = doc(db, 'users', user.uid, 'stats', 'memory');
        
        const [quizSnap, memorySnap] = await Promise.all([getDoc(quizRef), getDoc(memoryRef)]);
        
        if (quizSnap.exists()) setQuizHistory(quizSnap.data() as QuizHistory);
        if (memorySnap.exists()) setMemoryResults(memorySnap.data().results || []);
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  const getPercentage = (stats: {correct: number, wrong: number}) => {
    const total = stats.correct + stats.wrong;
    return total === 0 ? 0 : Math.round((stats.correct / total) * 100);
  };

  const filteredMemory = memoryResults.filter(r => r.difficulty === selectedDifficulty);

  if (loading) return <div className="w-full h-full flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>;

  return (
    <div className="w-full h-full overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-8 bg-slate-50/30">
      <header>
        <h2 className="text-3xl font-black text-slate-700 flex items-center gap-3">
          <BarChart2 className="text-blue-500" /> Meu Progresso
        </h2>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.values(ContentType).map(type => {
          const stats = quizHistory?.[type] || { correct: 0, wrong: 0 };
          const p = getPercentage(stats);
          return (
            <div key={type} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-4">
                <span className="font-black text-slate-700 uppercase text-xs">{type}</span>
                <span className="text-blue-500 font-black">{p}%</span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden mb-4">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${p}%` }} />
              </div>
              <div className="flex justify-between text-xs font-bold">
                <span className="text-green-500 flex items-center gap-1"><Trophy size={14} /> {stats.correct}</span>
                <span className="text-red-400 flex items-center gap-1"><AlertCircle size={14} /> {stats.wrong}</span>
              </div>
            </div>
          );
        })}
      </section>

      <section className="bg-white p-6 rounded-[3rem] shadow-sm border border-slate-100 space-y-6">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <h3 className="text-xl font-black text-slate-700 flex items-center gap-2"><Clock className="text-orange-400" /> Jogo da Memória</h3>
          <div className="flex bg-slate-50 p-1 rounded-2xl">
            {[6, 8, 10, 15].map(d => (
              <button key={d} onClick={() => setSelectedDifficulty(d)} className={`px-4 py-2 rounded-xl text-xs font-black ${selectedDifficulty === d ? 'bg-white text-blue-500 shadow-sm' : 'text-slate-400'}`}>{d} Pares</button>
            ))}
          </div>
        </div>

        {filteredMemory.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-bold bg-slate-50 rounded-[2rem]">Nenhum resultado ainda. Vamos jogar?</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-400 text-xs font-black uppercase tracking-widest border-b border-slate-50">
                  <th className="py-4">Data</th>
                  <th className="py-4">Tempo</th>
                  <th className="py-4">Erros</th>
                </tr>
              </thead>
              <tbody>
                {filteredMemory.reverse().slice(0, 10).map(r => (
                  <tr key={r.id} className="border-b border-slate-50 text-slate-600 font-bold">
                    <td className="py-4">{new Date(r.date).toLocaleDateString()}</td>
                    <td className="py-4 font-mono">{formatTime(r.timeSeconds)}</td>
                    <td className="py-4 text-red-400">{r.errors} erros</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

const Loader2: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" opacity="0.25" /><path d="M12 2a10 10 0 0 1 10 10" /></svg>
);
