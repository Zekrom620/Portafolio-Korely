"use client";
import React from 'react';
import { TrendingUp, Users, Calendar, Target, CheckCircle2, FileInput, Bot } from 'lucide-react';
import { motion } from 'motion/react';
import { Candidate, User } from '../types';

interface DashboardProps {
  candidates: Candidate[];
  user: User | null;
}

export function Dashboard({ candidates, user }: DashboardProps) {
  const userName = user?.nombre || user?.nombre_usuario || user?.name || 'Usuario';
  const userRole = user?.rol || 'Postulante';
  const isRecruiter = userRole === 'Admin' || userRole === 'Gerente';
  
  const myCandidateData = candidates.find(c => c.id_usuario === user?.id_usuario);
  const hasCV = !!myCandidateData;

  if (!isRecruiter) {
    return (
      <div className="space-y-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#1e3a5f] p-8 rounded-3xl text-white shadow-xl relative overflow-hidden"
        >
          <div className="relative z-10">
            <h2 className="text-3xl font-bold mb-4">¡Hola, {userName}!</h2>
            <p className="text-blue-100 max-w-xl mb-6">Estamos analizando el mercado para traerte las mejores oportunidades. Sube tu CV en &quot;Mi Perfil&quot; para que Korely AI te empareje con tu vacante ideal.</p>
            <div className="flex space-x-4">
              <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10">
                <p className="text-xs text-blue-200 uppercase font-bold tracking-widest mb-1">Estatus del CV</p>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${hasCV ? 'bg-emerald-400' : 'bg-amber-400'}`}></div>
                  <span className="font-bold">{hasCV ? 'Digitalizado' : 'Pendiente'}</span>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10">
                <p className="text-xs text-blue-200 uppercase font-bold tracking-widest mb-1">Postulaciones</p>
                <span className="font-bold">0 Activadas</span>
              </div>
            </div>
          </div>
          <Bot className="absolute -right-8 -bottom-8 text-white/5" size={240} />
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h4 className="font-bold text-slate-800 mb-6 flex items-center">
              <TrendingUp className="mr-2 text-blue-500" size={18} /> Recomendaciones IA
            </h4>
            <p className="text-xs text-slate-500 text-center py-8 italic">Próximamente: Vacantes personalizadas basadas en tu perfil analizado.</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h4 className="font-bold text-slate-800 mb-6 flex items-center">
              <Target className="mr-2 text-indigo-500" size={18} /> Próximos Pasos
            </h4>
            <div className="space-y-4">
               <div className="flex items-center p-3 bg-slate-50 rounded-xl space-x-3">
                 <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                   <CheckCircle2 size={16} />
                 </div>
                 <span className="text-sm font-medium text-slate-700">Completar registro básico</span>
               </div>
               <div className={`flex items-center p-3 rounded-xl space-x-3 transition-all ${hasCV ? 'bg-emerald-50 border border-emerald-100' : 'bg-white border border-slate-100 shadow-sm'}`}>
                 <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${hasCV ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                   {hasCV ? <CheckCircle2 size={16} /> : '2'}
                 </div>
                 <span className={`text-sm font-bold ${hasCV ? 'text-emerald-700' : 'text-slate-800'}`}>
                   {hasCV ? 'CV analizado exitosamente' : 'Subir CV para análisis'}
                 </span>
               </div>
               <div className="flex items-center p-3 bg-white border border-slate-100 rounded-xl space-x-3 opacity-50">
                 <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center font-bold text-xs">3</div>
                 <span className="text-sm font-medium text-slate-600">Postular a 3 vacantes del sector</span>
               </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const stats = [
    { label: 'Vacantes Activas', value: '12', icon: Target, color: 'text-blue-600', bg: 'bg-blue-50', trend: '+2 este mes', trendColor: 'text-green-500' },
    { label: 'Candidatos en Proceso', value: candidates.length.toString(), icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50', trend: 'Promedio 13 por vacante', trendColor: 'text-slate-400' },
    { label: 'Entrevistas Hoy', value: '4', icon: Calendar, color: 'text-amber-600', bg: 'bg-amber-50', trend: 'Próxima a las 15:00', trendColor: 'text-slate-400' },
    { label: 'Matching Score Global', value: '74%', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50', trend: '74%', trendColor: 'text-emerald-500', isProgress: true },
  ];

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h2 className="text-3xl font-display font-bold text-slate-800">Panel de Control</h2>
        <p className="text-slate-500 font-medium">Bienvenido de vuelta, <span className="text-blue-600">{userName}</span>. Tienes 4 tareas pendientes para hoy.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={stat.bg + " p-2 rounded-lg"}>
                <stat.icon className={stat.color} size={20} />
              </div>
            </div>
            <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
            <h3 className="text-3xl font-bold text-slate-800 mt-1">{stat.value}</h3>
            {stat.isProgress ? (
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3">
                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: stat.trend }}></div>
              </div>
            ) : (
              <p className={"text-xs mt-2 font-medium " + stat.trendColor}>{stat.trend}</p>
            )}
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h4 className="font-bold text-slate-800 mb-6 flex items-center">
            <TrendingUp className="mr-2 text-blue-500" size={18} /> Actividad Reciente
          </h4>
          <div className="space-y-6">
            {[
              { name: 'Valentina Torres', action: "Avanzó a 'Entrevistado'", job: 'Periodista Digital', icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50' },
              { name: 'Nueva Vacante', action: 'Creada exitosamente', job: 'Editor Audiovisual para RRSS', icon: FileInput, color: 'text-blue-500', bg: 'bg-blue-50' },
              { name: 'Rodrigo Muñoz', action: 'Completó entrevista IA', job: 'Productor Audiovisual', icon: Target, color: 'text-amber-500', bg: 'bg-amber-50' },
            ].map((item, i) => (
              <div key={i} className="flex items-start space-x-4">
                <div className={item.bg + " " + item.color + " p-2 rounded-full"}>
                  <item.icon size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{item.name}</p>
                  <p className="text-xs text-slate-500">{item.action} en <span className="font-medium text-slate-700">{item.job}</span></p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h4 className="font-bold text-slate-800 mb-6 flex items-center">
            <Users className="mr-2 text-indigo-500" size={18} /> Candidatos Top de la Semana
          </h4>
          <div className="space-y-4">
            {candidates.slice(0, 3).map((c) => (
              <div key={c.id} className="flex justify-between items-center p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">
                    {(c.nombre_completo || 'U').split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-800">{c.nombre_completo}</p>
                    <p className="text-xs text-slate-500">{c.id_usuario ? 'Usuario' : 'Candidato'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-blue-600">{c.score_ia || 0}%</span>
                  <div className="w-16 bg-slate-100 h-1 rounded-full overflow-hidden mt-1">
                    <div className="bg-blue-600 h-full" style={{ width: `${c.score_ia || 0}%` }}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-6 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
            Ver todos los candidatos
          </button>
        </div>
      </div>
    </div>
  );
}
