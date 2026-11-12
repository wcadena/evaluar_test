import { usarSesionEvaluar, verificarAreaAutenticada } from '../support/sesion-evaluar';

describe('Acceso con sesión autenticada reutilizable', () => {
  const processId = '572ff080-da01-4a64-9858-897f5a8d1be9';

  beforeEach(() => {
    usarSesionEvaluar(processId);
  });

  it('Debe abrir las evaluaciones sin repetir el autorregistro', () => {
    cy.visit(`/en/process/${processId}`);
    verificarAreaAutenticada(processId);
    cy.screenshot('03-acceso-sesion-reutilizada');
  });
});
