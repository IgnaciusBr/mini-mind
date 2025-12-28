
import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { Logo } from './Logo';
import { LogIn, UserPlus, Mail, Lock, User, Calendar, Chrome, Loader2, ArrowRight } from 'lucide-react';

export const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    age: ''
  });

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        const user = userCredential.user;

        // Save profile in Firestore
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          name: formData.name,
          age: parseInt(formData.age),
          email: formData.email,
          createdAt: Date.now()
        });

        await updateProfile(user, { displayName: formData.name });
      }
    } catch (err: any) {
      setError(err.message === 'Firebase: Error (auth/invalid-credential).' ? 'E-mail ou senha incorretos' : err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Check if profile exists
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        await setDoc(docRef, {
          uid: user.uid,
          name: user.displayName || 'Estudante',
          age: 0,
          email: user.email,
          createdAt: Date.now()
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/90 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-white/50 p-8 flex flex-col gap-6 animate-in fade-in zoom-in duration-300">
        
        <div className="flex flex-col items-center gap-2">
          <Logo className="h-16 w-auto" />
          <h2 className="text-2xl font-black text-slate-700 mt-2">
            {isLogin ? 'Bem-vindo de volta!' : 'Crie sua conta'}
          </h2>
          <p className="text-slate-500 font-medium text-center">
            {isLogin ? 'Pronto para aprender brincando?' : 'Entre para o mundo da diversão e aprendizado!'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-500 p-4 rounded-2xl text-sm font-bold border border-red-100 animate-shake">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="flex flex-col gap-4">
          {!isLogin && (
            <>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="text" 
                  placeholder="Qual seu nome?" 
                  required 
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-blue-400 transition-colors font-bold text-slate-700"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="number" 
                  placeholder="Quantos anos você tem?" 
                  required 
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-blue-400 transition-colors font-bold text-slate-700"
                  value={formData.age}
                  onChange={(e) => setFormData({...formData, age: e.target.value})}
                />
              </div>
            </>
          )}

          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="email" 
              placeholder="E-mail" 
              required 
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-blue-400 transition-colors font-bold text-slate-700"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="password" 
              placeholder="Senha" 
              required 
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-blue-400 transition-colors font-bold text-slate-700"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-blue-200 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : (isLogin ? <LogIn size={20} /> : <UserPlus size={20} />)}
            {isLogin ? 'Entrar Agora' : 'Começar a Aprender'}
          </button>
        </form>

        <div className="flex items-center gap-4 py-2">
          <div className="flex-1 h-px bg-slate-100"></div>
          <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Ou entre com</span>
          <div className="flex-1 h-px bg-slate-100"></div>
        </div>

        <button 
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full py-4 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl font-bold flex items-center justify-center gap-3 active:scale-95 hover:bg-slate-50 transition-all shadow-sm"
        >
          <Chrome className="text-red-500" size={20} />
          Google
        </button>

        <button 
          onClick={() => setIsLogin(!isLogin)}
          className="text-sm font-bold text-slate-500 hover:text-blue-500 transition-colors flex items-center justify-center gap-1 group"
        >
          {isLogin ? 'Não tem uma conta? Crie aqui' : 'Já tem uma conta? Entre aqui'}
          <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};
