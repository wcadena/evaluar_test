import { crearSesionNuevaPorApi, verificarAreaAutenticada } from '../support/sesion-evaluar';

describe('TC-001 - Login de candidato existente por la interfaz', () => {
  const processId = '572ff080-da01-4a64-9858-897f5a8d1be9';

  beforeEach(() => {
    // Preparar una cuenta autorizada existente, sin publicar credenciales reales.
    crearSesionNuevaPorApi(processId);
    verificarAreaAutenticada(processId);
    // El login debe funcionar sin las cookies ni los tokens del autorregistro.
    cy.clearAllCookies({ log: false });
    cy.clearAllLocalStorage({ log: false });
    cy.clearAllSessionStorage({ log: false });

    cy.intercept('POST', 'https://apis.evaluar.com/candidate/auth/public/evbasic')
      .as('loginCandidato');
    // Este acceso inicial configura el contexto del proceso requerido por la web.
    cy.visit(`/auth/autoregister/controlled/${processId}`);
  });

  it('Debe iniciar sesión con una identificación válida y mostrar sus evaluaciones', () => {
    cy.get('a[href="/auth/login/controlled/basic"]', { timeout: 30000 })
      .filter(':visible').should('have.length', 1).click();
    cy.location('pathname', { timeout: 30000 })
      .should('match', /^\/(en\/)?auth\/login\/controlled\/basic$/);
    cy.get('form', { timeout: 30000 }).filter(':visible').should('have.length', 1).within(() => {
      cy.get('input[name="identification"]').should('be.visible').and('have.value', '');
      cy.get('button[type="submit"]').should('be.disabled');
    });
    cy.screenshot('TC001-01-formulario-login');

    cy.get('@candidatoApi', { log: false }).then(({ identification }) => {
      cy.get('form').filter(':visible').within(() => {
        cy.get('input[name="identification"]').type(identification, { log: false })
          .should('have.value', identification);
        cy.get('button[type="submit"]').should('be.enabled').click();
      });
      cy.wait('@loginCandidato', { timeout: 60000, log: false }).then(({ request, response }) => {
        expect(request.body.username, 'identificación válida enviada al login').to.eq(identification);
        expect(response?.statusCode, 'autenticación HTTP').to.eq(200);
        expect(Boolean(response?.body?.data?.access_token || response?.body?.access_token),
          'token nuevo recibido del login').to.eq(true);
      });
    });

    verificarAreaAutenticada(processId);
    cy.get('input[name="identification"]').should('not.exist');
    cy.getCookie('auth-token-evbasic', { log: false }).then((cookie) => {
      expect(Boolean(cookie?.value), 'cookie de acceso tras el login').to.eq(true);
    });
    cy.getCookie('auth-realm', { log: false }).should('have.property', 'value', 'evbasic');
    cy.get('main').screenshot('TC001-02-area-autenticada');
  });
});
