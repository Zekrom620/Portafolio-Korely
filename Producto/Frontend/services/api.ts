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
      signal: AbortSignal.timeout(15000), // Aumentado a 15 segundos
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
    }));
  },

  createVacancy: async function(vacancy: Omit<Vacancy, 'id' | 'createdAt'>): Promise<Vacancy> {
    // El backend solo acepta titulo y descripcion segun VacanteCreate en el video.
    // Concatenamos los otros campos en la descripcion para no perder informacion.
    const descripcionCompleta = `
${vacancy.descripcion || ''}
---
Área: ${vacancy.area}
Modalidad: ${vacancy.mode}
Seniority: ${vacancy.seniority}
Salario: ${vacancy.salary}
`.trim();

    const user = this.getCurrentUser();
    const v = await handleFetch(`${API_URL}/vacantes`, {
      method: 'POST',
      body: JSON.stringify({
        titulo: vacancy.title,
        descripcion: descripcionCompleta,
        area: vacancy.area,
        id_gerente_creador: user?.id_usuario || 1 
      }),
    });
    return { 
      ...v, 
      id: v.id_vacante.toString(),
      title: v.titulo,
      mode: vacancy.mode, // Mantenemos localmente para el UI
      salary: vacancy.salary,
      createdAt: v.fecha_creacion,
      descripcion: v.descripcion
    };
  },

  updateVacancy: async (id: string, vacancy: Partial<Vacancy>): Promise<Vacancy> => {
    // El backend espera titulo y descripcion.
    const data = await handleFetch(`${API_URL}/vacantes/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        titulo: vacancy.title,
        descripcion: vacancy.descripcion,
      }),
    });
    return {
      ...data,
      id: data.id_vacante.toString(),
      title: data.titulo,
      createdAt: data.fecha_creacion,
    };
  },

  deleteVacancy: (id: string): Promise<void> => 
    handleFetch(`${API_URL}/vacantes/${id}`, { method: 'DELETE' }),

  // Candidatos
  getCandidates: async (): Promise<Candidate[]> => {
    const data = await handleFetch(`${API_URL}/candidatos`, {}, STORAGE_KEYS.CANDIDATES, INITIAL_CANDIDATES);
    return data.map((c: any) => {
      let analisis = c.cv_estructurado_analisis_ia || c.analisis_ia;
      if (typeof analisis === 'string') {
        try {
          analisis = JSON.parse(analisis);
        } catch (e) {
          console.error('Error parsing analisis_ia:', e);
        }
      }
      return {
        ...c,
        id: c.id_candidato?.toString(),
        status: c.estado || 'Postulado',
        analisis_ia: analisis,
        id_vacante: c.id_vacante
      };
    });
  },

  async updateCandidate(id: string, candidate: Partial<Candidate>): Promise<Candidate> {
    return handleFetch(`${API_URL}/candidatos/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        nombre_completo: candidate.nombre_completo,
        telefono: candidate.telefono,
        estado: candidate.status,
      }),
    });
  },

  deleteCandidate: (id: string): Promise<void> => 
    handleFetch(`${API_URL}/candidatos/${id}`, { method: 'DELETE' }),

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
  }
};
