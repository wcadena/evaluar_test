import { usarSesionEvaluar, verificarAreaAutenticada, crearSesionNuevaPorApi } from '../support/sesion-evaluar';


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

// Suite separada para no ejecutar el beforeEach de restauración de sesión.
describe('Acceso con token nuevo desde la API', () => {
  const processId = '572ff080-da01-4a64-9858-897f5a8d1be9';

  it('Debe crear un autorregistro por API y acceder con el token recibido', () => {
    crearSesionNuevaPorApi(processId);

    // El acceso real determina si el token del POST basta para autenticar la web.
    verificarAreaAutenticada(processId);
    cy.screenshot('04-acceso-token-nuevo-api');
  });
});
