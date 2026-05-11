"use client";
import React, { useState } from 'react';
import { Briefcase, MapPin, DollarSign, Plus, Trash2, Edit2, Search } from 'lucide-react';
import { motion } from 'motion/react';
import { Vacancy } from '../types';

interface VacanciesProps {
  vacancies: Vacancy[];
  onAddVacancy: (v: Vacancy) => void;
  onUpdateVacancy: (id: string, v: Partial<Vacancy>) => void;
  onDeleteVacancy: (id: string) => void;
}

export function Vacancies({ vacancies, onAddVacancy, onUpdateVacancy, onDeleteVacancy }: VacanciesProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    area: 'Contenido',
    seniority: 'Junior',
    mode: 'Remoto',
    salary: '',
    skills: '',
    descripcion: ''
  });

  const handleEdit = (v: Vacancy) => {
    setEditingId(v.id);
    setFormData({
      title: v.title,
      area: v.area || 'Contenido',
      seniority: v.seniority || 'Junior',
      mode: v.mode || 'Remoto',
      salary: v.salary || '',
      skills: v.skills?.join(', ') || '',
      descripcion: v.descripcion || ''
    });
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({
      title: '',
      area: 'Contenido',
      seniority: 'Junior',
      mode: 'Remoto',
      salary: '',
      skills: '',
      descripcion: ''
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;

    if (editingId) {
      onUpdateVacancy(editingId, {
        title: formData.title,
        descripcion: formData.descripcion,
        area: formData.area,
        mode: formData.mode,
        seniority: formData.seniority,
        salary: formData.salary,
        skills: formData.skills.split(',').map(s => s.trim()).filter(Boolean)
      });
      handleCancel();
    } else {
      const newVac: Vacancy = {
        id: '', // Will be assigned by backend
        title: formData.title,
        area: formData.area,
        mode: formData.mode,
        seniority: formData.seniority,
        salary: formData.salary,
        skills: formData.skills.split(',').map(s => s.trim()).filter(Boolean),
        createdAt: '', // Will be assigned by backend
        descripcion: formData.descripcion
      };

      onAddVacancy(newVac);
      handleCancel();
    }
  };

  return (
    <div className="space-y-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200"
      >
        <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
          <Plus className="mr-2 text-blue-500" size={20} /> {editingId ? 'Editar Vacante' : 'Crear Nueva Vacante'}
        </h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Cargo</label>
            <input 
              type="text" 
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
              placeholder="Ej: Periodista de Investigación"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Área</label>
            <select 
              value={formData.area}
              onChange={e => setFormData({...formData, area: e.target.value})}
              className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            >
              <option>Contenido</option>
              <option>Audiovisual</option>
              <option>Redes Sociales</option>
              <option>Tecnología</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Seniority</label>
            <select 
              value={formData.seniority}
              onChange={e => setFormData({...formData, seniority: e.target.value})}
              className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            >
              <option>Junior</option>
              <option>Semi-Senior</option>
              <option>Senior</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Modalidad</label>
            <select 
              value={formData.mode}
              onChange={e => setFormData({...formData, mode: e.target.value})}
              className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            >
              <option>Remoto</option>
              <option>Híbrido</option>
              <option>Presencial</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Rango Salarial</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                value={formData.salary}
                onChange={e => setFormData({...formData, salary: e.target.value})}
                className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
                placeholder="Ej: 1.2M - 1.5M"
              />
            </div>
          </div>
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Descripción de la Vacante</label>
            <textarea 
              value={formData.descripcion}
              onChange={e => setFormData({...formData, descripcion: e.target.value})}
              className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-sans text-sm" 
              rows={3} 
              placeholder="Detalla las responsabilidades y requisitos del cargo..."
            ></textarea>
          </div>
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Competencias Requeridas (separadas por comas)</label>
            <textarea 
              value={formData.skills}
              onChange={e => setFormData({...formData, skills: e.target.value})}
              className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
              rows={2} 
              placeholder="SEO, Redacción periodística, Inglés B2..."
            ></textarea>
          </div>
          <div className="md:col-span-3 flex justify-end space-x-3">
            {editingId && (
              <button 
                type="button"
                onClick={handleCancel}
                className="bg-slate-100 text-slate-600 px-8 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all active:scale-95"
              >
                Cancelar
              </button>
            )}
            <button 
              type="submit"
              className="bg-[#1e3a5f] text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-blue-900/10 active:scale-95"
            >
              {editingId ? 'Guardar Cambios' : 'Publicar con Korely'}
            </button>
          </div>
        </form>
      </motion.div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-slate-800">Vacantes Activas</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Buscar vacante..." 
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>
        <div className="space-y-4">
          {vacancies.map((v) => (
            <div key={v.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-all group">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold text-lg border border-blue-100">
                  {v.title.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{v.title}</p>
                  <div className="flex items-center space-x-3 mt-1">
                    <span className="text-xs text-slate-500 flex items-center"><Briefcase size={12} className="mr-1" /> {v.area}</span>
                    <span className="text-xs text-slate-500 flex items-center"><MapPin size={12} className="mr-1" /> {v.mode}</span>
                    <span className="text-xs text-slate-400">Publicado {new Date(v.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => handleEdit(v)}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => onDeleteVacancy(v.id)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
