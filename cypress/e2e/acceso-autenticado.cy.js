import { usarSesionEvaluar, verificarAreaAutenticada } from '../support/sesion-evaluar';
import { faker } from '@faker-js/faker';

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
    const datos = {
      identification: faker.internet.email({ provider: 'example.com' }).toLowerCase(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      country: 'EC',
      autoRegisterType: 'EMAIL',
      phoneNumber: `+593099${faker.string.numeric(7)}`,
      termsAndConditions: [{
        name: 'PRIVACY_POLICIES',
        date: new Date().toISOString(),
        version: 1,
        link: 'https://www.evaluar.com/politica-de-proteccion-de-datos-evaluar-v1',
      }],
    };

    cy.request({
      method: 'POST',
      url: `https://apis.evaluar.com/candidate/process/public/controlled/${processId}/people`,
      headers: {
        Accept: 'application/json; charset=utf-8',
        'Accept-Language': 'es',
        Origin: 'https://candidato.evaluar.com',
        Referer: 'https://candidato.evaluar.com/',
      },
      body: datos,
      timeout: 60000,
      retryOnNetworkFailure: false,
      log: false,
    }).then(({ status, body }) => {
      expect(status, 'autorregistro HTTP').to.eq(200);
      const token = body?.data?.token;
      ['access_token', 'refresh_token'].forEach((campo) => {
        expect(typeof token?.[campo] === 'string' && token[campo].length > 0,
          `${campo} recibido`).to.eq(true);
      });
      expect(token.token_type.toLowerCase()).to.eq('bearer');
      expect(token.expires_in).to.be.a('number').and.be.greaterThan(0);

      const opcionesCookie = {
        domain: 'candidato.evaluar.com',
        path: '/',
        secure: true,
        expiry: Math.floor(Date.now() / 1000) + token.expires_in,
        log: false,
      };
      cy.setCookie('auth-token-evbasic', token.access_token, opcionesCookie);
      cy.setCookie('auth-realm', 'evbasic', opcionesCookie);

      // Claves verificadas en el cliente de Evaluar: cookies para el middleware
      // y usuario OIDC + realm para las peticiones autenticadas del navegador.
      cy.visit(`/en/process/${processId}`, {
        onBeforeLoad(win) {
          win.localStorage.setItem(
            'oidc.user:https://auth.evaluar.com/auth/realms/evbasic:ev-candidate',
            JSON.stringify({
              access_token: token.access_token,
              refresh_token: token.refresh_token,
              token_type: token.token_type,
              scope: token.scope || '',
              session_state: token.session_state,
              expires_at: opcionesCookie.expiry,
              profile: {},
            })
          );
          win.localStorage.setItem('persisted-bound-store', JSON.stringify({
            state: { realm: 'evbasic' },
            version: 0,
          }));
        },
      });
    });

    // El acceso real determina si el token del POST basta para autenticar la web.
    verificarAreaAutenticada(processId);
    cy.screenshot('04-acceso-token-nuevo-api');
  });
});
