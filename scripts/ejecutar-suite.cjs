const fs = require('node:fs');
const path = require('node:path');

// El terminal integrado de algunos editores hereda estas variables de Electron.
// Cypress necesita iniciar su propia aplicación, no ejecutarla como Node.
delete process.env.ELECTRON_RUN_AS_NODE;
delete process.env.ELECTRON_NO_ATTACH_CONSOLE;

const cypress = require('cypress');
const escenarios = {
  login: 'cypress/e2e/01-login.cy.js',
  matriz: 'cypress/e2e/02-prueba-matricial.cy.js',
  multiple: 'cypress/e2e/03-seleccion-multiple.cy.js',
};
const elegido = process.argv[2];
if (elegido && !escenarios[elegido]) {
  console.error('Escenario inválido. Usa login, matriz o multiple.');
  process.exit(1);
}
const spec = elegido ? escenarios[elegido] : Object.values(escenarios).join(',');
fs.mkdirSync('reports', { recursive: true });

console.log(`Comando: npm ${elegido ? `run test:${elegido}` : 'test'}`);
console.log(`Escenarios: ${spec}`);

cypress.run({ browser: 'chrome', spec }).then((resultado) => {
  if (resultado.status === 'failed') {
    console.error('Cypress no pudo iniciar la ejecución.');
    process.exitCode = 1;
    return;
  }
  // Resumen sin cuerpos HTTP, credenciales, cookies ni tokens.
  const resumen = {
    fechaUTC: new Date().toISOString(),
    comando: elegido ? `npm run test:${elegido}` : 'npm test',
    cypress: resultado.cypressVersion,
    navegador: resultado.browserName,
    versionNavegador: resultado.browserVersion,
    pruebas: resultado.totalTests,
    aprobadas: resultado.totalPassed,
    fallidas: resultado.totalFailed,
    omitidas: resultado.totalSkipped,
    pendientes: resultado.totalPending,
    duracionMs: resultado.totalDuration,
    archivos: resultado.runs.map(run => ({
      archivo: run.spec.relative,
      aprobadas: run.stats.passes,
      fallidas: run.stats.failures,
      video: run.video ? path.relative(process.cwd(), run.video) : null,
    })),
  };
  fs.writeFileSync('reports/resultado-suite.json', JSON.stringify(resumen, null, 2));
  console.log(`Resultado: ${resumen.aprobadas}/${resumen.pruebas} aprobadas; ${resumen.fallidas} fallidas.`);
  console.log('Resumen: reports/resultado-suite.json');
  process.exitCode = resumen.fallidas || resumen.omitidas || resumen.pendientes || resumen.aprobadas !== resumen.pruebas ? 1 : 0;
}).catch(() => {
  console.error('No se pudo ejecutar Cypress. Revisa su instalación y Chrome.');
  process.exitCode = 1;
});
