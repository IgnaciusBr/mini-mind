
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
      setError(err.message.includes('auth/invalid-credential') ? 'E-mail ou senha incorretos' : 'Ocorreu um erro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
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
      setError('Erro ao entrar com Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm flex flex-col gap-6 animate-in fade-in duration-500">
        
        <div className="flex flex-col items-center gap-4 text-center">
          <Logo className="h-16 w-auto" />
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-slate-700">
              {isLogin ? 'Bem-vindo de volta!' : 'Crie sua conta'}
            </h2>
            <p className="text-slate-400 font-bold text-sm">
              {isLogin ? 'Pronto para aprender brincando?' : 'Vamos começar a diversão!'}
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-500 p-4 rounded-2xl text-xs font-black border border-red-100 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="flex flex-col gap-3">
          {!isLogin && (
            <>
              <Input icon={<User size={18} />} placeholder="Seu nome" value={formData.name} onChange={v => setFormData({...formData, name: v})} />
              <Input icon={<Calendar size={18} />} type="number" placeholder="Sua idade" value={formData.age} onChange={v => setFormData({...formData, age: v})} />
            </>
          )}
          <Input icon={<Mail size={18} />} type="email" placeholder="E-mail" value={formData.email} onChange={v => setFormData({...formData, email: v})} />
          <Input icon={<Lock size={18} />} type="password" placeholder="Senha" value={formData.password} onChange={v => setFormData({...formData, password: v})} />

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-blue-200 active:scale-95 transition-all flex items-center justify-center gap-2 mt-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : (isLogin ? <LogIn size={20} /> : <UserPlus size={20} />)}
            {isLogin ? 'Entrar Agora' : 'Cadastrar'}
          </button>
        </form>

        <div className="flex items-center gap-4 py-2">
          <div className="flex-1 h-px bg-slate-100"></div>
          <span className="text-[10px] font-black text-slate-300 uppercase">Ou</span>
          <div className="flex-1 h-px bg-slate-100"></div>
        </div>

        <button 
          onClick={handleGoogleLogin}
          className="w-full py-4 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl font-black flex items-center justify-center gap-3 active:scale-95 shadow-sm"
        >
          <Chrome className="text-red-500" size={20} />
          Google
        </button>

        <button 
          onClick={() => setIsLogin(!isLogin)}
          className="text-xs font-black text-slate-400 hover:text-blue-500 transition-colors flex items-center justify-center gap-1 uppercase tracking-widest"
        >
          {isLogin ? 'Criar uma conta' : 'Já tenho conta'}
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};

const Input: React.FC<{ icon: any; placeholder: string; value: string; onChange: (v: string) => void; type?: string }> = ({ icon, placeholder, value, onChange, type = "text" }) => (
    <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">{icon}</div>
        <input 
            type={type} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:outline-none focus:border-blue-400 focus:bg-white transition-all font-bold text-slate-700 text-sm"
        />
    </div>
);
