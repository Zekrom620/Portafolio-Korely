import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Kanban } from '../components/Kanban';
import { Candidate } from '../types';

describe('Componente Kanban - CU6', () => {
  const mockCandidates: Candidate[] = [
    { id: '1', nombre_completo: 'Juan Pérez', id_usuario: 1, status: 'Postulado', match: 85, phone: '123', email: 'juan@test.com' },
    { id: '2', nombre_completo: 'Maria Garcia', id_usuario: 2, status: 'Entrevistado', match: 90, phone: '456', email: 'maria@test.com' },
  ];

  it('debe mostrar las columnas correctas segun el nuevo flujo de Korely', () => {
    render(
      <Kanban 
        candidates={mockCandidates} 
        vacancies={[]} 
        onMoveCandidate={() => {}} 
        onDeleteCandidate={() => {}} 
      />
    );
    
    expect(screen.getByText('Postulado')).toBeInTheDocument();
    expect(screen.getByText('Entrevistado')).toBeInTheDocument();
    expect(screen.getByText('Seleccionado')).toBeInTheDocument();
  });

  it('debe renderizar a los candidatos en sus columnas correspondientes', () => {
    render(
      <Kanban 
        candidates={mockCandidates} 
        vacancies={[]} 
        onMoveCandidate={() => {}} 
        onDeleteCandidate={() => {}} 
      />
    );
    
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    expect(screen.getByText('Maria Garcia')).toBeInTheDocument();
  });
});
