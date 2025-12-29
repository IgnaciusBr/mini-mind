
import React, { useState } from 'react';
import { auth, googleProvider, db } from '../firebase';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Logo } from './Logo';
import { Loader2, Mail, Lock, User, Calendar, ArrowRight, LogIn } from 'lucide-react';
import { UserProfile } from '../types';

interface AuthScreenProps {
  onLoginSuccess: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [childName, setChildName] = useState('');
  const [age, setAge] = useState('');

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Check if profile exists
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        // If first time with Google, we will handle profile creation in the App.tsx 
        // by detecting missing profile data.
      }
      onLoginSuccess();
    } catch (err: any) {
      console.error(err);
      setError("Erro ao entrar com Google. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        onLoginSuccess();
      } else {
        // Validation
        if (!childName || !age) {
          throw new Error("Por favor, preencha o nome e a idade da criança.");
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Create Profile
        const profile: UserProfile = {
          uid: user.uid,
          childName,
          age,
          parentEmail: user.email || email,
          createdAt: Date.now()
        };

        await setDoc(doc(db, "users", user.uid), profile);
        onLoginSuccess();
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') setError("Este e-mail já está cadastrado.");
      else if (err.code === 'auth/wrong-password') setError("Senha incorreta.");
      else if (err.code === 'auth/user-not-found') setError("Usuário não encontrado.");
      else if (err.code === 'auth/weak-password') setError("A senha deve ter pelo menos 6 caracteres.");
      else setError(err.message || "Ocorreu um erro. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Blobs (Inherited from global css but added here for component isolation if needed) */}
      
      <div className="bg-white/90 backdrop-blur-xl w-full max-w-md rounded-[2.5rem] shadow-2xl border border-white/50 p-8 md:p-10 relative z-10 animate-in fade-in zoom-in duration-300">
        
        <div className="flex flex-col items-center mb-8">
          <Logo className="w-48 mb-6" />
          <h2 className="text-2xl font-black text-slate-700 text-center">
            {isLogin ? 'Bem-vindo de volta!' : 'Crie sua conta'}
          </h2>
          <p className="text-slate-400 font-medium text-center mt-2">
            {isLogin ? 'Entre para continuar aprendendo.' : 'Preencha os dados para começar a diversão!'}
          </p>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-4">
            
            {!isLogin && (
                <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-4 fade-in">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 ml-3 uppercase">Nome da Criança</label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text" 
                                placeholder="Ex: Lucas"
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-blue-400 font-bold text-slate-600 transition-colors"
                                value={childName}
                                onChange={(e) => setChildName(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 ml-3 uppercase">Idade</label>
                        <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="number" 
                                placeholder="Anos"
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-blue-400 font-bold text-slate-600 transition-colors"
                                value={age}
                                onChange={(e) => setAge(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 ml-3 uppercase">Email dos Pais</label>
                <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="email" 
                        placeholder="pai@exemplo.com"
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-blue-400 font-bold text-slate-600 transition-colors"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 ml-3 uppercase">Senha</label>
                <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="password" 
                        placeholder="••••••••"
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-blue-400 font-bold text-slate-600 transition-colors"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                    />
                </div>
            </div>

            {error && (
                <div className="p-3 bg-red-50 text-red-500 text-sm font-bold rounded-xl flex items-center gap-2">
                    <ArrowRight size={16} /> {error}
                </div>
            )}

            <button 
                type="submit" 
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl font-black text-lg shadow-lg shadow-blue-200 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 mt-4"
            >
                {loading ? <Loader2 className="animate-spin" /> : (isLogin ? 'Entrar' : 'Criar Conta Grátis')}
            </button>
        </form>

        <div className="my-6 flex items-center gap-4">
            <div className="h-px bg-slate-200 flex-1" />
            <span className="text-slate-400 text-xs font-bold uppercase">Ou continue com</span>
            <div className="h-px bg-slate-200 flex-1" />
        </div>

        <button 
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-3 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 hover:border-slate-200 transition-all flex items-center justify-center gap-3"
        >
             <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Google
        </button>

        <div className="mt-8 text-center">
            <p className="text-slate-500 font-medium text-sm">
                {isLogin ? 'Ainda não tem conta?' : 'Já tem uma conta?'}
                <button 
                    onClick={() => { setIsLogin(!isLogin); setError(null); }}
                    className="ml-2 text-blue-600 font-bold hover:underline focus:outline-none"
                >
                    {isLogin ? 'Cadastre-se' : 'Faça Login'}
                </button>
            </p>
        </div>
      </div>
    </div>
  );
};
