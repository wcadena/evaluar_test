
const { defineConfig } = require('cypress');

module.exports = defineConfig({
  expose: {
    sessionUser: 'cuenta-qa',
  },
  e2e: {
    setupNodeEvents(on) {
      // Respaldo privado durante la vida de este proceso, sin archivos ni logs.
      const sesiones = new Map();
      on('task', {
        guardarSesionEvaluar({ id, snapshot }) {
          sesiones.set(id, snapshot);
          return true;
        },
        obtenerSesionEvaluar(id) {
          return sesiones.get(id) || null;
        },
      });
    },
    baseUrl: 'https://candidato.evaluar.com',
    viewportWidth: 1366,
    viewportHeight: 768,
    defaultCommandTimeout: 10000,
    pageLoadTimeout: 60000,
    video: true,
  },
});
