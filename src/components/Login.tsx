import React, { useState } from 'react';
import { User, SIKTState } from '../types';
import { Shield, Lock, Mail, ChevronRight, Sparkles, CheckCircle2 } from 'lucide-react';

interface LoginProps {
  state: SIKTState;
  onLogin: (user: User) => void;
}

export default function Login({ state, onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Suggested demo passwords
  const demoPasswords: Record<string, string> = {
    'budi@keluarga.com': 'admin123',
    'dewi@keluarga.com': 'bendahara123',
    'aditya@keluarga.com': 'anggota123',
  };

  const handleQuickSelect = (user: User) => {
    setEmail(user.email);
    setPassword(demoPasswords[user.email] || 'sikt123');
    setErrorMsg(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedEmail = email.trim().toLowerCase();
    const matchedUser = state.users.find(u => u.email.toLowerCase() === trimmedEmail);

    if (!matchedUser) {
      setErrorMsg('Email tidak terdaftar sebagai anggota keluarga SIKT.');
      return;
    }

    // Role-specific check
    const requiredPass = demoPasswords[matchedUser.email] || '123456';
    if (password !== requiredPass && password !== '123456') {
      setErrorMsg(`Kata sandi salah. Gunakan sandi "${requiredPass}" untuk mencoba.`);
      return;
    }

    setSuccessMsg(`Selamat datang, ${matchedUser.nama}!`);
    setTimeout(() => {
      onLogin(matchedUser);
      setSuccessMsg(null);
    }, 850);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 selection:bg-emerald-500 selection:text-slate-900">
      
      {/* Background Decorative Blobs */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-emerald-700/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-indigo-700/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-850 border border-slate-750 rounded-3xl shadow-xl overflow-hidden relative z-10 p-6 md:p-8 space-y-6">
        
        {/* Header Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3.5 bg-emerald-600 rounded-2xl text-white font-black tracking-widest text-lg shadow-lg mb-2">
            SIKT
          </div>
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">Silsilah Keluarga Terpadu</h1>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Keluarga Budi Effendi</p>
        </div>

        {/* Roles Hint Cards container */}
        <div className="space-y-2.5">
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">
            PILIH PERAN BARU UNTUK AUTOLOGIN
          </label>
          <div className="grid grid-cols-1 gap-2">
            {state.users.map((u) => {
              const isActive = email.toLowerCase() === u.email.toLowerCase();
              let roleBadgeColor = 'bg-indigo-950 text-indigo-400 border border-indigo-900/50';
              if (u.role === 'Bendahara') roleBadgeColor = 'bg-emerald-950 text-emerald-400 border border-emerald-900/50';
              if (u.role === 'Anggota') roleBadgeColor = 'bg-amber-950 text-amber-400 border border-amber-900/50';

              return (
                <button
                  type="button"
                  key={u.id}
                  onClick={() => handleQuickSelect(u)}
                  className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all duration-250 ${isActive ? 'bg-slate-850 border-emerald-500 shadow-md ring-1 ring-emerald-500/25' : 'bg-slate-900/50 border-slate-750 hover:bg-slate-900 hover:border-slate-700'}`}
                >
                  <div className="space-y-0.5 max-w-[70%]">
                    <p className="text-xs font-extrabold text-slate-100 truncate">{u.nama}</p>
                    <p className="text-[10px] text-slate-400 font-mono truncate">{u.email}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${roleBadgeColor}`}>
                      {u.role}
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono">Sandi: {demoPasswords[u.email] || 'sikt123'}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-2 border-t border-slate-800">
          <div className="space-y-3">
            
            {/* Email Field */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                <Mail className="h-4 w-4 text-slate-500" />
              </span>
              <input
                type="email"
                placeholder="Alamat Email Anggota"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrorMsg(null);
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-750 rounded-2xl text-xs text-slate-100 placeholder-slate-500 font-medium focus:outline-none focus:border-emerald-500 transition-all font-mono"
              />
            </div>

            {/* Password Field */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                <Lock className="h-4 w-4 text-slate-500" />
              </span>
              <input
                type="password"
                placeholder="Kata Sandi / PIN Akun"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMsg(null);
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-750 rounded-2xl text-xs text-slate-100 placeholder-slate-500 font-medium focus:outline-none focus:border-emerald-500 transition-all font-mono"
              />
            </div>
          </div>

          {/* Alert validations messages */}
          {errorMsg && (
            <div className="p-3 bg-red-950/60 border border-red-900/40 rounded-xl text-[11px] text-red-200 leading-relaxed font-semibold animate-in shake duration-250">
              ⚠️ {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-900/40 rounded-xl text-[11px] text-emerald-200 leading-relaxed font-semibold flex items-center gap-1.5 animate-in fade-in duration-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              {successMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={!email || !password}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black tracking-wider uppercase shadow-md transition disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-1"
          >
            Masuk Ke Silsilah <ChevronRight className="h-4 w-4" />
          </button>
        </form>

        <p className="text-[10px] text-slate-500 text-center leading-relaxed">
          Sistem SIKT mengamankan pembukuan kas bendahara & mutasi silsilah administrator sesuai otorisasi akun masing-masing.
        </p>

      </div>
    </div>
  );
}
