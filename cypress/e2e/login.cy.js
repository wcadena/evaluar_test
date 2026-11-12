
describe('Formulario de autorregistro Evaluar', () => {

  const ruta = '/auth/autoregister/controlled/572ff080-da01-4a64-9858-897f5a8d1be9';

  beforeEach(() => {

    cy.intercept('GET', '**/auth/login/controlled/basic*').as('loginBasic');

    cy.visit(ruta);
  });

  it('Debe mostrar los campos y mantener Ingresar deshabilitado sin datos', () => {

    // Esperar el recurso solicitado por la página
    cy.wait('@loginBasic', { timeout: 30000 });

    // La página incluye formularios de escritorio y móvil: usar el visible
    cy.get('form', { timeout: 30000 })
      .filter(':visible')
      .should('have.length', 1)
      .within(() => {
        ['firstName', 'lastName', 'email', 'phoneNumber'].forEach((name) => {
          cy.get(`input[name="${name}"]`)
            .should('be.visible')
            .and('be.enabled')
            .and('have.value', '');
        });

        cy.get('input[name="email"]').should('have.attr', 'type', 'email');
        cy.get('input[name="phoneNumber"]').should('have.attr', 'type', 'tel');

        cy.get('button[role="combobox"]')
          .should('have.length', 2)
          .and('be.visible');
        cy.contains('button[role="combobox"]', 'País de residencia')
          .should('be.visible');

        cy.get('button[role="checkbox"]')
          .should('be.visible')
          .and('have.attr', 'aria-checked', 'false');
        cy.contains('Política de Privacidad y Uso de Datos').should('be.visible');

        cy.get('button[type="submit"]')
          .should('have.text', 'Ingresar')
          .and('be.visible')
          .and('be.disabled');
      });

    cy.screenshot('01-formulario-autorregistro');

  });

});
