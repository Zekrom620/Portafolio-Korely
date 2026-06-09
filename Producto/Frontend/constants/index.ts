import { Candidate, Vacancy } from '../types';

export const INITIAL_CANDIDATES: Candidate[] = [
  {
    id: '1',
    id_usuario: 2,
    nombre_completo: 'Valentina Torres',
    email: 'valentina.t@example.com',
    status: 'Postulado',
    score_ia: 87,
    analisis_ia: {
      fortalezas: ['Dominio avanzado de herramientas SEO y métricas digitales.'],
      brechas: ['Experiencia limitada en gestión de equipos grandes.'],
      habilidades_tecnicas: ['SEO', 'Multimedia', 'Redacción']
    }
  },
  {
    id: '2',
    id_usuario: 3,
    nombre_completo: 'Rodrigo Muñoz',
    email: 'rodrigo.m@example.com',
    status: 'Postulado',
    score_ia: 74,
    analisis_ia: {
      fortalezas: ['Excelente manejo de post-producción y flujos de streaming en vivo.'],
      brechas: ['Requiere fortalecer habilidades de guionismo técnico.'],
      habilidades_tecnicas: ['Edición Video', 'Adobe Premiere', 'Streaming']
    }
  },
  {
    id: '3',
    id_usuario: 4,
    nombre_completo: 'Camila Reyes',
    email: 'camila.r@example.com',
    status: 'Entrevistado',
    score_ia: 61,
    analisis_ia: {
      fortalezas: ['Alta creatividad y rapidez en respuesta a crisis de marca.'],
      brechas: ['Falta experiencia en pauta publicitaria compleja (Ads Manager).'],
      habilidades_tecnicas: ['Redes Sociales', 'Copywriting', 'Analítica']
    }
  }
];

export const INITIAL_VACANCIES: Vacancy[] = [
  {
    id: 'v1',
    title: 'Periodista Digital Senior',
    area: 'Contenido',
    mode: 'Remoto',
    seniority: 'Senior',
    salary: '1.5M - 2.0M',
    skills: ['SEO', 'CMS', 'Periodismo de investigación'],
    createdAt: new Date().toISOString()
  }
];
