"use client";
import { useState } from 'react';
import { MoreVertical, ChevronRight, User, Briefcase, Trash2, Mail, Phone } from 'lucide-react';
import { motion } from 'motion/react';
import { Candidate, CandidateStatus, Vacancy } from '../types';
import { cn } from '../lib/utils';

interface KanbanProps {
  candidates: Candidate[];
  vacancies: Vacancy[];
  onMoveCandidate: (id: string, nextStatus: CandidateStatus) => void;
  onDeleteCandidate: (id: string) => void;
}

export function Kanban({ candidates, vacancies, onMoveCandidate, onDeleteCandidate }: KanbanProps) {
  const [draggedOverCol, setDraggedOverCol] = useState<string | null>(null);

  const columns: { id: CandidateStatus; label: string; color: string }[] = [
    { id: 'Postulado', label: 'Postulado', color: 'bg-slate-100 text-slate-700' },
    { id: 'Entrevistado', label: 'Entrevistado', color: 'bg-amber-100 text-amber-700' },
    { id: 'Seleccionado', label: 'Seleccionado', color: 'bg-emerald-100 text-emerald-700' },
  ];

  const getNextStatus = (current: CandidateStatus): CandidateStatus | null => {
    if (current === 'Postulado') return 'Entrevistado';
    if (current === 'Entrevistado') return 'Seleccionado';
    return null;
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('¿Está seguro de que desea eliminar este candidato del proceso?')) {
      onDeleteCandidate(id);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex space-x-6 overflow-x-auto pb-8 h-full scrollbar-hide">
        {columns.map((col) => {
          const colCandidates = candidates.filter(c => c.status === col.id);
          return (
            <div 
              key={col.id} 
              className={cn(
                "min-w-[320px] w-[320px] rounded-2xl p-4 flex flex-col border transition-all duration-300",
                draggedOverCol === col.id 
                  ? "bg-blue-50/50 border-blue-400/80 shadow-lg shadow-blue-500/5 scale-[1.02]" 
                  : "bg-slate-100/50 border-slate-200/50"
              )}
              onDragOver={(e) => {
                e.preventDefault();
              }}
              onDragEnter={() => {
                setDraggedOverCol(col.id);
              }}
              onDragLeave={() => {
                setDraggedOverCol(null);
              }}
              onDrop={(e) => {
                setDraggedOverCol(null);
                const id = e.dataTransfer.getData("candidateId");
                if (id) onMoveCandidate(id, col.id);
              }}
            >
              <div className="flex justify-between items-center mb-6 px-2">
                  <h4 className="font-bold text-slate-700 uppercase text-[10px] tracking-widest flex items-center">
                    <span className={cn("w-2 h-2 rounded-full mr-2", 
                      col.id === 'Postulado' ? 'bg-slate-400' : 
                      col.id === 'Entrevistado' ? 'bg-amber-500' : 'bg-emerald-500'
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
                    draggable
                    onDragStart={(e: any) => {
                      e.dataTransfer.setData("candidateId", c.id);
                    }}
                    className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all group relative cursor-grab active:cursor-grabbing"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md border border-blue-100">
                        {c.score_ia || c.analisis_ia?.score_ia || c.match || 0}% Match
                      </span>
                      <button 
                        onClick={(e) => handleDelete(e, c.id)}
                        className="text-slate-300 hover:text-red-500 transition-colors p-1"
                        title="Eliminar del proceso"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    
                    <p className="font-bold text-sm text-slate-800 mb-1">{c.nombre_completo}</p>
                    <div className="flex flex-col space-y-2 mb-4">
                      {c.id_vacante && (
                        <p className="text-[10px] text-blue-600 font-bold flex items-center bg-blue-50 px-2 py-0.5 rounded w-fit max-w-full">
                          <Briefcase size={10} className="mr-1 shrink-0" /> 
                          <span className="truncate">{vacancies.find(v => v.id == c.id_vacante?.toString())?.title || 'Vacante #' + c.id_vacante}</span>
                        </p>
                      )}
                      
                      <div className="grid grid-cols-1 gap-1">
                        <p className="text-[10px] text-slate-500 flex items-center">
                          <Mail size={10} className="mr-1 shrink-0" /> <span className="truncate">{c.email || 'Sin correo'}</span>
                        </p>
                        <p className="text-[10px] text-slate-500 flex items-center">
                          <Phone size={10} className="mr-1 shrink-0" /> {c.telefono || 'Sin teléfono'}
                        </p>
                      </div>
                    </div>
                    
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
                          AVANZAR <ChevronRight size={12} className="ml-0.5" />
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
