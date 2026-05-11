import { Candidate, Vacancy } from '../types';

export const INITIAL_CANDIDATES: Candidate[] = [
  {
    id: '1',
    name: 'Valentina Torres',
    role: 'Periodista Digital',
    exp: '5 años',
    skills: ['SEO', 'Multimedia', 'Redacción'],
    score: 87,
    status: 'applied',
    strengths: 'Dominio avanzado de herramientas SEO y métricas digitales.',
    gap: 'Experiencia limitada en gestión de equipos grandes.',
    email: 'valentina.t@example.com'
  },
  {
    id: '2',
    name: 'Rodrigo Muñoz',
    role: 'Productor Audiovisual',
    exp: '3 años',
    skills: ['Edición Video', 'Adobe Premiere', 'Streaming'],
    score: 74,
    status: 'applied',
    strengths: 'Excelente manejo de post-producción y flujos de streaming en vivo.',
    gap: 'Requiere fortalecer habilidades de guionismo técnico.',
    email: 'rodrigo.m@example.com'
  },
  {
    id: '3',
    name: 'Camila Reyes',
    role: 'Community Manager',
    exp: '2 años',
    skills: ['Redes Sociales', 'Copywriting', 'Analítica'],
    score: 61,
    status: 'vetted',
    strengths: 'Alta creatividad y rapidez en respuesta a crisis de marca.',
    gap: 'Falta experiencia en pauta publicitaria compleja (Ads Manager).',
    email: 'camila.r@example.com'
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
