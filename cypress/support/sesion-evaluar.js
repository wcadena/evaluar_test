const dominio = 'https://candidato.evaluar.com';

export const verificarAreaAutenticada = (processId) => {
  cy.location('pathname', { timeout: 30000 })
    .should('match', new RegExp(`^/(en/)?process/${processId}/?$`));
  // Reconsultar el DOM en cada intento mientras React renderiza el contenido.
  cy.get('body', { timeout: 30000 }).should(($body) => {
    ['Evaluaciones', 'Personalidad', 'Teletrabajo'].forEach((texto) => {
      const coincidencias = $body.find('span').filter((_, elemento) =>
        elemento.textContent.replace(/\s+/g, ' ').trim() === texto
      ).filter(':visible');
      expect(coincidencias.length, `sección visible: ${texto}`).to.be.greaterThan(0);
    });
  });
  cy.get('input[name="firstName"]').should('not.exist');
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
