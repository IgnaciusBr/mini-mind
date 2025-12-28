
import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { doc, getDoc, collection, query, getDocs } from 'firebase/firestore';
import { Trophy, Clock, Brain, BarChart2 } from 'lucide-react';
// Added QuizStats to imports to resolve type issues in Object.entries
import { QuizHistory, MemoryResult, QuizStats } from '../types';

export const Dashboard: React.FC<{ userId: string }> = ({ userId }) => {
    const [quizStats, setQuizStats] = useState<QuizHistory | null>(null);
    const [memoryHistory, setMemoryHistory] = useState<MemoryResult[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadStats = async () => {
            try {
                const qSnap = await getDoc(doc(db, "users", userId, "stats", "quiz"));
                if (qSnap.exists()) setQuizStats(qSnap.data() as QuizHistory);

                const mSnap = await getDoc(doc(db, "users", userId, "stats", "memory_history"));
                if (mSnap.exists()) setMemoryHistory(mSnap.data().history || []);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        loadStats();
    }, [userId]);

    if (loading) return <div className="flex items-center justify-center h-full"><BarChart2 className="animate-pulse text-blue-500" size={48}/></div>;

    return (
        <div className="h-full overflow-y-auto p-6 space-y-8 custom-scrollbar">
            <section className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-white">
                <h3 className="text-xl font-black text-slate-700 mb-6 flex items-center gap-2"><Trophy className="text-yellow-500"/> Desempenho no Quiz</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Fixed: Explicitly cast entries to [string, QuizStats][] to ensure stats is not inferred as 'unknown' */}
                    {quizStats ? (Object.entries(quizStats) as [string, QuizStats][]).map(([type, stats]) => {
                        const total = stats.correct + stats.wrong;
                        const pct = total > 0 ? Math.round((stats.correct / total) * 100) : 0;
                        return (
                            <div key={type} className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                <p className="text-xs font-black text-slate-400 uppercase mb-2">{type}</p>
                                <div className="flex justify-between items-end mb-4">
                                    <span className="text-3xl font-black text-slate-700">{pct}%</span>
                                    <span className="text-xs font-bold text-green-500">{stats.correct} acertos</span>
                                </div>
                                <div className="w-full h-3 bg-white rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 rounded-full" style={{width: `${pct}%`}} />
                                </div>
                            </div>
                        );
                    }) : <p className="col-span-3 text-center py-8 text-slate-400 font-bold">Ainda não há dados de quiz.</p>}
                </div>
            </section>

            <section className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-white">
                <h3 className="text-xl font-black text-slate-700 mb-6 flex items-center gap-2"><Clock className="text-blue-500"/> Últimas Partidas de Memória</h3>
                {memoryHistory.length > 0 ? (
                    <div className="space-y-3">
                        {memoryHistory.slice(-5).reverse().map((game, i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-black text-blue-500 shadow-sm">{game.difficulty}</div>
                                    <div>
                                        <p className="font-bold text-slate-700">Pares: {game.difficulty}</p>
                                        <p className="text-xs text-slate-400 font-bold">{new Date(game.date).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-black text-slate-700">{game.timeSeconds}s</p>
                                    <p className="text-xs text-red-400 font-bold">{game.errors} erros</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : <p className="text-center py-8 text-slate-400 font-bold">Nenhuma partida registrada.</p>}
            </section>
        </div>
    );
};
