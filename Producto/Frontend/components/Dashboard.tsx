"use client";
import React from 'react';
import { TrendingUp, Users, Calendar, Target, CheckCircle2, FileInput } from 'lucide-react';
import { motion } from 'motion/react';
import { Candidate } from '../types';

interface DashboardProps {
  candidates: Candidate[];
}

export function Dashboard({ candidates }: DashboardProps) {
  const stats = [
    { label: 'Vacantes Activas', value: '12', icon: Target, color: 'text-blue-600', bg: 'bg-blue-50', trend: '+2 este mes', trendColor: 'text-green-500' },
    { label: 'Candidatos en Proceso', value: candidates.length.toString(), icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50', trend: 'Promedio 13 por vacante', trendColor: 'text-slate-400' },
    { label: 'Entrevistas Hoy', value: '4', icon: Calendar, color: 'text-amber-600', bg: 'bg-amber-50', trend: 'Próxima a las 15:00', trendColor: 'text-slate-400' },
    { label: 'Matching Score Global', value: '74%', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50', trend: '74%', trendColor: 'text-emerald-500', isProgress: true },
  ];

  return (
    <div className="space-y-8">
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
