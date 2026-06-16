"use client";
import React from 'react';
import { 
  LayoutDashboard, 
  Briefcase, 
  Bot, 
  UserCheck, 
  Columns, 
  Mic, 
  Plus, 
  User,
  Brain,
  LogOut
} from 'lucide-react';
import { cn } from '../lib/utils';

import { apiService } from '../services/api';
import { User as UserType } from '../types';

interface SidebarProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
  user: UserType | null;
  onLogout: () => void;
}

export function Sidebar({ activeSection, setActiveSection, user, onLogout }: SidebarProps) {
  const userRole = user?.rol || 'Postulante';
  const isRecruiter = userRole === 'Admin' || userRole === 'Gerente' || user?.id_rol === 1 || user?.id_rol === 2;

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'vacancies', label: 'Vacantes', icon: Briefcase },
    { id: 'ai-assistant', label: 'Korely Assistant', icon: Bot },
    ...(!isRecruiter ? [
      { id: 'profile', label: 'Mi Perfil', icon: User },
      { id: 'interview', label: 'Entrevista IA', icon: Mic }
    ] : []),
    ...(isRecruiter ? [
      { id: 'matching', label: 'Matching & Base', icon: UserCheck },
      { id: 'kanban', label: 'Pipeline Kanban', icon: Columns },
    ] : []),
  ];

  const getInitials = (name: string | undefined | null) => {
    if (!name || typeof name !== 'string') return 'U';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return 'U';
    return parts.map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const userName = user?.nombre_usuario || (user as any)?.nombre || (user as any)?.name || 'Usuario';

  return (
    <aside className="w-64 bg-[#1e3a5f] text-white flex flex-col h-full shrink-0">
      <div className="p-6">
        <h1 className="text-2xl font-display font-bold tracking-tighter flex items-center">
          <Brain className="mr-2 text-blue-400" size={28} /> Korely
        </h1>
        <p className="text-[10px] uppercase tracking-widest text-blue-300 mt-1 font-medium">Intelligent Recruitment AI</p>
      </div>
      
      <nav className="flex-1 mt-4">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            className={cn(
              "w-full flex items-center px-6 py-3 transition-all duration-200 hover:bg-white/5 text-slate-300 text-left",
              activeSection === item.id && "bg-white/10 border-l-4 border-blue-500 text-white font-medium"
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="ml-3">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-6 bg-black/20">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold">
            {getInitials(userName)}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold truncate">{userName}</p>
            <p className="text-[10px] text-blue-300 truncate">{userRole}</p>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="flex items-center text-xs text-slate-400 hover:text-white transition-colors"
        >
          <LogOut size={14} className="mr-2" /> Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}

interface HeaderProps {
  title: string;
  user: UserType | null;
  setActiveSection: (section: string) => void;
}

export function Header({ title, user, setActiveSection }: HeaderProps) {
  const userRole = user?.rol || 'Postulante';
  const isRecruiter = userRole === 'Admin' || userRole === 'Gerente' || user?.id_rol === 1 || user?.id_rol === 2;

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
      <h2 className="text-lg font-semibold text-slate-700 font-display">{title}</h2>
      <div className="flex items-center space-x-4">
        {isRecruiter && (
          <button 
            onClick={() => setActiveSection('vacancies')}
            className="bg-blue-50 text-blue-600 px-4 py-2 rounded-full text-sm font-medium hover:bg-blue-100 transition-colors flex items-center"
          >
            <Plus size={16} className="mr-1" /> Nueva Vacante
          </button>
        )}
        <div 
          onClick={() => setActiveSection(isRecruiter ? 'dashboard' : 'profile')}
          className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer"
        >
          <User size={20} />
        </div>
      </div>
    </header>
  );
}
