"use client";
import React, { useState } from 'react';
import { Search, Filter, Eye, Cpu, TrendingUp, TrendingDown, Info, X, Trash2, Download, Mail, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Candidate, Vacancy } from '../types';
import { cn } from '../lib/utils';
import { apiService } from '../services/api';
import { jsPDF } from 'jspdf';

interface MatchingProps {
  candidates: Candidate[];
  vacancies: Vacancy[];
  onDeleteCandidate: (id: string) => void;
}

export function Matching({ candidates, vacancies, onDeleteCandidate }: MatchingProps) {
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('Todos');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [selectedVacancyId, setSelectedVacancyId] = useState<string>('all');
  const [sharing, setSharing] = useState(false);

  const candidateVacancy = (candidato: Candidate) => {
    if (candidato.id_vacante) {
      return vacancies.find(v => v.id == candidato.id_vacante?.toString())?.title || 'Vacante #' + candidato.id_vacante;
    }
    return 'No postulado';
  };

  const generatePDF = (candidato: Candidate, save: boolean = true): jsPDF => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const score = getDisplayScore(candidato);

    // 1. Cabecera Corporativa (Azul Oscuro / Cipress theme)
    doc.setFillColor(30, 58, 95); // #1e3a5f
    doc.rect(0, 0, 210, 45, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("KORELY AI", 15, 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("HEADHUNTER AUTÓNOMO | FICHA TÉCNICA COMPARADA", 15, 27);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 15, 34);

    // 2. Bloque de Ajuste / Score IA (caja a la derecha en la cabecera)
    doc.setFillColor(255, 255, 255, 0.15); // Blanco semi-transparente
    doc.roundedRect(140, 10, 55, 25, 4, 4, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("SCORE DE AFINIDAD", 145, 18);
    doc.setFontSize(20);
    doc.text(`${score}%`, 145, 28);

    // 3. Datos Generales del Postulante
    let y = 60;
    doc.setTextColor(33, 41, 89);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(candidato.nombre_completo, 15, y);

    y += 6;
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Contacto: ${candidato.telefono || "No especificado"} | Correo: ${candidato.email || "No especificado"}`, 15, y);
    
    // Cargo de la vacante
    y += 6;
    const vacancyTitle = candidateVacancy(candidato);
    doc.setFont("helvetica", "bold");
    doc.text(`Vacante: ${vacancyTitle}`, 15, y);

    // Separador
    y += 10;
    doc.setDrawColor(226, 232, 240);
    doc.line(15, y, 195, y);

    // 4. Habilidades Técnicas
    y += 12;
    doc.setTextColor(30, 58, 95);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("HABILIDADES TÉCNICAS DETECTADAS", 15, y);

    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    const skills = candidato.analisis_ia?.habilidades_tecnicas?.join(', ') || 'Sin habilidades analizadas.';
    const splitSkills = doc.splitTextToSize(skills, 180);
    doc.text(splitSkills, 15, y);
    y += (splitSkills.length * 5);

    // 5. Fortalezas (Match)
    y += 10;
    doc.setTextColor(16, 185, 129); // emerald-500
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("FORTALEZAS DE COMPATIBILIDAD (MATCH)", 15, y);

    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    
    const fortalezas: string[] = candidato.analisis_ia?.fortalezas || candidato.analisis_ia?.expertiz_previas || candidato.analisis_ia?.puntos_fuertes || ["No hay fortalezas registradas."];
    fortalezas.forEach((f) => {
      const splitF = doc.splitTextToSize(`• ${f}`, 180);
      doc.text(splitF, 15, y);
      y += (splitF.length * 5) + 2;
    });

    // 6. Brechas
    y += 8;
    doc.setTextColor(217, 119, 6); // amber-600
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("BRECHAS Y ASPECTOS A MEJORAR", 15, y);

    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    
    const brechas: string[] = candidato.analisis_ia?.brechas || candidato.analisis_ia?.aspectos_a_mejorar || ["Sin brechas críticas identificadas."];
    brechas.forEach((b) => {
      const splitB = doc.splitTextToSize(`• ${b}`, 180);
      doc.text(splitB, 15, y);
      y += (splitB.length * 5) + 2;
    });

    // Pie de página (Footer)
    doc.setDrawColor(226, 232, 240);
    doc.line(15, 275, 195, 275);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("Documento oficial generado de forma autónoma por Korely AI.", 15, 281);
    doc.text("Procesamiento de Lenguaje Natural (Gemini 3.5 Flash / pgvector).", 15, 285);

    if (save) {
      doc.save(`Ficha_Korely_${candidato.nombre_completo.replace(/\s+/g, '_')}.pdf`);
    }

    return doc;
  };

  const handleSendEmail = async (candidato: Candidate) => {
    const targetEmail = prompt("Ingresa el correo electrónico del gerente o reclutador destino:", "gerente@cipress.cl");
    if (!targetEmail || !targetEmail.trim()) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(targetEmail.trim())) {
      alert("Por favor, ingresa un correo electrónico válido.");
      return;
    }

    setSharing(true);
    try {
      const doc = generatePDF(candidato, false);
      const pdfBase64 = doc.output('datauristring');

      await apiService.shareFicha(candidato.id, targetEmail.trim(), pdfBase64, candidato.nombre_completo);
      alert(`¡Ficha técnica enviada con éxito a ${targetEmail}! Puedes verificar los detalles en la carpeta 'mock_emails' del backend.`);
    } catch (error) {
      console.error(error);
      alert("Ocurrió un error al enviar el correo. Verifique que el backend esté operativo.");
    } finally {
      setSharing(false);
    }
  };

  const getDisplayScore = (candidate: Candidate) => {
    if (candidate.score_ia !== undefined && candidate.score_ia !== null) return candidate.score_ia;
    if (candidate.analisis_ia?.score_ia !== undefined) return candidate.analisis_ia.score_ia;
    if (candidate.match !== undefined && candidate.match !== null) return candidate.match;
    return 0;
  };

  const filteredCandidates = candidates.filter(c => {
    const score = getDisplayScore(c);
    const candidateName = c.nombre_completo || '';

    if (selectedVacancyId !== 'all') {
      if (c.id_vacante?.toString() !== selectedVacancyId) {
        return false;
      }
    }

    const matchesSearch = candidateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.analisis_ia?.habilidades_tecnicas?.some((s: string) => s.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.id_vacante && vacancies.find(v => v.id == c.id_vacante?.toString())?.title.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (selectedFilter === 'Todos') return true;
    if (selectedFilter === 'Alto Match (>80%)') return score > 80;
    if (selectedFilter === 'Medio Match (70-80%)') return score >= 70 && score <= 80;
    if (selectedFilter === 'Bajo Match (<70%)') return score < 70;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h3 className="text-2xl font-bold text-slate-800 font-display">Matching Predictivo</h3>
        <div className="flex space-x-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Filtrar candidatos..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div className="relative">
            <select
              value={selectedVacancyId}
              onChange={e => setSelectedVacancyId(e.target.value)}
              className="bg-white border border-slate-200 px-4 py-2 pr-8 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer"
              style={{ backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`, backgroundPosition: 'right 8px center', backgroundSize: '16px', backgroundRepeat: 'no-repeat' }}
            >
              <option value="all">Todas las vacantes</option>
              {vacancies.map(v => (
                <option key={v.id} value={v.id}>{v.title}</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <button 
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors flex items-center"
            >
              <Filter size={16} className="mr-2" /> {selectedFilter}
            </button>
            {showFilterDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-10 py-1">
                {['Todos', 'Alto Match (>80%)', 'Medio Match (70-80%)', 'Bajo Match (<70%)'].map((option) => (
                  <button
                    key={option}
                    onClick={() => {
                      setSelectedFilter(option);
                      setShowFilterDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/50 border-b border-slate-200">
              <tr>
                <th className="p-4 font-semibold text-slate-600 text-xs uppercase tracking-wider">Candidato</th>
                <th className="p-4 font-semibold text-slate-600 text-xs uppercase tracking-wider">Cargo / Experiencia</th>
                <th className="p-4 font-semibold text-slate-600 text-xs uppercase tracking-wider">Vacante Aplicada</th>
                <th className="p-4 font-semibold text-slate-600 text-xs uppercase tracking-wider text-center">Score IA</th>
                <th className="p-4 font-semibold text-slate-600 text-xs uppercase tracking-wider">Habilidades Clave</th>
                <th className="p-4 font-semibold text-slate-600 text-xs uppercase tracking-wider text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCandidates.map((c) => {
                const tableScore = getDisplayScore(c);
                return (
                  <tr key={c.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold mr-3 border border-indigo-200 group-hover:scale-110 transition-transform">
                          {(c.nombre_completo || 'User').split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 block">{c.nombre_completo}</span>
                          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">ID: {c.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-slate-700 font-semibold">{c.id_usuario ? 'Usuario Registrado' : 'Candidato Externo'}</p>
                      <p className="text-xs text-slate-500">{c.telefono || 'Sin teléfono'}</p>
                    </td>
                    <td className="p-4">
                      {c.id_vacante ? (
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                           {vacancies.find(v => v.id == c.id_vacante?.toString())?.title || 'Vacante #' + c.id_vacante}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No postulado</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col items-center">
                        <span className={cn(
                          "text-sm font-bold mb-1",
                          tableScore > 80 ? 'text-emerald-600' : tableScore > 70 ? 'text-amber-600' : 'text-slate-600'
                        )}>{tableScore}%</span>
                        <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full transition-all duration-1000",
                              tableScore > 80 ? 'bg-emerald-500' : tableScore > 70 ? 'bg-amber-500' : 'bg-slate-400'
                            )} 
                            style={{ width: `${tableScore}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1.5">
                        {c.analisis_ia?.habilidades_tecnicas?.slice(0, 3).map((s: string) => (
                          <span key={s} className="bg-blue-50 text-blue-700 text-[10px] px-2 py-0.5 rounded-md border border-blue-100 font-medium">
                            {s}
                          </span>
                        ))}
                        {!c.analisis_ia?.habilidades_tecnicas && <span className="text-slate-400 text-[10px]">Sin análisis</span>}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button 
                          onClick={() => setSelectedCandidate(c)}
                          className="text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center"
                        >
                          <Eye size={14} className="mr-1.5" /> Ver Análisis
                        </button>
                        <button 
                          onClick={() => onDeleteCandidate(c.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          title="Eliminar candidato"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {selectedCandidate && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-lg rounded-3xl p-8 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
              <button 
                onClick={() => setSelectedCandidate(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-all"
              >
                <X size={20} />
              </button>

              <div className="flex items-center space-x-4 mb-8">
                <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-2xl font-bold shadow-lg shadow-indigo-600/20">
                  {(selectedCandidate.nombre_completo || 'U').split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h4 className="text-2xl font-bold text-slate-800 font-display">{selectedCandidate.nombre_completo}</h4>
                  <p className="text-indigo-600 font-medium">{selectedCandidate.id_usuario ? 'Usuario Registrado' : 'Candidato'}</p>
                </div>
              </div>

              <h5 className="text-lg font-bold mb-4 flex items-center text-slate-800">
                <Cpu className="mr-2 text-indigo-600" size={20} /> Análisis de Afinidad Korely IA
              </h5>
              
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-2xl">
                  <p className="text-xs font-bold text-emerald-700 uppercase mb-2 flex items-center">
                    <TrendingUp size={14} className="mr-1" /> Fortalezas (Match)
                  </p>
                  <ul className="text-sm text-slate-700 leading-relaxed list-disc list-inside">
                    {selectedCandidate.analisis_ia?.fortalezas?.map((f: string, i: number) => (
                      <li key={i}>{f}</li>
                    )) || selectedCandidate.analisis_ia?.expertiz_previas?.map((f: string, i: number) => (
                      <li key={i}>{f}</li>
                    )) || selectedCandidate.analisis_ia?.puntos_fuertes?.map((f: string, i: number) => (
                      <li key={i}>{f}</li>
                    )) || <li>No hay fortalezas registradas.</li>}
                  </ul>
                </div>
                
                <div className="p-5 bg-amber-50 border border-amber-100 rounded-2xl">
                  <p className="text-xs font-bold text-amber-700 uppercase mb-2 flex items-center">
                    <TrendingDown size={14} className="mr-1" /> Análisis Detallado / Brechas
                  </p>
                  <ul className="text-sm text-slate-700 leading-relaxed list-disc list-inside">
                    {selectedCandidate.analisis_ia?.brechas?.map((b: string, i: number) => (
                      <li key={i}>{b}</li>
                    )) || selectedCandidate.analisis_ia?.aspectos_a_mejorar?.map((b: string, i: number) => (
                      <li key={i}>{b}</li>
                    )) || (selectedCandidate.analisis_ia?.mensaje ? <li>{selectedCandidate.analisis_ia.mensaje}</li> : <li>Análisis generado por Korely AI.</li>)}
                  </ul>
                </div>
                
                <div className="p-5 bg-blue-50 border border-blue-100 rounded-2xl">
                  <p className="text-xs font-bold text-blue-700 uppercase mb-2 flex items-center">
                    <Info size={14} className="mr-1" /> Habilidades Técnicas Detectadas
                  </p>
                  <div className="flex flex-wrap gap-2 text-sm text-slate-700">
                    {selectedCandidate.analisis_ia?.habilidades_tecnicas?.join(', ') || 'N/A'}
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Score Final IA</p>
                    <TrendingUp size={14} className="text-emerald-500" />
                  </div>
                  <div className="flex items-center">
                    <span className="text-2xl font-bold text-slate-800 mr-2">{getDisplayScore(selectedCandidate)}/100</span>
                    <div className="flex space-x-0.5">
                      {[10,30,50,70,90].map(i => (
                        <div key={i} className={cn("w-3 h-5 rounded-sm", getDisplayScore(selectedCandidate) >= i ? "bg-emerald-500" : "bg-slate-200")}></div>
                      ))}
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 italic">Análisis realizado mediante el modelo Gemini Pro de Korely AI.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-8">
                <button 
                  onClick={() => generatePDF(selectedCandidate)}
                  className="flex items-center justify-center bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-900/10 active:scale-95 text-xs"
                >
                  <Download size={14} className="mr-1.5" /> Descargar PDF
                </button>
                <button 
                  onClick={() => handleSendEmail(selectedCandidate)}
                  disabled={sharing}
                  className="flex items-center justify-center bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 disabled:bg-indigo-400 transition-all shadow-md shadow-indigo-900/10 active:scale-95 text-xs"
                >
                  {sharing ? (
                    <>
                      <Loader2 size={14} className="animate-spin mr-1.5" /> Enviando...
                    </>
                  ) : (
                    <>
                      <Mail size={14} className="mr-1.5" /> Compartir Ficha
                    </>
                  )}
                </button>
              </div>

              <button 
                onClick={() => setSelectedCandidate(null)}
                className="mt-3 w-full bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all active:scale-95 text-xs"
              >
                Cerrar Análisis
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
