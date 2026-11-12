import { faker } from '@faker-js/faker';

const dominio = 'https://candidato.evaluar.com';

export const verificarAreaAutenticada = (processId) => {
  cy.location('pathname', { timeout: 30000 })
    .should('match', new RegExp(`^/(en/)?process/${processId}/?$`));
  // Reconsultar el DOM en cada intento mientras React renderiza el contenido.
  cy.get('body', { timeout: 30000 }).should(($body) => {
    [['Evaluaciones', 'Evaluations'], ['Personalidad'], ['Teletrabajo']].forEach((textos) => {
      const coincidencias = $body.find('span').filter((_, elemento) =>
        textos.includes(elemento.textContent.replace(/\s+/g, ' ').trim())
      ).filter(':visible');
      expect(coincidencias.length, `sección visible: ${textos.join(' / ')}`).to.be.greaterThan(0);
    });
  });
  cy.get('input[name="firstName"]').should('not.exist');
  // Comprobar la ruta también después del renderizado y posibles redirecciones.
  cy.location('pathname').should('match', new RegExp(`^/(en/)?process/${processId}/?$`));
};

const verificarCookies = () => {
  cy.getCookie('auth-token-evbasic', { log: false }).then((cookie) => {
    expect(Boolean(cookie?.value), 'cookie de acceso presente').to.eq(true);
    if (cookie?.expiry) {
      expect(cookie.expiry > Date.now() / 1000, 'cookie vigente').to.eq(true);
    }
  });
  cy.getCookie('auth-realm', { log: false })
    .should('have.property', 'value', 'evbasic');
};

// La misma función setup/validate se utiliza al guardar y al restaurar.
// snapshot solo vive en memoria; nunca se escribe a archivos o variables de entorno.
export const usarSesionEvaluar = (processId) => {
  const usuario = Cypress.expose('sessionUser');
  if (!usuario) {
    throw new Error('Configura --expose sessionUser=cuenta-qa para identificar la sesión que quieres reutilizar.');
  }

  return cy.session(['evaluar', dominio, processId, usuario], () => {
    return cy.task('obtenerSesionEvaluar', JSON.stringify([dominio, processId, usuario]), { log: false }).then((snapshot) => {
    if (!snapshot) {
      throw new Error('No existe una sesión reutilizable o dejó de ser válida. Ejecuta primero login.cy.js con el mismo sessionUser en esta ejecución. No se creará otro usuario automáticamente.');
    }
    snapshot.cookies.forEach(({ name, value, ...opciones }) => {
      cy.setCookie(name, value, { ...opciones, log: false });
    });
    cy.visit(`${dominio}/en/process/${processId}`, {
      onBeforeLoad(win) {
        Object.entries(snapshot.localStorage).forEach(([key, value]) => win.localStorage.setItem(key, value));
        Object.entries(snapshot.sessionStorage).forEach(([key, value]) => win.sessionStorage.setItem(key, value));
      },
    });
    });
  }, {
    cacheAcrossSpecs: true,
    validate() {
      // Validar también el acceso real: una cookie por sí sola no prueba autenticación.
      cy.visit(`${dominio}/en/process/${processId}`);
      verificarCookies();
      verificarAreaAutenticada(processId);
    },
  });
};

export const guardarSesionActual = (processId) => {
  // Opt-in: las pruebas existentes siguen funcionando sin configuración adicional.
  if (!Cypress.expose('sessionUser')) return;

  verificarCookies();
  cy.getAllCookies({ log: false }).then((cookies) => {
    cy.window({ log: false }).then((win) => {
      const snapshot = {
        cookies,
        localStorage: { ...win.localStorage },
        sessionStorage: { ...win.sessionStorage },
      };
      const id = JSON.stringify([dominio, processId, Cypress.expose('sessionUser')]);
      cy.task('guardarSesionEvaluar', { id, snapshot }, { log: false })
        .should('eq', true);
      // Confirmar la escritura sin exponer el contenido guardado.
      cy.task('obtenerSesionEvaluar', id, { log: false }).then((guardada) => {
        expect(Boolean(guardada), 'sesión guardada en memoria').to.eq(true);
      });
      usarSesionEvaluar(processId);
    });
  });
};

export const crearSesionNuevaPorApi = (processId) => {
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

    // Identificación ficticia para poder probar luego el formulario de login.
    cy.wrap({ identification: datos.identification }, { log: false }).as('candidatoApi');

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

};
