
import React, { useState } from 'react';
import { auth, db, googleProvider } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { LogIn, UserPlus, Mail, Lock, User, Calendar, Chrome, Eye, EyeOff } from 'lucide-react';
import { Logo } from './Logo';

export const AuthForm: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                const res = await createUserWithEmailAndPassword(auth, email, password);
                await setDoc(doc(db, "users", res.user.uid), {
                    uid: res.user.uid,
                    displayName: name,
                    age: parseInt(age),
                    email: email,
                    createdAt: Date.now()
                });
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setError('');
        try {
            const res = await signInWithPopup(auth, googleProvider);
            const userDoc = await getDoc(doc(db, "users", res.user.uid));
            if (!userDoc.exists()) {
                await setDoc(doc(db, "users", res.user.uid), {
                    uid: res.user.uid,
                    displayName: res.user.displayName,
                    age: 0,
                    email: res.user.email,
                    photoURL: res.user.photoURL,
                    createdAt: Date.now()
                });
            }
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] shadow-2xl w-full max-w-md border border-white">
                <div className="flex justify-center mb-8">
                    <Logo className="h-16 w-auto" />
                </div>

                <h2 className="text-2xl font-black text-slate-700 text-center mb-6">
                    {isLogin ? 'Bem-vindo de volta!' : 'Crie sua conta'}
                </h2>

                <form onSubmit={handleEmailAuth} className="space-y-4">
                    {!isLogin && (
                        <>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input 
                                    type="text" placeholder="Nome da Criança" required
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-400 outline-none transition-all font-semibold text-slate-700"
                                    value={name} onChange={e => setName(e.target.value)}
                                />
                            </div>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input 
                                    type="number" placeholder="Idade" required
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-400 outline-none transition-all font-semibold text-slate-700"
                                    value={age} onChange={e => setAge(e.target.value)}
                                />
                            </div>
                        </>
                    )}
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="email" placeholder="E-mail dos Pais" required
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-400 outline-none transition-all font-semibold text-slate-700"
                            value={email} onChange={e => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type={showPassword ? "text" : "password"} 
                            placeholder="Senha" required
                            className="w-full pl-10 pr-12 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-400 outline-none transition-all font-semibold text-slate-700"
                            value={password} onChange={e => setPassword(e.target.value)}
                        />
                        <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                            title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    {error && <p className="text-red-500 text-xs font-bold px-2">{error}</p>}

                    <button 
                        type="submit" disabled={loading}
                        className="w-full py-4 bg-blue-500 text-white rounded-2xl font-black shadow-lg shadow-blue-200 active:scale-95 transition-transform flex items-center justify-center gap-2"
                    >
                        {loading ? 'Carregando...' : isLogin ? <><LogIn size={20}/> Entrar</> : <><UserPlus size={20}/> Começar</>}
                    </button>
                </form>

                <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-400 font-bold">Ou continue com</span></div>
                </div>

                <button 
                    onClick={handleGoogleLogin}
                    className="w-full py-3 border-2 border-slate-100 text-slate-600 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-slate-50 transition-colors"
                >
                    <Chrome size={20} className="text-blue-500" /> Google
                </button>

                <p className="text-center mt-6 text-slate-500 font-medium text-sm">
                    {isLogin ? 'Não tem conta?' : 'Já tem conta?'}
                    <button onClick={() => setIsLogin(!isLogin)} className="ml-2 text-blue-500 font-bold hover:underline">
                        {isLogin ? 'Cadastre-se' : 'Faça Login'}
                    </button>
                </p>
            </div>
        </div>
    );
};
