"use client";
import React, { useState } from 'react';
import { User, Mail, Phone, FileText, Upload, CheckCircle2, AlertCircle, Loader2, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User as UserType } from '../types';
import { apiService } from '../services/api';

interface UserProfileProps {
  user: UserType | null;
  candidates?: any[];
  onRefresh?: () => Promise<any>;
}

export function UserProfile({ user, candidates = [], onRefresh }: UserProfileProps) {
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [cvData, setCvData] = useState<any>(null);

  // Cargar datos existentes del candidato si existen en la lista de candidatos
  React.useEffect(() => {
    if (user && candidates.length > 0) {
      const existing = candidates.find(c => c.id_usuario === user.id_usuario);
      if (existing) {
        console.log('Cargando CV existente del usuario:', existing.id);
        setCvData(existing);
      }
    }
  }, [user, candidates]);
  const userName = user?.nombre_usuario || user?.nombre || user?.name || 'Usuario';
  const [profileData, setProfileData] = useState({
    nombre_usuario: userName,
    email: user?.email || '',
    telefono: (user as any)?.telefono || '',
  });

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
  };

  const saveProfile = async () => {
    setIsEditing(false);
    
    // Si tenemos ID de candidato, actualizamos en el backend
    const idCandidato = user?.id_candidato || (user as any)?.id;
    
    if (idCandidato) {
      try {
        await apiService.updateCandidate(idCandidato.toString(), {
          nombre_completo: profileData.nombre_usuario,
          telefono: profileData.telefono,
        });
        setMessage({ type: 'success', text: 'Perfil actualizado exitosamente en el servidor' });
      } catch (error: any) {
        setMessage({ type: 'error', text: 'Error al actualizar perfil en el servidor: ' + error.message });
      }
    } else {
      console.log('Guardando perfil localmente (sin id_candidato):', profileData);
      setMessage({ type: 'success', text: 'Perfil actualizado localmente' });
    }
    
    setTimeout(() => setMessage(null), 3000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      console.log('Archivo seleccionado:', file.name, file.size, file.type);
      setCvFile(file);
      setMessage(null);
    }
  };

  const handleUpload = async () => {
    if (!cvFile) return;

    setUploading(true);
    setMessage(null);
    console.log('Iniciando subida de CV:', cvFile.name);

    const formData = new FormData();
    formData.append('nombre_completo', profileData.nombre_usuario);
    formData.append('telefono', profileData.telefono || 'Sin teléfono');
    formData.append('archivo_cv', cvFile);

    try {
      const result = await apiService.uploadCv(formData);
      console.log('Resultado de subida de CV:', result);
      setMessage({ type: 'success', text: 'CV subido y procesado exitosamente por Korely AI' });
      
      // Esperamos un momento para que el procesamiento asíncrono termine en el backend
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Refrescamos globalmente los candidatos
      if (onRefresh) {
        const data = await onRefresh();
        const myCandidate = data.cData?.find((c: any) => c.id_usuario === user?.id_usuario);
        if (myCandidate) {
          setCvData(myCandidate);
        } else {
          setCvData({ message: result });
        }
      } else {
        // Fallback: refrescamos localmente
        const allCandidates = await apiService.getCandidates();
        const myCandidate = allCandidates.find(c => c.id_usuario === user?.id_usuario);
        if (myCandidate) {
          setCvData(myCandidate);
        } else {
          setCvData({ message: result });
        }
      }
    } catch (error: any) {
      console.error('Error al subir CV:', error);
      setMessage({ type: 'error', text: error.message || 'Error al subir el CV. Verifica la conexión con el backend.' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Profile Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-center md:items-start gap-8"
      >
        <div className="w-24 h-24 bg-blue-600 rounded-3xl flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-blue-200">
          {(userName || 'U')[0].toUpperCase()}
        </div>
        <div className="flex-1 text-center md:text-left">
          {isEditing ? (
            <div className="space-y-3 mb-4">
              <input 
                name="nombre_usuario"
                value={profileData.nombre_usuario}
                onChange={handleProfileChange}
                className="text-2xl font-bold text-slate-900 border-b border-blue-500 outline-none w-full bg-transparent"
              />
              <p className="text-blue-600 font-medium">{user?.rol}</p>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-slate-900 mb-1">{userName}</h2>
              <p className="text-blue-600 font-medium mb-4">{user?.rol}</p>
            </>
          )}
          
          <div className="flex flex-wrap justify-center md:justify-start gap-4">
            <div className="flex items-center text-slate-500 text-sm">
              <Mail size={16} className="mr-2" />
              {isEditing ? (
                <input 
                  name="email"
                  value={profileData.email}
                  onChange={handleProfileChange}
                  className="border-b border-slate-200 outline-none bg-transparent"
                />
              ) : user?.email}
            </div>
            <div className="flex items-center text-slate-500 text-sm">
              <Phone size={16} className="mr-2" />
              {isEditing ? (
                <input 
                  name="telefono"
                  value={profileData.telefono}
                  onChange={handleProfileChange}
                  className="border-b border-slate-200 outline-none bg-transparent"
                  placeholder="Tu teléfono"
                />
              ) : (profileData.telefono || 'No registrado')}
            </div>
          </div>
        </div>
        <button 
          onClick={isEditing ? saveProfile : () => setIsEditing(true)}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
            isEditing ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
          }`}
        >
          {isEditing ? 'Guardar Cambios' : 'Editar Perfil'}
        </button>
      </motion.div>

      {/* CV Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100"
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-bold text-slate-900 mb-1 flex items-center">
              <FileText className="mr-2 text-blue-500" /> Mi Curriculum Vitae
            </h3>
            <p className="text-slate-500 text-sm">Sube tu CV para que nuestra IA te ayude a encontrar la mejor vacante</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div 
              className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center transition-all ${
                cvFile ? 'border-blue-200 bg-blue-50/50' : 'border-slate-200 hover:border-blue-400 bg-slate-50/30'
              }`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${
                cvFile ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
              }`}>
                <Upload size={24} />
              </div>
              <p className="text-sm font-bold text-slate-700 mb-1">
                {cvFile ? cvFile.name : 'Selecciona tu CV (PDF)'}
              </p>
              <p className="text-xs text-slate-500 mb-6 font-mono text-center px-4">
                {cvFile ? `${(cvFile.size / 1024 / 1024).toFixed(2)} MB` : 'Sube tu archivo para procesarlo'}
              </p>
              
              <input 
                type="file" 
                id="cv-upload" 
                className="hidden" 
                accept=".pdf,.doc,.docx" 
                onChange={handleFileChange}
              />
              <label 
                htmlFor="cv-upload" 
                className="px-6 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:border-blue-500 hover:text-blue-600 transition-all cursor-pointer shadow-sm"
              >
                Elegir Archivo
              </label>
            </div>

            <button 
              onClick={handleUpload}
              disabled={!cvFile || uploading}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center space-x-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Procesando con la IA...</span>
                </>
              ) : (
                <>
                  <Bot size={20} />
                  <span>Digitalizar CV con Korely AI</span>
                </>
              )}
            </button>

            <AnimatePresence>
              {message && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`p-4 rounded-xl flex items-start space-x-3 ${
                    message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                  }`}
                >
                  {message.type === 'success' ? <CheckCircle2 size={18} className="mt-0.5" /> : <AlertCircle size={18} className="mt-0.5" />}
                  <p className="text-xs font-medium">{message.text}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
            <h4 className="text-xs uppercase tracking-widest font-bold text-slate-400 mb-4">Análisis de la IA</h4>
            {cvData ? (
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Nombre Extraído</p>
                  <p className="text-sm font-bold text-slate-800">{cvData.nombre_completo || cvData.nombre || 'No detectado'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Score de Matching</p>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-blue-500 h-full transition-all duration-1000" 
                        style={{ width: `${(cvData.score_ia || 85)}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-bold text-blue-600">{cvData.score_ia || 85}%</span>
                  </div>
                </div>
                {cvData.analisis_ia && (
                  <div className="pt-2">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Análisis Detallado</p>
                    <p className="text-[10px] text-slate-600 leading-relaxed max-h-32 overflow-y-auto">
                      {typeof cvData.analisis_ia === 'string' ? cvData.analisis_ia : JSON.stringify(cvData.analisis_ia)}
                    </p>
                  </div>
                )}
                <div className="pt-2">
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Estado en Base</p>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold">
                    {cvData.estado || 'Activo'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <Bot className="text-slate-200 mb-2" size={48} />
                <p className="text-xs text-slate-400 px-4">Sube tu CV para ver el análisis de competencias y el score predictivo.</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
