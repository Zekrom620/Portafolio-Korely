"use client";
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Message } from '../types';
import { apiService } from '../services/api';

export function AIAssistant() {
  const user = apiService.getCurrentUser();
  const userRole = user?.rol || 'Postulante';
  const isRecruiter = userRole === 'Admin' || userRole === 'Gerente' || user?.id_rol === 1 || user?.id_rol === 2;

  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: isRecruiter
          ? 'Hola, soy Korely. 👋 Estoy lista para ayudarte a definir la vacante ideal para **Cipress**. ¿Qué tipo de profesional estás buscando hoy?'
          : 'Hola, soy Korely, tu Coach de Entrevistas y Mentor de Carrera. 👋 Estoy lista para ayudarte a prepararte para tus entrevistas virtuales o darte retroalimentación sobre tu CV. ¿De qué te gustaría conversar hoy?',
        timestamp: Date.now()
      }
    ]);
  }, [isRecruiter]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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

    try {
      const response = await apiService.chatAssistant(input);

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.error(err);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Lo siento, hubo un problema al conectarme con el servidor de Korely.",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-12rem)] flex flex-col">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col flex-1">
        <div className="bg-[#1e3a5f] p-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mr-3 border-2 border-white/20 shadow-inner">
              <Bot className="text-white" size={20} />
            </div>
            <div>
              <p className="font-bold font-display">Korely AI</p>
              <p className="text-[10px] text-blue-200 font-medium uppercase tracking-wider">
                {isRecruiter ? 'Asistente de Perfilamiento' : 'Coach de Preparación'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            <span className="text-xs font-medium">Online</span>
          </div>
        </div>
        
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-end space-x-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-blue-600' : 'bg-white border border-slate-200'}`}>
                    {msg.role === 'user' ? <User size={14} className="text-white" /> : <Bot size={14} className="text-blue-600" />}
                  </div>
                  <div className={`p-4 rounded-2xl shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-tr-none' 
                      : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                  }`}>
                    <div className="text-sm leading-relaxed">
                      {(() => {
                        const lines = msg.content.split('\n');
                        return lines.map((line, lineIdx) => {
                          let content = line;
                          const isBullet = line.trim().startsWith('* ') || line.trim().startsWith('- ');
                          if (isBullet) {
                            content = line.trim().substring(2);
                          }
                          
                          const parts = content.split(/(\*\*.*?\*\*|\+\+.*?\+\+)/g);
                          const renderedParts = parts.map((part, index) => {
                            if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('++') && part.endsWith('++'))) {
                              return <strong key={index} className="font-bold">{part.slice(2, -2)}</strong>;
                            }
                            return part;
                          });

                          if (isBullet) {
                            return (
                              <li key={lineIdx} className="ml-4 list-disc text-sm leading-relaxed my-1">
                                {renderedParts}
                              </li>
                            );
                          }
                          return (
                            <p key={lineIdx} className="text-sm leading-relaxed min-h-[1.2em] my-1">
                              {renderedParts}
                            </p>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <div className="flex items-center space-x-2 bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-none shadow-sm">
                <Loader2 size={16} className="animate-spin text-blue-600" />
                <span className="text-xs text-slate-500 font-medium italic">Korely está analizando...</span>
              </div>
            </motion.div>
          )}
        </div>

        <div className="p-4 border-t bg-white shrink-0">
          <div className="flex space-x-3">
            <div className="relative flex-1">
              <input 
                type="text" 
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder={
                  isRecruiter 
                    ? "Ej: Busco un periodista para redes sociales..." 
                    : "Ej: ¿Cómo puedo responder a 'cuéntame sobre ti' o simula una pregunta de entrevista..."
                } 
                className="w-full border border-slate-200 rounded-full px-5 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
              />
              <Sparkles className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none" size={16} />
            </div>
            <button 
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-90 disabled:opacity-50 disabled:scale-100"
            >
              <Send size={20} />
            </button>
          </div>
          <p className="text-[10px] text-center text-slate-400 mt-3 font-medium flex items-center justify-center">
            <Sparkles size={10} className="mr-1" /> Korely utiliza procesamiento de lenguaje natural avanzado para entender contextos complejos.
          </p>
        </div>
      </div>
    </div>
  );
}
