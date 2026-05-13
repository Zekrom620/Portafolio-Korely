'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, UserPlus, Mail, Lock, User as UserIcon, ShieldCheck, ArrowRight } from 'lucide-react';
import { apiService } from '../services/api';

interface AuthProps {
  onLoginSuccess: () => void;
}

export default function Auth({ onLoginSuccess }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    nombre_usuario: '',
    email: '',
    password: '',
    rol: 'Postulante' as 'Gerente' | 'Postulante',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        await apiService.login({ email: formData.email, password: formData.password });
      } else {
        await apiService.register(formData);
        // Automatically login after register
        await apiService.login({ email: formData.email, password: formData.password });
      }
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-100"
      >
        <div className="p-8 pb-4">
          <div className="flex justify-center mb-8">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
              <ShieldCheck className="text-white" size={24} />
            </div>
          </div>
          
          <h2 className="text-2xl font-display font-bold text-slate-900 text-center mb-2">
            {isLogin ? 'Bienvenido a Korely' : 'Crea tu cuenta'}
          </h2>
          <p className="text-slate-500 text-center text-sm mb-8">
            {isLogin 
              ? 'Ingresa tus credenciales para acceder al panel' 
              : 'Únete a la plataforma de reclutamiento inteligente'}
          </p>

          <form onSubmit={handleSubmit} className="space-x-0 space-y-4">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4"
                >
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      placeholder="Nombre completo"
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-none rounded-2xl text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                      value={formData.nombre_usuario}
                      onChange={(e) => setFormData({ ...formData, nombre_usuario: e.target.value })}
                      required={!isLogin}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="email"
                placeholder="Email corporativo"
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-none rounded-2xl text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="password"
                placeholder="Contraseña"
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-none rounded-2xl text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>

            {error && (
              <p className="text-red-500 text-xs font-medium px-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl font-bold transition-all shadow-lg shadow-blue-200 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isLogin ? 'Iniciar Sesión' : 'Registrar Cuenta'}</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex flex-col items-center">
          <p className="text-slate-500 text-sm mb-4">
            {isLogin ? '¿No tienes una cuenta?' : '¿Ya tienes una cuenta?'}
          </p>
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="flex items-center space-x-2 text-blue-600 font-bold hover:text-blue-700 transition-colors"
          >
            {isLogin ? (
              <>
                <UserPlus size={18} />
                <span>Crea una ahora</span>
              </>
            ) : (
              <>
                <LogIn size={18} />
                <span>Inicia sesión</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
