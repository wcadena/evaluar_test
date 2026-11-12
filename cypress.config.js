
const { defineConfig } = require('cypress');

module.exports = defineConfig({
  expose: {
    sessionUser: 'cuenta-qa',
  },
  e2e: {
    baseUrl: 'https://candidato.evaluar.com',
    viewportWidth: 1366,
    viewportHeight: 768,
    defaultCommandTimeout: 10000,
    pageLoadTimeout: 60000,
    video: true,
  },
});
