// ============================================================================
// File: src/features/auth/Login.tsx
// ============================================================================
import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from '@tanstack/react-router';
import { Lock, Mail, Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const signIn = useAuthStore((s) => s.signIn);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await signIn(email, password);
      // Ensure precise route targeting for TanStack Router v1
      navigate({ to: '/' as any });
    } catch (err: any) {
      if (err.message?.includes('Invalid login credentials') || err.message?.includes('invalid')) {
        setError('Invalid email or password.');
      } else {
        setError('System unavailable. Please check your network.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm p-8 bg-[#0F1117] border border-slate-800 rounded-2xl shadow-2xl">
      <h1 className="text-2xl font-black text-white mb-6 uppercase tracking-tight text-center">
        KOA<span className="text-emerald-500">Sys</span>
      </h1>
      
      <form onSubmit={handleLogin} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        <div className="relative">
          <Mail className="absolute left-3 top-3 text-slate-500" size={18} />
          <input 
            type="email" 
            placeholder="Email Address" 
            className="w-full pl-10 pr-4 py-2.5 bg-[#0A0B0E] border border-slate-800 rounded-xl text-white focus:border-emerald-500 outline-none"
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="relative">
          <Lock className="absolute left-3 top-3 text-slate-500" size={18} />
          <input 
            type={showPassword ? "text" : "password"}
            placeholder="Password" 
            className="w-full pl-10 pr-10 py-2.5 bg-[#0A0B0E] border border-slate-800 rounded-xl text-white focus:border-emerald-500 outline-none"
            onChange={(e) => setPassword(e.target.value)}
          />
          <button 
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <button 
          disabled={isLoading}
          className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {isLoading ? <Loader2 className="animate-spin" size={18} /> : 'Sign In'}
        </button>
      </form>

      {/* Compliance Footer */}
      <p className="mt-8 text-[10px] text-slate-600 text-center leading-relaxed">
        AUTHORIZED USE ONLY. Access to this system is monitored. 
        Unauthorized attempts to access this system may be subject to 
        prosecution under the Computer Misuse Act 1990.
      </p>
    </div>
  );
}