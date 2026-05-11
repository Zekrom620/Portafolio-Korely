"use client";
import React, { useState, useRef, useEffect } from 'react';
import { Mic, Send, Bot, User, Sparkles, Loader2, CheckCircle2, Star, Brain, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Message, Candidate } from '../types';
import { getGeminiResponse } from '../services/ai';
import { cn } from '../lib/utils';

interface InterviewProps {
  candidates: Candidate[];
}

export function Interview({ candidates }: InterviewProps) {
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isInterviewing, setIsInterviewing] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const startInterview = () => {
    if (!selectedCandidate) return;
    setIsInterviewing(true);
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: `Hola ${(selectedCandidate.nombre_completo || 'User').split(' ')[0]}, soy Korely. Gracias por tu interés en **Cipress**. Para comenzar, ¿podrías contarme sobre algún proyecto digital donde hayas tenido que usar datos para mejorar el alcance de una noticia o contenido?`,
        timestamp: Date.now()
      }
    ]);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const systemPrompt = `Eres Korely, un entrevistador de IA para Cipress. 
    Estás entrevistando a ${selectedCandidate?.nombre_completo} para un puesto en la empresa.
    Tu objetivo es detectar soft skills y episodios diferenciadores.
    Haz preguntas de seguimiento basadas en sus respuestas.
    Sé amable pero profesional.
    Si la conversación ha avanzado lo suficiente (3-4 mensajes), sugiere finalizar la entrevista.`;

    const response = await getGeminiResponse(input, systemPrompt);

    const botMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: response,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, botMsg]);
    setIsLoading(false);
  };

  const finishInterview = () => {
    setShowResult(true);
    setIsInterviewing(false);
  };

  const reset = () => {
    setSelectedCandidate(null);
    setIsInterviewing(false);
    setShowResult(false);
    setMessages([]);
  };

  if (showResult && selectedCandidate) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto space-y-6"
      >
        <div className="bg-white p-8 rounded-3xl shadow-xl border-t-8 border-blue-600 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Brain size={120} />
          </div>
          
          <div className="flex justify-between items-start mb-8">
            <div>
              <h3 className="text-2xl font-bold text-slate-800 font-display">Ficha Técnica Profesional</h3>
              <p className="text-blue-600 font-semibold mt-1">{selectedCandidate.nombre_completo}</p>
            </div>
            <div className="bg-blue-50 px-4 py-2 rounded-xl text-blue-700 font-bold text-sm border border-blue-100 shadow-sm">
              Recomendación: <span className="text-blue-800">Altamente Recomendada</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-8">
              <div>
                <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center">
                  <Brain className="mr-2 text-indigo-500" size={18} /> Soft Skills Detectadas
                </h4>
                <div className="flex flex-wrap gap-2">
                  {['Resiliencia', 'Comunicación Asertiva', 'Adaptabilidad', 'Pensamiento Analítico'].map(skill => (
                    <span key={skill} className="bg-slate-50 text-slate-700 px-4 py-1.5 rounded-full text-xs font-bold border border-slate-200 shadow-sm">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center">
                  <Star className="mr-2 text-amber-500" size={18} /> Episodio Diferenciador
                </h4>
                <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 italic text-sm text-slate-700 leading-relaxed">
                  "Lideró la cobertura digital durante una contingencia crítica en Cipress, aumentando el tráfico en 40% mediante estrategias SEO en tiempo real y coordinación de equipo remoto bajo alta presión."
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
              <h4 className="font-bold text-slate-800 mb-4 flex items-center">
                <CheckCircle2 className="mr-2 text-emerald-500" size={18} /> Resumen IA
              </h4>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                El candidato demuestra una sólida base técnica alineada a los objetivos de Cipress. Su capacidad para articular soluciones basadas en datos es excepcional.
              </p>
              <div className="space-y-3">
                <div className="flex justify-between text-xs font-bold text-slate-500 uppercase">
                  <span>Ajuste Cultural</span>
                  <span>95%</span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full" style={{ width: '95%' }}></div>
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={reset}
            className="mt-10 flex items-center text-blue-600 font-bold text-sm hover:text-blue-700 transition-colors group"
          >
            <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-1 transition-transform" /> Volver a empezar
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {!isInterviewing ? (
        <div className="bg-white p-10 rounded-3xl border border-slate-200 text-center shadow-xl">
          <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-indigo-100 shadow-inner">
            <Mic size={40} />
          </div>
          <h3 className="text-2xl font-bold text-slate-800 font-display mb-2">Simulador de Entrevista Korely</h3>
          <p className="text-slate-500 max-w-md mx-auto mb-8">
            Korely interactúa con el candidato para detectar soft skills, episodios diferenciadores y ajuste cultural mediante NLP.
          </p>
          <div className="flex flex-col md:flex-row justify-center items-center gap-4">
            <select 
              value={selectedCandidate?.id || ''}
              onChange={e => setSelectedCandidate(candidates.find(c => c.id === e.target.value) || null)}
              className="w-full md:w-64 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-medium"
            >
              <option value="">Seleccionar candidato...</option>
              {candidates.map(c => (
                <option key={c.id} value={c.id}>{c.nombre_completo} ({c.id_usuario ? 'Usuario' : 'Candidato'})</option>
              ))}
            </select>
            <button 
              onClick={startInterview}
              disabled={!selectedCandidate}
              className="w-full md:w-auto bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 active:scale-95"
            >
              Iniciar Sesión
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[600px]">
          <div className="bg-indigo-600 p-4 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mr-3 backdrop-blur-md">
                <Bot size={20} />
              </div>
              <div>
                <p className="font-bold text-sm">Entrevistando a {selectedCandidate?.nombre_completo}</p>
                <p className="text-[10px] text-indigo-200 font-medium uppercase tracking-wider">Sesión de Evaluación IA</p>
              </div>
            </div>
            <button 
              onClick={finishInterview}
              className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
            >
              Finalizar Entrevista
            </button>
          </div>
          
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={cn(
                    "p-4 rounded-2xl text-sm shadow-sm max-w-[80%]",
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-tr-none' 
                      : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                  )}>
                    {msg.content}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center space-x-2">
                  <Loader2 size={14} className="animate-spin text-indigo-600" />
                  <span className="text-xs text-slate-400 font-medium italic">Korely está procesando...</span>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t bg-white shrink-0">
            <div className="flex space-x-3">
              <input 
                type="text" 
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Escribe la respuesta del candidato..." 
                className="flex-1 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
              />
              <button 
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="bg-indigo-600 text-white w-12 h-12 rounded-xl flex items-center justify-center hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-90 disabled:opacity-50"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
