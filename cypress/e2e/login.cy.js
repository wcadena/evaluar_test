
describe('TC-001 - Autenticación Evaluar', () => {

  const ruta = '/auth/autoregister/controlled/572ff080-da01-4a64-9858-897f5a8d1be9';

  it('Debe cargar la aplicación correctamente', () => {

    cy.intercept('GET', '**/auth/login/controlled/basic*').as('loginBasic');

    cy.visit(ruta);

    // Verificar que se cargó el documento
    cy.document().its('readyState')
      .should('eq', 'complete');

    // Esperar a que termine de cargar el recurso de login
    cy.wait('@loginBasic', { timeout: 30000 });

    // Obtener evidencia
    cy.screenshot('01-pantalla-inicial');

  });

});
