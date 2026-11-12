import { faker } from '@faker-js/faker';

const generarCelularEcuador = () => {
  return `099${faker.string.numeric(7)}`;
};

describe('Formulario de autorregistro Evaluar', () => {

  const processId = '572ff080-da01-4a64-9858-897f5a8d1be9';
  const ruta = `/auth/autoregister/controlled/${processId}`;

  beforeEach(() => {

    cy.intercept('GET', '**/auth/login/controlled/basic*').as('loginBasic');
    cy.intercept({
      method: 'POST',
      hostname: 'apis.evaluar.com',
      pathname: `/candidate/process/public/controlled/${processId}/people`,
    }).as('autorregistro');
    cy.intercept({
      method: 'GET',
      hostname: 'candidato.evaluar.com',
      pathname: `/process/${processId}`,
    }).as('proceso');

    cy.visit(ruta);
  });

  const completarYEnviarFormulario = () => {
    const datos = {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email({ provider: 'example.com' }).toLowerCase(),
      phoneNumber: generarCelularEcuador(),
    };
    cy.wrap(datos, { log: false }).as('datosRegistro');

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

  };

  it('Debe responder 200 y entregar tokens al enviar el autorregistro', () => {
    completarYEnviarFormulario();

    cy.get('@datosRegistro').then((datos) => {
      cy.wait('@autorregistro', { timeout: 60000, log: false }).then(({ request, response }) => {
        cy.wrap(request.body, { log: false }).should('include', {
          identification: datos.email,
          firstName: datos.firstName,
          lastName: datos.lastName,
          country: 'EC',
          autoRegisterType: 'EMAIL',
          phoneNumber: `+593${datos.phoneNumber}`,
        });
        cy.wrap(response?.statusCode).should('eq', 200);

        const token = response?.body?.data?.token;
        // Validar presencia y formato sin mostrar los secretos en las aserciones.
        cy.wrap(Boolean(token), { log: false }).should('eq', true);
        ['access_token', 'refresh_token'].forEach((campo) => {
          const valor = token?.[campo];
          cy.wrap(typeof valor === 'string' && valor.length > 0, { log: false })
            .should('eq', true);
        });
        cy.wrap(token?.token_type).should('match', /^bearer$/i);
        cy.wrap(token?.expires_in).should('be.a', 'number').and('be.gt', 0);
        cy.wrap(token?.refresh_expires_in).should('be.a', 'number').and('be.gt', 0);
      });
    });
  });

  it('Debe recibir la respuesta del proceso y navegar al área del proceso', () => {
    completarYEnviarFormulario();

    cy.wait('@autorregistro', { timeout: 60000, log: false })
      .its('response.statusCode').should('eq', 200);

    // pathname permite cualquier valor del parámetro dinámico _rsc.
    cy.wait('@proceso', { timeout: 60000, log: false })
      .its('response.statusCode').should('eq', 200);

    cy.location('pathname', { timeout: 30000 })
      .should('eq', `/process/${processId}`);

    cy.getCookie('auth-token-evbasic', { log: false }).then((cookie) => {
      cy.wrap(Boolean(cookie?.value), { log: false }).should('eq', true);
    });
    cy.getCookie('auth-realm', { log: false })
      .should('have.property', 'value', 'evbasic');

    cy.screenshot('02-acceso-al-proceso');
  });

});
