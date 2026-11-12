# Evaluar — QA Automation E2E

Automatización de pruebas end-to-end con **Cypress y JavaScript** para el proceso de evaluación de candidatos de [Evaluar](https://candidato.evaluar.com/).

El proyecto implementa los **tres escenarios solicitados**: acceso (TC-001), evaluación matricial (TC-002) y evaluación de selección múltiple (TC-003). Las pruebas validan tanto la interacción con la interfaz como las respuestas relevantes de la API y el estado final de las evaluaciones.

## Requisitos

- Node.js **22.12** (entorno de referencia).
- npm y Google Chrome instalados.
- Conexión a internet y acceso a `candidato.evaluar.com`, `apis.evaluar.com` y al registro de npm.

Entorno en el que se reportó la validación: **Windows, Node.js 22.12, Cypress 16.3 y Chrome 157**.

## Instalación y ejecución rápida

```bash
git clone https://github.com/wcadena/evaluar_test.git
cd evaluar_test
npm ci
npx cypress verify
npm test
```

**`npm test` ejecuta únicamente TC-001, TC-002 y TC-003**, en orden y con Chrome en modo headless. No es necesario ejecutar pruebas previas ni proporcionar credenciales manualmente: cada escenario prepara un candidato ficticio de prueba mediante el flujo de API implementado en el proyecto.

> **Importante:** las pruebas interactúan con servicios reales de Evaluar, crean candidatos de prueba y pueden enviar y finalizar evaluaciones. Ejecútelas únicamente en el proceso autorizado para esta prueba técnica.

## Casos de prueba

| Caso | Archivo | Cobertura principal |
| --- | --- | --- |
| **TC-001 · Acceso** | `cypress/e2e/01-login.cy.js` | Crea una cuenta de prueba, limpia la sesión inicial, inicia sesión desde el formulario con una identificación válida y verifica HTTP 200, nuevo token, cookies y acceso al área autenticada. |
| **TC-002 · Evaluación matricial** | `cypress/e2e/02-prueba-matricial.cy.js` | Completa **Personalidad**: 8 matrices de 5 filas y 5 posiciones; verifica selecciones, payload, HTTP 200, navegación y mensaje de finalización. |
| **TC-003 · Selección de opciones** | `cypress/e2e/03-seleccion-multiple.cy.js` | Completa **Teletrabajo**: 11 preguntas con tres alternativas de selección única; verifica selecciones, payload, HTTP 200, navegación, estado `FINISHED` y mensaje final. |

Las respuestas siguen una **estrategia determinista** orientada a comprobar el funcionamiento de la interfaz. No se interpretan como respuestas correctas ni se utilizan para optimizar puntuaciones.

### Ejecución individual

```bash
npm run test:login
npm run test:matriz
npm run test:multiple
```

Para abrir el runner interactivo:

```bash
npm run cy:open
```

Seleccione **E2E**, **Chrome** y el archivo del escenario que desee inspeccionar.

## Cómo funciona la autenticación

El formulario de acceso controlado solicita **correo electrónico o identificación**, sin contraseña. En TC-001 se crea una cuenta de prueba mediante la API, se descarta la sesión inicial y se comprueba el inicio de sesión real desde la interfaz.

En TC-002 y TC-003, el helper `cypress/support/sesion-evaluar.js` crea la sesión de un candidato de prueba mediante la API y configura la autenticación necesaria para navegar por la aplicación. Las respuestas y la finalización de las evaluaciones se realizan desde la interfaz web.

El proceso utilizado es:

`572ff080-da01-4a64-9858-897f5a8d1be9`

No se necesitan contraseñas, tokens estáticos ni archivos secretos para ejecutar los tres escenarios de entrega. Los tokens se obtienen dinámicamente y no deben publicarse.

## Evidencias y resultados

La ejecución genera o utiliza las siguientes rutas:

| Ruta | Contenido |
| --- | --- |
| `reports/resultado-suite.json` | Resumen de resultados de la suite. |
| `cypress/screenshots/` | Capturas de los escenarios. |
| `cypress/videos/` | Grabaciones de ejecución de Cypress. |
| `entrega/demo-evaluar.mp4` | Video de demostración generado a partir de evidencias reales, cuando se ejecute el script correspondiente. |

**Última verificación reportada por el autor:** 3 pruebas aprobadas, 0 fallidas, 0 omitidas, código de salida 0, duración **146,83 s**; realizada desde una copia limpia con `npm ci` y `npm test`. Este resultado es una referencia de la ejecución reportada, **no una garantía de que futuras ejecuciones tengan idéntico resultado o duración**.

Para generar el video de entrega a partir de las grabaciones y resultados disponibles:

```bash
npm run video:entrega
```

El comando requiere FFmpeg; en Windows el script puede utilizar el ejecutable de la caché de Cypress o el indicado mediante `FFMPEG_PATH`. No vuelve a ejecutar las pruebas ni crea candidatos nuevos.

**Video de demostración:** _[Agregar aquí el enlace público al video de entrega]_.

## Organización y notas técnicas

- `cypress/support/sesion-evaluar.js`: preparación y comprobación de autenticación.
- `cypress/support/matriz-evaluar.js`: automatización de matrices.
- `cypress/support/seleccion-multiple-evaluar.js`: automatización de preguntas de selección (verificar el nombre real del helper antes de publicar).
- `cypress.config.js`: URL base, viewport y tiempos de espera.
- `package-lock.json`: dependencias fijadas para una instalación reproducible.

Existen pruebas complementarias de autorregistro y restauración de sesión (`login.cy.js` y `acceso-autenticado.cy.js`) que **no forman parte de `npm test`**. Ejecutar `npx cypress run` sin seleccionar escenarios puede incluirlas; algunas requieren una preparación previa de sesión en la misma instancia de Cypress.

Las aserciones dependen del comportamiento real de la plataforma. Cambios en la interfaz, disponibilidad de evaluaciones o restricciones del proceso pueden requerir actualizar los selectores o la sincronización de red. No se simulan respuestas de evaluación ni se desactivan controles de seguridad.

### Seguridad y dependencias

El repositorio excluye de Git archivos locales de entorno, tokens, capturas, videos y reportes mediante `.gitignore`. Antes de publicar evidencias, compruebe que no contengan información sensible.

En la instalación de referencia se reportó una advertencia de `npm audit` asociada a Faker 9.9 (`GHSA-qxc2-j82w-r537`, función `helpers.fake`, no utilizada por esta suite). Se conservó el lockfile validado y no se aplicó una actualización mayor forzada sin pruebas de regresión.

## Repositorio

**Código fuente:** https://github.com/wcadena/evaluar_test

**Tecnologías:** Cypress · JavaScript · Faker · Chrome
