"use client";
import React, { useState, useEffect } from 'react';
import { Sidebar, Header } from '../components/Layout';
import { Dashboard } from '../components/Dashboard';
import { Vacancies } from '../components/Vacancies';
import { AIAssistant } from '../components/AIAssistant';
import { Matching } from '../components/Matching';
import { Kanban } from '../components/Kanban';
import { Interview } from '../components/Interview';
import Auth from '../components/Auth';
import { INITIAL_CANDIDATES, INITIAL_VACANCIES } from '../constants';
import { Candidate, Vacancy, CandidateStatus, User } from '../types';
import { apiService } from '../services/api';
import { Wifi, WifiOff, ShieldAlert, LogOut } from 'lucide-react';

export default function App() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [candidates, setCandidates] = useState<Candidate[]>(INITIAL_CANDIDATES);
  const [vacancies, setVacancies] = useState<Vacancy[]>(INITIAL_VACANCIES);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const initApp = async () => {
    try {
      setLoading(true);
      const currentUser = apiService.getCurrentUser();
      setUser(currentUser);

      if (currentUser) {
        // Silently check backend availability
        const backendReady = await apiService.isBackendAvailable();
        setIsOnline(backendReady);

        // Fetch data
        const [vData, cData] = await Promise.all([
          apiService.getVacancies(),
          apiService.getCandidates()
        ]);
        
        if (vData) setVacancies(vData);
        if (cData) setCandidates(cData);
      }
    } catch (error) {
      console.error("Init Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initApp();
  }, []);

  const handleLoginSuccess = () => {
    initApp();
  };

  const handleLogout = () => {
    apiService.logout();
    setUser(null);
    setActiveSection('dashboard');
  };

  if (!user && !loading) {
    return <Auth onLoginSuccess={handleLoginSuccess} />;
  }

  const handleAddVacancy = async (v: Vacancy) => {
    const newV = await apiService.createVacancy({
      title: v.title,
      area: v.area,
      mode: v.mode,
      seniority: v.seniority,
      salary: v.salary,
      skills: v.skills,
      descripcion: v.descripcion || ""
    });
    setVacancies([newV, ...vacancies]);
  };

  const handleUpdateVacancy = async (id: string, updatedV: Partial<Vacancy>) => {
    const v = await apiService.updateVacancy(id, updatedV);
    setVacancies(vacancies.map(item => item.id === id ? { ...item, ...v } : item));
  };

  const handleDeleteVacancy = async (id: string) => {
    await apiService.deleteVacancy(id);
    setVacancies(vacancies.filter(v => v.id !== id));
  };

  const handleMoveCandidate = async (id: string, nextStatus: CandidateStatus) => {
    await apiService.updateCandidate(id, { status: nextStatus });
    setCandidates(candidates.map(c => 
      c.id === id ? { ...c, status: nextStatus } : c
    ));
  };

  const handleDeleteCandidate = async (id: string) => {
    await apiService.deleteCandidate(id);
    setCandidates(candidates.filter(c => c.id !== id));
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <Dashboard candidates={candidates} />;
      case 'vacancies':
        return (
          <Vacancies 
            vacancies={vacancies} 
            onAddVacancy={handleAddVacancy} 
            onUpdateVacancy={handleUpdateVacancy}
            onDeleteVacancy={handleDeleteVacancy} 
          />
        );
      case 'ai-assistant':
        return <AIAssistant />;
      case 'matching':
        return <Matching candidates={candidates} onDeleteCandidate={handleDeleteCandidate} />;
      case 'kanban':
        return <Kanban candidates={candidates} onMoveCandidate={handleMoveCandidate} />;
      case 'interview':
        return <Interview candidates={candidates} />;
      default:
        return <Dashboard candidates={candidates} />;
    }
  };

  const getTitle = () => {
    const titles: Record<string, string> = {
      dashboard: 'Dashboard General',
      vacancies: 'Gestión de Vacantes',
      'ai-assistant': 'Korely AI - Recruiter Assistant',
      matching: 'Matching Predictivo & NLP',
      kanban: 'Pipeline de Candidatos',
      interview: 'Entrevista Conversacional'
    };
    return titles[activeSection] || 'Dashboard';
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar 
        activeSection={activeSection} 
        setActiveSection={setActiveSection} 
        user={user}
        onLogout={handleLogout}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between pr-8 bg-white">
          <Header title={getTitle()} />
          <div className="flex items-center space-x-2 px-4 py-1 rounded-full text-[10px] font-bold">
            {isOnline ? (
              <span className="flex items-center text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                <Wifi size={12} className="mr-1" /> BACKEND CONECTADO
              </span>
            ) : (
              <span className="flex items-center text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                <ShieldAlert size={12} className="mr-1" /> MODO PROTOTIPO (LOCAL)
              </span>
            )}
          </div>
        </div>
        <main className="flex-1 overflow-y-auto p-8 scrollbar-hide">
          <div className="max-w-7xl mx-auto">
            {loading ? (
               <div className="flex flex-col items-center justify-center h-64">
                 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                 <p className="text-sm font-medium text-slate-400">Iniciando Korely AI...</p>
               </div>
            ) : renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
