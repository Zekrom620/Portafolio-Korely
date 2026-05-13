import { describe, it, expect, beforeEach, vi } from 'vitest';
import { apiService } from '../services/api';

describe('apiService - Korely logic', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('CU1: Autenticación - Gestión de Roles', () => {
    it('debe mapear correctamente el id_rol 1 a Admin', () => {
      const mockUser = { id_usuario: 1, id_rol: 1, nombre_usuario: 'AdminUser' };
      localStorage.setItem('korely_user', JSON.stringify(mockUser));
      
      const user = apiService.getCurrentUser();
      expect(user?.rol).toBe('Admin');
    });

    it('debe mapear correctamente el id_rol 2 a Gerente', () => {
      const mockUser = { id_usuario: 2, id_rol: 2, nombre_usuario: 'ManagerUser' };
      localStorage.setItem('korely_user', JSON.stringify(mockUser));
      
      const user = apiService.getCurrentUser();
      expect(user?.rol).toBe('Gerente');
    });

    it('debe mapear correctamente el id_rol 3 a Postulante', () => {
      const mockUser = { id_usuario: 3, id_rol: 3, nombre_usuario: 'CandidateUser' };
      localStorage.setItem('korely_user', JSON.stringify(mockUser));
      
      const user = apiService.getCurrentUser();
      expect(user?.rol).toBe('Postulante');
    });
  });

  describe('CU3: Carga de CV - Manejo de Errores', () => {
    it('debe lanzar un mensaje legible cuando el backend falta campos obligatorios', async () => {
      const errorResponse = {
        detail: [
          { loc: ['body', 'nombre_completo'], msg: 'Field required', type: 'missing' }
        ]
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => errorResponse
      });

      const formData = new FormData();
      
      await expect(apiService.uploadCv(formData)).rejects.toThrow('body.nombre_completo: Field required');
    });
  });
});
