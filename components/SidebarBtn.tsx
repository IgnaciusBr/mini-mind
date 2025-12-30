
import React from 'react';
import { Lock } from 'lucide-react';

interface SidebarBtnProps {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
    colorClass: string;
    disabled?: boolean;
}

export const SidebarBtn: React.FC<SidebarBtnProps> = ({ active, onClick, icon, label, colorClass, disabled = false }) => (
  <button onClick={disabled ? undefined : onClick} disabled={disabled} className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-sm font-bold transition-all duration-200 ${disabled ? 'opacity-40 cursor-not-allowed bg-slate-50 text-slate-300' : ''} ${!disabled && active ? `${colorClass} text-white shadow-lg scale-105` : !disabled ? 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 hover:scale-102' : ''}`}>
    <div className={`${!disabled && active ? 'text-white' : disabled ? 'text-slate-300' : 'text-slate-400'}`}>{disabled ? <Lock size={20} /> : icon}</div>
    <span className="tracking-wide">{label}</span>
  </button>
);
