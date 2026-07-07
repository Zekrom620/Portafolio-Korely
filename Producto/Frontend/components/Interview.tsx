"use client";
import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Send, Bot, User, Sparkles, Loader2, CheckCircle2, Star, Brain, ArrowLeft, Video, VideoOff, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Message, Candidate, Vacancy } from '../types';
import { cn } from '../lib/utils';
import { apiService } from '../services/api';
import { voiceService } from '../services/voiceService';
import { geminiService } from '../services/geminiService';

interface InterviewProps {
  candidates: Candidate[];
  vacancies: Vacancy[];
  user?: any;
}

export function Interview({ candidates, vacancies, user }: InterviewProps) {
  const userRole = user?.rol || 'Postulante';
  const isRecruiter = userRole === 'Admin' || userRole === 'Gerente';

  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  useEffect(() => {
    if (user && !isRecruiter) {
      const myCandidate = candidates.find(c => c.id_usuario === user.id_usuario);
      if (myCandidate) {
        setSelectedCandidate(myCandidate);
      }
    }
  }, [user, candidates, isRecruiter]);
  const [isInterviewing, setIsInterviewing] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<any>(null);

  // Voice & Video States
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [volume, setVolume] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedMic, setSelectedMic] = useState<string>('');
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [interviewDuration, setInterviewDuration] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Timer logic for interview duration
  useEffect(() => {
    let interval: any;
    if (isInterviewing) {
      interval = setInterval(() => {
        setInterviewDuration(prev => prev + 1);
      }, 1000);
    } else {
      setInterviewDuration(0);
    }
    return () => clearInterval(interval);
  }, [isInterviewing]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Auto-scroll transcript
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, liveTranscript]);

  // Handle camera WebRTC preview
  useEffect(() => {
    if (isVideoOn && isInterviewing) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          if (videoRef.current) videoRef.current.srcObject = stream;
        })
        .catch(err => {
          console.error("Camera error:", err);
          setIsVideoOn(false);
        });
    } else {
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
    }
    return () => {
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [isVideoOn, isInterviewing]);

  // Load Microphones list
  useEffect(() => {
    const loadMics = async () => {
      const devices = await voiceService.getMicrophones();
      setMics(devices);
      if (devices.length > 0 && !selectedMic) {
        setSelectedMic(devices[0].deviceId);
      }
    };
    if (isInterviewing) {
      loadMics();
    }
  }, [isInterviewing]);

  const startInterview = async () => {
    if (!selectedCandidate) return;
    setError(null);
    
    voiceService.resetAudioChunks();
    const hasPermission = await voiceService.checkPermissions();
    if (!hasPermission) {
      setError("No se pudo acceder al micrófono. Por favor, asegúrate de dar permisos en tu navegador.");
    }

    setIsInterviewing(true);

    const myVacancy = vacancies.find(v => v.id.toString() === selectedCandidate.id_vacante?.toString());
    const positionName = myVacancy ? myVacancy.title : 'el cargo seleccionado';
    
    const greetingText = `Hola ${(selectedCandidate.nombre_completo || 'User').split(' ')[0]}, soy Korely. Gracias por tu interés en Cipress para la posición de ${positionName}. Realizaremos una breve entrevista de unos 10 minutos. ¿Podrías comenzar presentándote y contándome un poco sobre tu trayectoria profesional?`;
    
    const initialMsg: Message = {
      id: '1',
      role: 'assistant',
      content: greetingText,
      timestamp: Date.now()
    };
    setMessages([initialMsg]);

    setIsSpeaking(true);
    await voiceService.speak(greetingText);
    setIsSpeaking(false);
  };

  const streamAiResponse = async (updatedMessages: Message[]) => {
    let fullAiResponse = "";
    const aiPlaceholder: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: "",
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, aiPlaceholder]);

    try {
      const myVacancy = selectedCandidate ? vacancies.find(v => v.id.toString() === selectedCandidate.id_vacante?.toString()) : undefined;
      const vacancyInfo = myVacancy ? { title: myVacancy.title, description: myVacancy.descripcion } : undefined;

      const stream = geminiService.getResponseStream(updatedMessages, vacancyInfo);
      for await (const chunk of stream) {
        fullAiResponse += chunk;
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = {
            ...newMessages[newMessages.length - 1],
            content: fullAiResponse
          };
          return newMessages;
        });
      }
      
      setIsLoading(false);
      setIsSpeaking(true);
      await voiceService.speak(fullAiResponse);
      setIsSpeaking(false);
    } catch (e) {
      console.error(e);
      setIsLoading(false);
      setIsSpeaking(false);
    }
  };

  const handleSendText = async () => {
    if (!input.trim() || isLoading || isSpeaking) return;
    setError(null);
    setIsLoading(true);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');

    await streamAiResponse(updatedMessages);
  };

  const handleMicToggle = async () => {
    if (isSpeaking) return;
    setError(null);

    if (isRecording) {
      try {
        const transcript = voiceService.stopListening();
        setIsRecording(false);
        setVolume(0);

        if (!transcript) {
          setError("No se detectó voz. Por favor, intenta hablar de nuevo.");
          return;
        }

        const userMsg: Message = {
          id: Date.now().toString(),
          role: 'user',
          content: transcript,
          timestamp: Date.now()
        };
        const updatedMessages = [...messages, userMsg];
        setLiveTranscript('');
        setMessages(updatedMessages);
        setIsLoading(true);

        await streamAiResponse(updatedMessages);
      } catch (err) {
        console.error("Error stopping mic:", err);
        setIsRecording(false);
      }
    } else {
      try {
        setLiveTranscript('');
        setIsRecording(true);
        await voiceService.startListening(
          (v) => {
            setVolume(v);
          }, 
          (t) => {
            setLiveTranscript(t);
          }, 
          (err) => {
            console.error("SpeechRecognition error:", err);
            let errMsg = "Problema con la entrada de voz.";
            if (err === 'no-speech') {
              errMsg = "No se detectó sonido. Asegúrate de hablar claro y cerca del micrófono.";
            } else if (err === 'not-allowed') {
              errMsg = "Acceso al micrófono denegado. Permítelo en la barra de direcciones del navegador.";
            } else if (err === 'network') {
              errMsg = "Error de conexión de red para el reconocimiento de voz (servicio de Google).";
            } else if (err === 'audio-capture') {
              errMsg = "No se detectó ningún dispositivo de captura de audio (micrófono).";
            }
            setError(errMsg);
            setIsRecording(false);
            setVolume(0);
          },
          selectedMic
        );
      } catch (err: any) {
        console.error("Interview error:", err);
        let errorMessage = "Hubo un problema con el micrófono.";
        if (err === 'not-allowed' || err.name === 'NotAllowedError') {
          errorMessage = "Permiso de micrófono denegado. Por favor, habilítalo en la configuración de tu navegador.";
        } else if (err === 'no-speech') {
          errorMessage = "No se detectó voz. Por favor, intenta hablar de nuevo.";
        }
        setError(errorMessage);
        setIsRecording(false);
        setVolume(0);
      }
    }
  };

  const finishInterview = async () => {
    if (!selectedCandidate) return;
    setIsEvaluating(true);
    setIsInterviewing(false);
    
    let finalMessages = [...messages];
    
    // Stop recording and speaking if active
    if (isRecording) {
      const lastTranscript = voiceService.stopListening();
      setIsRecording(false);
      if (lastTranscript) {
        finalMessages.push({
          id: Date.now().toString(),
          role: 'user',
          content: lastTranscript,
          timestamp: Date.now()
        });
      }
      // Wait for MediaRecorder to finish writing the last chunk
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    try {
      const audioBlob = voiceService.getCombinedAudioBlob();
      const vacancyId = selectedCandidate.id_vacante?.toString() || "1";
      const result = await apiService.evaluarEntrevista(selectedCandidate.id, vacancyId, finalMessages, audioBlob);
      setEvaluationResult(result.analisis_sentimiento ? {
        score_ajuste: result.score_entrevista,
        soft_skills: result.analisis_sentimiento.soft_skills || [],
        episodio_diferenciador: result.analisis_sentimiento.episodio_diferenciador || "",
        resumen_ia: result.analisis_sentimiento.resumen_ia || ""
      } : null);
      setShowResult(true);
    } catch (error) {
      console.error("Error evaluating interview:", error);
      alert("Hubo un error al evaluar la entrevista mediante IA. Se mostrarán datos de muestra.");
      setEvaluationResult({
        score_ajuste: 85,
        soft_skills: ['Resiliencia', 'Comunicación Asertiva', 'Adaptabilidad', 'Pensamiento Analítico'],
        episodio_diferenciador: "Lideró la cobertura digital durante una contingencia crítica en Cipress, aumentando el tráfico en 40%.",
        resumen_ia: "El candidato demuestra una sólida base técnica y buena capacidad para articular soluciones basadas en datos."
      });
      setShowResult(true);
    } finally {
      setIsEvaluating(false);
    }
  };

  const reset = () => {
    setSelectedCandidate(null);
    setIsInterviewing(false);
    setShowResult(false);
    setMessages([]);
    setEvaluationResult(null);
    setIsRecording(false);
    setIsSpeaking(false);
    setLiveTranscript('');
    setError(null);
  };

  if (isEvaluating) {
    return (
      <div className="bg-slate-900 border border-slate-800 p-12 rounded-3xl text-center shadow-2xl max-w-md mx-auto flex flex-col items-center justify-center space-y-6">
        <Loader2 size={40} className="animate-spin text-blue-500" />
        <h3 className="text-xl font-bold text-white font-display">Evaluando Entrevista</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Korely AI está analizando el diálogo de la entrevista para extraer habilidades blandas, identificar episodios relevantes y estimar el ajuste cultural...
        </p>
      </div>
    );
  }

  if (showResult && selectedCandidate) {
    const score = evaluationResult?.score_ajuste || 80;
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto space-y-6"
      >
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl relative overflow-hidden text-white">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Brain size={120} />
          </div>
          
          <div className="flex justify-between items-start mb-8">
            <div>
              <h3 className="text-2xl font-bold text-white font-display">Ficha Técnica Profesional</h3>
              <p className="text-blue-400 font-semibold mt-1">{selectedCandidate.nombre_completo}</p>
            </div>
            <div className="bg-blue-500/10 px-4 py-2 rounded-xl text-blue-400 font-bold text-sm border border-blue-500/20 shadow-sm">
              Recomendación: <span className="text-blue-300">{score >= 80 ? 'Altamente Recomendada' : score >= 70 ? 'Recomendada' : 'Bajo Revisión'}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-8">
              <div>
                <h4 className="font-bold text-white border-b border-slate-800 pb-3 mb-4 flex items-center">
                  <Brain className="mr-2 text-indigo-400" size={18} /> Soft Skills Detectadas
                </h4>
                <div className="flex flex-wrap gap-2">
                  {evaluationResult?.soft_skills && evaluationResult.soft_skills.length > 0 ? (
                    evaluationResult.soft_skills.map((skill: string) => (
                      <span key={skill} className="bg-slate-800 text-slate-200 px-4 py-1.5 rounded-full text-xs font-bold border border-slate-700 shadow-sm">
                        {skill}
                      </span>
                    ))
                  ) : (
                    ['Comunicación', 'Adaptabilidad'].map(skill => (
                      <span key={skill} className="bg-slate-800 text-slate-200 px-4 py-1.5 rounded-full text-xs font-bold border border-slate-700 shadow-sm">
                        {skill}
                      </span>
                    ))
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="font-bold text-white border-b border-slate-800 pb-3 mb-4 flex items-center">
                  <Star className="mr-2 text-amber-400" size={18} /> Episodio Diferenciador
                </h4>
                <div className="bg-amber-500/5 p-4 rounded-2xl border border-amber-500/10 italic text-sm text-slate-300 leading-relaxed">
                  &quot;{evaluationResult?.episodio_diferenciador || 'No se registraron episodios específicos destacados en las respuestas del candidato.'}&quot;
                </div>
              </div>
            </div>

            <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800">
              <h4 className="font-bold text-white mb-4 flex items-center">
                <CheckCircle2 className="mr-2 text-emerald-400" size={18} /> Resumen IA
              </h4>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                {evaluationResult?.resumen_ia || 'Análisis descriptivo de la entrevista generada por la IA.'}
              </p>
              <div className="space-y-3">
                <div className="flex justify-between text-xs font-bold text-slate-500 uppercase">
                  <span>Ajuste Cultural</span>
                  <span>{score}%</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full" style={{ width: `${score}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={reset}
            className="mt-10 flex items-center text-blue-400 font-bold text-sm hover:text-blue-300 transition-colors group"
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
            Korely interactúa con el candidato por voz para detectar soft skills, episodios diferenciadores y ajuste cultural mediante IA en tiempo real.
          </p>
          <div className="flex flex-col md:flex-row justify-center items-center gap-4">
            {!isRecruiter ? (
              selectedCandidate ? (
                <div className="flex flex-col items-center gap-4">
                  <p className="text-sm font-medium text-slate-600">
                    Candidato: <span className="font-bold text-slate-800">{selectedCandidate.nombre_completo}</span>
                  </p>
                  <button 
                    onClick={startInterview}
                    className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                  >
                    Iniciar Mi Entrevista con la IA
                  </button>
                </div>
              ) : (
                <div className="text-slate-500 text-sm">
                  Por favor, completa primero tu perfil subiendo tu currículum (PDF) en la pestaña <strong className="text-indigo-600">Mi Perfil</strong> para activar el simulador de entrevista de Korely.
                </div>
              )
            ) : (
              <>
                <select 
                  value={selectedCandidate?.id || ''}
                  onChange={e => setSelectedCandidate(candidates.find(c => c.id === e.target.value) || null)}
                  className="w-full md:w-64 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-medium"
                >
                  <option value="">Seleccionar candidato...</option>
                  {candidates.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre_completo}</option>
                  ))}
                </select>
                <button 
                  onClick={startInterview}
                  disabled={!selectedCandidate}
                  className="w-full md:w-auto bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 active:scale-95"
                >
                  Iniciar Sesión
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-[#0b0f19] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[650px] text-white">
          {/* Header */}
          <div className="bg-[#111827] border-b border-slate-800 p-4 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center mr-3 border border-blue-500/20">
                <Bot size={20} />
              </div>
              <div>
                <p className="font-bold text-sm">Entrevistando a {selectedCandidate?.nombre_completo}</p>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Sesión de Evaluación IA por Voz</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-slate-400 font-mono">Tiempo: {formatTime(interviewDuration)}</span>
              <button 
                onClick={finishInterview}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border border-red-500/20"
              >
                Finalizar Entrevista
              </button>
            </div>
          </div>
          
          {/* Main Body */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_320px] overflow-hidden">
            {/* Left Area: Visualizers & Camera */}
            <div className="flex flex-col p-6 gap-6 justify-between border-r border-slate-800 bg-[#090d16]">
              {/* AI Avatar wave visualization */}
              <div className="flex-1 relative rounded-2xl overflow-hidden border border-slate-800/80 bg-slate-950 flex flex-col items-center justify-center">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#1e293b_0%,#020617_100%)] opacity-80" />
                
                <div className="relative z-10 flex flex-col items-center">
                  <div className="relative mb-6">
                    <AnimatePresence>
                      {isSpeaking && (
                        <motion.div
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1.25, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          transition={{ repeat: Infinity, duration: 2 }}
                          className="absolute inset-0 bg-blue-500/10 rounded-full blur-2xl border border-blue-500/20"
                        />
                      )}
                    </AnimatePresence>
                    <div className={cn(
                      "w-36 h-36 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center relative z-20 transition-all duration-500 shadow-[0_0_40px_rgba(59,130,246,0.15)]",
                      isSpeaking ? "scale-105 border-blue-500/50" : ""
                    )}>
                      <div className="flex gap-1 items-center h-12">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <motion.div
                            key={i}
                            animate={isSpeaking ? {
                              height: [15, 30, 45, 25, 35][i-1],
                            } : isRecording ? {
                              height: Math.max(6, (volume / 100) * 45 * (i * 0.4))
                            } : { height: 6 }}
                            transition={isSpeaking ? {
                              repeat: Infinity,
                              duration: 0.5,
                              delay: i * 0.08
                            } : { type: 'spring', stiffness: 300, damping: 20 }}
                            className="w-1 bg-blue-400 rounded-full"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-lg font-bold text-white mb-1">Korely</div>
                    <div className="text-xs text-slate-400 flex items-center gap-1.5 justify-center">
                      <span className={cn("w-1.5 h-1.5 rounded-full", isSpeaking ? "bg-emerald-500 animate-ping" : "bg-slate-600")} />
                      {isSpeaking ? 'Hablando...' : isRecording ? 'Escuchándote...' : 'Esperando...'}
                    </div>
                  </div>
                </div>
              </div>

              {/* User preview camera / Avatar */}
              <div className="h-40 flex gap-4">
                <div className="flex-1 bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 relative">
                  {isVideoOn ? (
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      muted 
                      playsInline 
                      className="w-full h-full object-cover brightness-75 scale-x-[-1]"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-950">
                      <User className="w-10 h-10 text-slate-700" />
                    </div>
                  )}
                  <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/40 px-2 py-0.5 rounded-md backdrop-blur-sm">
                    <div className={cn("w-1.5 h-1.5 rounded-full", isVideoOn ? "bg-blue-500" : "bg-slate-600")} />
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-300">Candidato</span>
                  </div>
                  <button 
                    onClick={() => setIsVideoOn(!isVideoOn)}
                    className="absolute top-3 right-3 p-1.5 bg-black/55 backdrop-blur-md rounded-lg border border-slate-850 hover:bg-slate-800 transition-colors"
                  >
                    {isVideoOn ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
                  </button>
                </div>
                
                <div className="w-40 bg-slate-950 rounded-2xl border border-slate-800 p-4 flex flex-col justify-center gap-2">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Micrófono</span>
                  <div className="flex gap-1 items-center h-8">
                    {[1, 2, 3, 4].map((i) => (
                      <motion.div
                        key={i}
                        animate={{
                          height: isRecording ? Math.max(4, (volume / 100) * 32 * (i * 0.5)) : 4
                        }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        className="w-1 bg-blue-500 rounded-full"
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-400 truncate">
                    {isRecording ? 'Escuchando voz...' : 'Mic inactivo'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Area: Real-time Transcript */}
            <div className="flex flex-col p-4 bg-[#090c13] overflow-hidden">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-3 block">
                Transcripción de la Conversación
              </span>
              
              <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin scrollbar-thumb-slate-800"
              >
                <AnimatePresence initial={false}>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-200 text-xs flex flex-col gap-2"
                    >
                      <div className="flex items-center gap-1.5 text-red-400 font-bold">
                        <MicOff size={14} />
                        <span>PROBLEMA DE AUDIO</span>
                      </div>
                      <p>{error}</p>
                    </motion.div>
                  )}
                  
                  {messages.map((msg, idx) => (
                    <motion.div
                      key={msg.id || idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex flex-col gap-1"
                    >
                      <span className={cn(
                        "text-[10px] font-bold",
                        msg.role === 'assistant' ? "text-blue-400" : "text-slate-400"
                      )}>
                        {msg.role === 'assistant' ? "Korely (AI)" : "Candidato"}
                      </span>
                      <div className="bg-slate-900/60 border border-slate-800/60 p-3 rounded-xl text-xs text-slate-200 leading-relaxed">
                        {msg.content || (msg.role === 'assistant' && <Loader2 className="w-3.5 h-3.5 animate-spin opacity-50 text-blue-400" />)}
                      </div>
                    </motion.div>
                  ))}
                  
                  {liveTranscript && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex flex-col gap-1"
                    >
                      <span className="text-[10px] font-bold text-slate-500">Candidato (Hablando...)</span>
                      <div className="bg-slate-900/30 border border-blue-500/20 p-3 rounded-xl text-xs text-slate-300 italic leading-relaxed">
                        {liveTranscript}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
          
          {/* Controls Bar at bottom */}
          <div className="p-4 bg-[#111827] border-t border-slate-800 flex items-center gap-4 shrink-0">
            {/* Mic Recording Trigger Button */}
            <button
              onClick={handleMicToggle}
              disabled={isSpeaking || isLoading}
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center transition-all border shrink-0",
                isRecording 
                  ? "bg-red-500/20 border-red-500 text-red-400 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.2)]" 
                  : "bg-slate-800 border-slate-700 text-white hover:bg-slate-700 disabled:opacity-40"
              )}
            >
              {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
            
            {/* Fallback Text Box Input */}
            <div className="flex-1 flex gap-2">
              <input 
                type="text" 
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendText()}
                disabled={isRecording || isSpeaking || isLoading}
                placeholder={isRecording ? "Grabando voz..." : "Escribe tu respuesta aquí (o habla por mic)..."} 
                className="flex-1 bg-slate-900 border border-slate-850 rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-blue-500/50 text-xs placeholder:text-slate-500 text-white disabled:opacity-40"
              />
              <button 
                onClick={handleSendText}
                disabled={isLoading || isRecording || isSpeaking || !input.trim()}
                className="bg-blue-600 hover:bg-blue-500 text-white w-12 h-12 rounded-xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-30 shrink-0"
              >
                <Send size={18} />
              </button>
            </div>
            
            {/* Mic selector if multiple mics exist */}
            {mics.length > 1 && !isRecording && (
              <div className="flex flex-col gap-0.5 shrink-0 hidden sm:flex">
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tight">Microphone:</span>
                <select
                  value={selectedMic}
                  onChange={(e) => setSelectedMic(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg text-[9px] py-1.5 px-2 outline-none w-28 truncate text-slate-300"
                >
                  {mics.map(mic => (
                    <option key={mic.deviceId} value={mic.deviceId}>
                      {mic.label || `Mic ${mic.deviceId.slice(0, 4)}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
