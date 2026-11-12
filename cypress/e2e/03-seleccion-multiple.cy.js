import { crearSesionNuevaPorApi, verificarAreaAutenticada } from '../support/sesion-evaluar';
import { abrirSeleccionMultiple, completarSeleccionMultiple } from '../support/seleccion-multiple-evaluar';

describe('TC-003 - Evaluación de opción múltiple Teletrabajo', () => {
  const processId = '572ff080-da01-4a64-9858-897f5a8d1be9';

  beforeEach(() => {
    // Un único candidato nuevo por prueba, usando el helper existente.
    crearSesionNuevaPorApi(processId);
    verificarAreaAutenticada(processId);
    cy.intercept('POST', 'https://apis.evaluar.com/evaluation-web/answers')
      .as('guardarSeleccion');
    cy.intercept('GET', 'https://apis.evaluar.com/evaluation-web/evaluations/*/check')
      .as('finalizarTeletrabajo');
  });

  it('Debe responder, avanzar y finalizar Teletrabajo', () => {
    abrirSeleccionMultiple(processId);
    cy.get('button[aria-label="Previous"]').should('be.disabled');
    cy.get('button[aria-label="Next"]').should('be.disabled');
    cy.screenshot('TC003-01-evaluacion-inicial');

    completarSeleccionMultiple();

    cy.get('@evaluacionTeletrabajo').then((evaluationId) => {
      cy.wait('@finalizarTeletrabajo', { timeout: 60000, log: false }).then(({ response }) => {
        expect(response?.statusCode, 'comprobación de finalización HTTP').to.eq(200);
        expect(response.body.data.id, 'evaluación finalizada').to.eq(evaluationId);
        expect(response.body.data.status.Name, 'estado final del backend').to.eq('FINISHED');
      });
    });
    cy.contains('You completed the test Teletrabajo', { timeout: 30000 }).should('be.visible');
    cy.get('[role="radiogroup"]').should('not.exist');
    cy.get('[role="checkbox"]').should('not.exist');
    cy.get('button[aria-label="Next"]').should('not.exist');
    cy.screenshot('TC003-04-resultado-final');
  });
});
