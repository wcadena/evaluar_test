import { crearSesionNuevaPorApi, verificarAreaAutenticada } from '../support/sesion-evaluar';
import { abrirMatriz, completarMatrices } from '../support/matriz-evaluar';

describe('TC-002 - Evaluación matricial Personalidad', () => {
  const processId = '572ff080-da01-4a64-9858-897f5a8d1be9';

  beforeEach(() => {
    // Candidato nuevo: no responde evaluaciones de una cuenta real o reutilizada.
    crearSesionNuevaPorApi(processId);
    verificarAreaAutenticada(processId);
    cy.intercept('POST', 'https://apis.evaluar.com/evaluation-web/answers/matrix')
      .as('guardarMatriz');
    cy.intercept('GET', 'https://apis.evaluar.com/evaluation-web/evaluations/*/check')
      .as('comprobarFinalizacion');
  });

  it('Debe responder cada matriz, avanzar y finalizar Personalidad', () => {
    abrirMatriz(processId);
    cy.contains('button', /^Next$/).should('be.disabled');
    cy.screenshot('TC002-01-evaluacion-matricial');

    completarMatrices();

    cy.wait('@comprobarFinalizacion', { timeout: 60000, log: false })
      .its('response.statusCode').should('eq', 200);
    cy.contains('You completed the test Personalidad', { timeout: 30000 })
      .should('be.visible');
    cy.get('[role="radiogroup"]').should('not.exist');
    cy.screenshot('TC002-04-resultado-final');
  });
});
