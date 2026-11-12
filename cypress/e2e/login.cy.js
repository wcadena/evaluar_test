import { faker } from '@faker-js/faker';

const generarCelularEcuador = () => {
  return `099${faker.string.numeric(7)}`;
};

describe('Formulario de autorregistro Evaluar', () => {

  const ruta = '/auth/autoregister/controlled/572ff080-da01-4a64-9858-897f5a8d1be9';

  beforeEach(() => {

    cy.intercept('GET', '**/auth/login/controlled/basic*').as('loginBasic');

    cy.visit(ruta);
  });

  it('Debe completar y enviar el autorregistro con datos Faker', () => {
    const datos = {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email({ provider: 'example.com' }).toLowerCase(),
      phoneNumber: generarCelularEcuador(),
    };

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

        Object.entries(datos).forEach(([name, value]) => {
          cy.get(`input[name="${name}"]`)
            .type(value)
            .should('have.value', value);
        });

        // Los select nativos están ocultos por los combobox de la interfaz.
        // CO y su prefijo +57 están presentes en el HTML proporcionado.
        // Seleccionar Ecuador como país de residencia
        cy.get('select').eq(0)
          .select('EC', { force: true })
          .should('have.value', 'EC');

        // Seleccionar Ecuador como prefijo telefónico
        cy.get('select').eq(1)
          .select('EC', { force: true })
          .should('have.value', 'EC');

        // Verificar que el prefijo telefónico sea +593
        cy.contains('button[role="combobox"]', '+593')
          .should('be.visible');

        cy.get('button[role="checkbox"]').click();
        cy.get('button[role="checkbox"]')
          .should('have.attr', 'aria-checked', 'true');

        cy.get('button[type="submit"]').should('be.enabled');
      });

    cy.screenshot('01-formulario-faker-completo');

    cy.get('form').filter(':visible').find('button[type="submit"]').click();

    // Pendiente: comprobar el resultado real cuando conozcamos la siguiente pantalla.

  });

});
