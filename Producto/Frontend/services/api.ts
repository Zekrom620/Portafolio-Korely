import { Candidate, Vacancy, User, AuthResponse } from '../types';
import { INITIAL_CANDIDATES, INITIAL_VACANCIES } from '../constants';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

const STORAGE_KEYS = {
  VACANCIES: 'korely_vacancies',
  CANDIDATES: 'korely_candidates',
  TOKEN: 'korely_token',
  USER: 'korely_user',
};

const getAuthHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.TOKEN) : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
};

const getLocalStorage = <T>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  const stored = localStorage.getItem(key);
  if (!stored) return defaultValue;
  try {
    return JSON.parse(stored);
  } catch (error) {
    console.error(`Error parsing localStorage key "${key}":`, error);
    // Si los datos están corruptos, lo mejor es limpiar esa clave para evitar futuros errores
    localStorage.removeItem(key);
    return defaultValue;
  }
};

const setLocalStorage = <T>(key: string, value: T) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

const handleFetch = async (url: string, options?: RequestInit, fallbackKey?: string, defaultData?: any) => {
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...options?.headers,
      },
      signal: options?.signal !== undefined ? options.signal : AbortSignal.timeout(15000), // Aumentado a 15 segundos
    });
    
    if (res.status === 401) {
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER);
      window.location.href = '/login';
      throw new Error('Sesión expirada');
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Error desconocido' }));
      throw new Error(error.detail || `Error ${res.status}`);
    }
    
    const data = await res.json();
    if (fallbackKey) setLocalStorage(fallbackKey, data);
    return data;
  } catch (error) {
    if (fallbackKey) return getLocalStorage(fallbackKey, defaultData);
    
    if (error instanceof Error && error.message === 'Failed to fetch') {
      throw new Error('Error de conexión o CORS: Verifica que el backend esté corriendo en el puerto 8000 y que la base de datos esté lista.');
    }
    
    throw error;
  }
};

export const apiService = {
  isBackendAvailable: async (): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/ping`, { signal: AbortSignal.timeout(1000) });
      return res.ok;
    } catch {
      return false;
    }
  },

  // Authentication
  login: async (credentials: { email: string; password: string }): Promise<AuthResponse> => {
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: 'Acceso denegado' }));
        throw new Error(error.detail || 'Error en el inicio de sesión');
      }

      const data = await res.json();
      console.log('Respuesta del servidor:', data);

      // El backend puede enviar 'user' o 'usuario' o incluso los datos directamente en el body
      const user = data.user || data.usuario || data;
      const token = data.access_token || data.token;

      // Mapeo de id_rol a rol (string) para compatibilidad con el frontend
      if (user.id_rol === 1) user.rol = 'Admin';
      else if (user.id_rol === 2) user.rol = 'Gerente';
      else if (user.id_rol === 3) user.rol = 'Postulante'; 

      if (!token) {
        throw new Error('El servidor no devolvió un token de acceso');
      }

      localStorage.setItem(STORAGE_KEYS.TOKEN, token);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      return {
        access_token: token,
        token_type: data.token_type || 'bearer',
        user: user
      };
    } catch (error) {
      if (error instanceof Error && error.message === 'Failed to fetch') {
        throw new Error('Error de conexión con el servidor (v8000). Asegúrate de que el backend y Postgres estén corriendo.');
      }
      throw error;
    }
  },

  register: async (user: any): Promise<any> => {
    // El backend espera 'nombre'.
    // Por seguridad, todas las nuevas cuentas desde el frontend son 'Postulante' (3).
    const id_rol = 3;

    const res = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: user.nombre_usuario, 
        email: user.email,
        password: user.password,
        id_rol: id_rol
      }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Error en el servidor backend' }));
      const message = Array.isArray(error.detail) 
        ? error.detail.map((d: any) => `${d.loc[1] || d.loc[0]}: ${d.msg}`).join(', ')
        : (typeof error.detail === 'string' ? error.detail : 'Error en el registro');
      throw new Error(message);
    }
    return res.json();
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
  },

  getCurrentUser: (): User | null => {
    const user = getLocalStorage<any>(STORAGE_KEYS.USER, null);
    if (user && user.id_rol) {
      if (user.id_rol === 1) user.rol = 'Admin';
      else if (user.id_rol === 2) user.rol = 'Gerente';
      else if (user.id_rol === 3) user.rol = 'Postulante';
    }
    return user;
  },

  // Vacantes
  getVacancies: async (): Promise<Vacancy[]> => {
    const data = await handleFetch(`${API_URL}/vacantes`, {}, STORAGE_KEYS.VACANCIES, INITIAL_VACANCIES);
    return data.map((v: any) => ({
      ...v,
      id: v.id_vacante?.toString(),
      title: v.titulo || 'Sin título',
      descripcion: v.descripcion || '',
      createdAt: v.fecha_creacion,
      area: v.area || 'Contenido',
      mode: v.mode || 'Remoto',
      seniority: v.seniority || 'Junior',
      salary: v.salary || '',
      skills: v.competencias || []
    }));
  },

  createVacancy: async function(vacancy: Omit<Vacancy, 'id' | 'createdAt'>): Promise<Vacancy> {
    const user = this.getCurrentUser();
    const v = await handleFetch(`${API_URL}/vacantes`, {
      method: 'POST',
      body: JSON.stringify({
        titulo: vacancy.title,
        descripcion: vacancy.descripcion || '',
        area: vacancy.area,
        mode: vacancy.mode,
        seniority: vacancy.seniority,
        salary: vacancy.salary,
        competencias: vacancy.skills || [],
        id_gerente_creador: user?.id_usuario || 1 
      }),
    });
    return { 
      ...v, 
      id: v.id_vacante.toString(),
      title: v.titulo,
      area: v.area,
      mode: v.mode,
      seniority: v.seniority,
      salary: v.salary,
      skills: v.competencias || [],
      createdAt: v.fecha_creacion,
      descripcion: v.descripcion
    };
  },

  updateVacancy: async (id: string, vacancy: Partial<Vacancy>): Promise<Vacancy> => {
    const data = await handleFetch(`${API_URL}/vacantes/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        titulo: vacancy.title,
        descripcion: vacancy.descripcion,
        area: vacancy.area,
        mode: vacancy.mode,
        seniority: vacancy.seniority,
        salary: vacancy.salary,
        competencias: vacancy.skills,
      }),
    });
    return {
      ...data,
      id: data.id_vacante.toString(),
      title: data.titulo,
      area: data.area,
      mode: data.mode,
      seniority: data.seniority,
      salary: data.salary,
      skills: data.competencias || [],
      createdAt: data.fecha_creacion,
      descripcion: data.descripcion
    };
  },

  deleteVacancy: (id: string): Promise<void> => 
    handleFetch(`${API_URL}/vacantes/${id}`, { method: 'DELETE' }),

  // Candidatos
  getCandidates: async (): Promise<Candidate[]> => {
    const data = await handleFetch(`${API_URL}/candidatos`, {}, STORAGE_KEYS.CANDIDATES, INITIAL_CANDIDATES);
    return data.map((c: any) => {
      let analisis = c.cv_estructurado || c.cv_estructurado_analisis_ia || c.analisis_ia;
      if (typeof analisis === 'string') {
        try {
          analisis = JSON.parse(analisis);
        } catch (e) {
          console.error('Error parsing analisis_ia:', e);
        }
      }

      const rawId = c.id_candidato?.toString() || c.id?.toString() || '';
      const id = rawId.includes('-') ? rawId : `${rawId}-${c.id_vacante || 1}`;
      const nombre_completo = c.nombre_completo || c.name || 'Candidato sin nombre';

      let status: 'Postulado' | 'Entrevistado' | 'Seleccionado' = 'Postulado';
      const rawStatus = c.estado || c.status;
      if (rawStatus === 'Entrevistado' || rawStatus === 'vetted') {
        status = 'Entrevistado';
      } else if (rawStatus === 'Seleccionado' || rawStatus === 'selected') {
        status = 'Seleccionado';
      }

      const score_ia = c.score_ia !== undefined && c.score_ia !== null ? c.score_ia : (c.score !== undefined ? c.score : 0);

      if (!analisis) {
        analisis = {};
      }
      if (!analisis.fortalezas && (c.strengths || c.fortalezas)) {
        analisis.fortalezas = c.strengths ? [c.strengths] : (Array.isArray(c.fortalezas) ? c.fortalezas : [c.fortalezas]);
      }
      if (!analisis.brechas && (c.gap || c.brechas)) {
        analisis.brechas = c.gap ? [c.gap] : (Array.isArray(c.brechas) ? c.brechas : [c.brechas]);
      }
      if (!analisis.habilidades_tecnicas && c.skills) {
        analisis.habilidades_tecnicas = c.skills;
      }

      return {
        ...c,
        id,
        nombre_completo,
        status,
        analisis_ia: analisis,
        id_vacante: c.id_vacante !== undefined ? c.id_vacante : 1,
        score_ia,
        entrevista: c.entrevista
      };
    });
  },

  async updateCandidate(id: string, candidate: Partial<Candidate>): Promise<Candidate> {
    const realId = id.includes('-') ? id.split('-')[0] : id;
    return handleFetch(`${API_URL}/candidatos/${realId}`, {
      method: 'PUT',
      body: JSON.stringify({
        nombre_completo: candidate.nombre_completo,
        telefono: candidate.telefono,
        estado: candidate.status,
        id_vacante: candidate.id_vacante,
      }),
    });
  },

  deleteCandidate: (id: string): Promise<void> => {
    const realId = id.includes('-') ? id.split('-')[0] : id;
    return handleFetch(`${API_URL}/candidatos/${realId}`, { method: 'DELETE' });
  },

  createPostulacion: async (idVacante: number): Promise<any> => {
    const res = await handleFetch(`${API_URL}/postulaciones`, {
      method: 'POST',
      body: JSON.stringify({ id_vacante: idVacante }),
    });
    return res;
  },

  uploadCv: async (formData: FormData): Promise<any> => {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    try {
      const res = await fetch(`${API_URL}/candidatos/upload-cv`, {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: 'Error desconocido en el servidor' }));
        console.error('Error detallado del backend:', JSON.stringify(error, null, 2));
        
        const message = Array.isArray(error.detail) 
          ? error.detail.map((d: any) => `${d.loc?.join('.') || 'error'}: ${d.msg}`).join(', ')
          : (typeof error.detail === 'string' ? error.detail : `Error ${res.status}: ${JSON.stringify(error)}`);
          
        throw new Error(message);
      }

      return res.json();
    } catch (error) {
      console.error('Error de red al subir CV:', error);
      throw error;
    }
  },

  getDashboardStats: async (): Promise<any> => {
    return handleFetch(`${API_URL}/dashboard/stats`, { method: 'GET' });
  },

  chatAssistant: async (message: string): Promise<string> => {
    const res = await handleFetch(`${API_URL}/assistant/chat`, {
      method: 'POST',
      body: JSON.stringify({ mensaje: message }),
      signal: AbortSignal.timeout(60000), // 60 segundos para chat
    });
    return res.respuesta;
  },

  shareFicha: async (candidateId: string, email: string, pdfBase64: string, candidateName: string): Promise<any> => {
    const realId = candidateId.includes('-') ? candidateId.split('-')[0] : candidateId;
    return handleFetch(`${API_URL}/candidatos/${realId}/compartir-ficha`, {
      method: 'POST',
      body: JSON.stringify({
        email: email,
        nombre_candidato: candidateName,
        pdf_base64: pdfBase64
      }),
    });
  },

  evaluarEntrevista: async (candidateId: string, vacancyId: string, messages: any[], audioBlob?: Blob | null): Promise<any> => {
    const realId = candidateId.includes('-') ? candidateId.split('-')[0] : candidateId;
    const token = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.TOKEN) : null;
    
    const formData = new FormData();
    formData.append("id_candidato", realId);
    formData.append("id_vacante", vacancyId);
    
    const mappedMessages = messages.map(m => ({
      role: m.role,
      content: m.content
    }));
    formData.append("mensajes_json", JSON.stringify(mappedMessages));
    
    if (audioBlob) {
      formData.append("archivo_audio", audioBlob, "entrevista_audio.webm");
    }
    
    try {
      const res = await fetch(`${API_URL}/entrevistas/evaluar`, {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: formData,
      });
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: 'Error al evaluar la entrevista' }));
        throw new Error(error.detail || `Error ${res.status}`);
      }
      return res.json();
    } catch (error) {
      console.error("Error in evaluarEntrevista:", error);
      throw error;
    }
  }
};
