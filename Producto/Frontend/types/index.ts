export type CandidateStatus = 'Pendiente' | 'Entrevistando' | 'Finalista' | 'Contratado' | 'Rechazado';

export interface User {
  id_usuario: number;
  nombre_usuario: string;
  email: string;
  rol: 'Admin' | 'Gerente' | 'Postulante';
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Candidate {
  id: string; // Map to id_candidato
  id_usuario: number;
  nombre_completo: string;
  cv_texto?: string;
  analisis_ia?: any;
  score_ia?: number;
  telefono?: string;
  id_vacante?: number;
  status: CandidateStatus;
}

export interface Vacancy {
  id: string; // Map to id_vacante
  title: string;
  area: string;
  mode: string;
  seniority: string;
  salary: string;
  skills: string[];
  createdAt: string;
  descripcion?: string;
  id_gerente_creador?: number;
}

export interface Postulacion {
  id_postulacion: number;
  id_candidato: number;
  id_vacante: number;
  fecha_postulacion: string;
  estado: CandidateStatus;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}
