"use client";
import React from 'react';
import { MoreVertical, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { Candidate, CandidateStatus } from '../types';
import { cn } from '../lib/utils';

interface KanbanProps {
  candidates: Candidate[];
  onMoveCandidate: (id: string, nextStatus: CandidateStatus) => void;
}

export function Kanban({ candidates, onMoveCandidate }: KanbanProps) {
  const columns: { id: CandidateStatus; label: string; color: string }[] = [
    { id: 'Pendiente', label: 'Pendiente', color: 'bg-slate-100 text-slate-700' },
    { id: 'Entrevistando', label: 'Entrevistando', color: 'bg-amber-100 text-amber-700' },
    { id: 'Finalista', label: 'Finalista', color: 'bg-purple-100 text-purple-700' },
    { id: 'Contratado', label: 'Contratado', color: 'bg-emerald-100 text-emerald-700' },
    { id: 'Rechazado', label: 'Rechazado', color: 'bg-red-100 text-red-700' },
  ];

  const getNextStatus = (current: CandidateStatus): CandidateStatus | null => {
    const idx = columns.findIndex(c => c.id === current);
    return idx < columns.length - 1 ? columns[idx + 1].id : null;
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex space-x-6 overflow-x-auto pb-8 h-full scrollbar-hide">
        {columns.map((col) => {
          const colCandidates = candidates.filter(c => c.status === col.id);
          return (
            <div key={col.id} className="min-w-[300px] w-[300px] bg-slate-100/50 rounded-2xl p-4 flex flex-col border border-slate-200/50">
              <div className="flex justify-between items-center mb-6 px-2">
                  <h4 className="font-bold text-slate-700 uppercase text-[10px] tracking-widest flex items-center">
                    <span className={cn("w-2 h-2 rounded-full mr-2", 
                      col.id === 'Pendiente' ? 'bg-slate-400' : 
                      col.id === 'Entrevistando' ? 'bg-amber-500' : 
                      col.id === 'Finalista' ? 'bg-purple-500' : 
                      col.id === 'Contratado' ? 'bg-emerald-500' : 'bg-red-500'
                    )}></span>
                    {col.label}
                  </h4>
                <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold", col.color)}>
                  {colCandidates.length}
                </span>
              </div>

              <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                {colCandidates.map((c) => (
                  <motion.div
                    key={c.id}
                    layoutId={c.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all group relative"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md border border-blue-100">
                        {c.score_ia || 0}% Match
                      </span>
                      <button className="text-slate-300 hover:text-slate-600 transition-colors">
                        <MoreVertical size={14} />
                      </button>
                    </div>
                    
                    <p className="font-bold text-sm text-slate-800 mb-1">{c.nombre_completo}</p>
                    <p className="text-xs text-slate-500 mb-4">{c.id_usuario ? 'Usuario' : 'Candidato'}</p>
                    
                    <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                      <div className="flex -space-x-2">
                        {[1, 2].map(i => (
                          <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[8px] font-bold text-slate-400">
                            {i === 1 ? 'AI' : 'HR'}
                          </div>
                        ))}
                      </div>
                      
                      {getNextStatus(c.status) && (
                        <button 
                          onClick={() => onMoveCandidate(c.id, getNextStatus(c.status)!)}
                          className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center transition-colors group-hover:translate-x-1 duration-300"
                        >
                          MOVER <ChevronRight size={12} className="ml-0.5" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
                {colCandidates.length === 0 && (
                  <div className="h-32 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 text-xs font-medium">
                    Sin candidatos
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
