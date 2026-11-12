# Evaluar — QA Automation E2E

Suite con **Cypress y JavaScript** para el proceso autorizado
`572ff080-da01-4a64-9858-897f5a8d1be9` de candidato.evaluar.com.

## Instalación

Requisitos: Node.js 22.12 o compatible con Cypress 16, npm y Google Chrome
instalado. Validado en Windows con Node 22.12, Cypress 16.3 y Chrome 157.
Se necesita acceso a npm y a los dominios de Evaluar.

```powershell
git clone <URL-PUBLICA-DEL-REPOSITORIO>
cd test_evaluar
npm ci
npx cypress verify
npm test
```

`npm test` ejecuta exclusivamente TC-001, TC-002 y TC-003, en ese orden,
con Chrome headless. No requiere una sesión de otra ejecución ni pasos manuales
en la plataforma. Cada escenario prepara un candidato ficticio nuevo mediante
el autorregistro autorizado. La ejecución envía y finaliza sus evaluaciones.

## Escenarios

| Caso | Archivo | Validaciones |
|---|---|---|
| TC-001: login | `cypress/e2e/01-login.cy.js` | Cuenta previamente creada; eliminación de cookies y almacenamiento del registro; login por formulario con identificación válida; HTTP 200; token nuevo; cookies y área autenticada. |
| TC-002: matriz | `cypress/e2e/02-prueba-matricial.cy.js` | Personalidad: 8 matrices, 5 filas y 5 posiciones; una posición diferente por fila; selección visual; payload y HTTP 200; avance y mensaje final real. |
| TC-003: opción múltiple | `cypress/e2e/03-seleccion-multiple.cy.js` | Teletrabajo: 11 preguntas con tres alternativas de selección única; selección visual; payload y HTTP 200; avance, estado FINISHED y mensaje final real. |

El login controlado de esta plataforma pide **correo o identificación**, sin
campo de contraseña. TC-001 crea primero una cuenta de prueba por API y elimina
su sesión; después inicia sesión desde la interfaz usando su identificación.
El formulario realiza el login real de la cuenta existente. No se inventan
credenciales ni se publica la identificación generada en código o fixtures.

La preparación por API en TC-002 y TC-003 evita repetir el formulario de acceso.
Las preguntas, selecciones, navegación y finalización se ejecutan en la interfaz.
Las respuestas siguen una estrategia determinista para probar el funcionamiento,
sin interpretar alternativas como correctas o buscar mejorar puntuaciones.

## Ejecución por escenario

```powershell
npm run test:login
npm run test:matriz
npm run test:multiple
```

También se pueden ejecutar directamente:

```powershell
npx cypress run --spec "cypress/e2e/01-login.cy.js" --browser chrome
npx cypress run --spec "cypress/e2e/02-prueba-matricial.cy.js" --browser chrome
npx cypress run --spec "cypress/e2e/03-seleccion-multiple.cy.js" --browser chrome
```

Modo interactivo:

```powershell
npm run cy:open
```

Selecciona E2E, Chrome y uno de los tres archivos numerados. No necesitas
ejecutar otro archivo antes. Los scripts headless eliminan del proceso hijo
`ELECTRON_RUN_AS_NODE` y `ELECTRON_NO_ATTACH_CONSOLE`, que algunos editores
inyectan y que impiden iniciar Cypress correctamente.

## Configuración y seguridad

`baseUrl`, viewport y tiempos están en `cypress.config.js`. Los escenarios de
entrega no requieren usuarios, contraseñas ni tokens de configuración; Faker
genera los datos y el helper utiliza los tokens devueltos por la API.
No hay variables secretas obligatorias ni archivos locales ocultos que preparar.

El alias público `expose.sessionUser=cuenta-qa` se usa únicamente en las pruebas
adicionales de restauración de sesión. Puede cambiarse con
`--expose sessionUser=otro-alias`; no representa una credencial.
En Cypress 16, cualquier secreto futuro debe leerse con `cy.env()` y mantenerse
fuera de Git. `.env*`, `cypress.env.json`, reportes, videos, capturas y artefactos
de inspección están excluidos mediante `.gitignore`.

## Evidencias y resultado esperado

Al terminar `npm test` se esperan **3 passing, 0 failing**, código de salida 0
y ningún escenario omitido. El runner falla también si quedan pruebas pendientes.

- `reports/resultado-suite.json`: resumen de la ejecución real sin tokens.
- `cypress/screenshots/<archivo>/`: capturas TC001, TC002 y TC003.
- `cypress/videos/<archivo>.mp4`: video real de cada escenario.
- `entrega/`: paquete local de evidencias para publicar aparte del código.

Para conservar también la salida de terminal en PowerShell:

```powershell
New-Item -ItemType Directory -Force reports
npm test 2>&1 | Tee-Object -FilePath reports/ejecucion.log
```

El video de entrega debe mostrar el comando y los resultados reales de los
tres escenarios. Revisa su contenido y comparte un enlace público que pueda
abrirse sin iniciar sesión. Los videos de Cypress no graban el terminal;
cualquier montaje debe identificar sus rótulos y usar la salida real guardada.
No publiques información de candidatos reales.

## Pruebas adicionales y límites

`login.cy.js` conserva las pruebas originales del **autorregistro**;
`acceso-autenticado.cy.js` conserva las pruebas de reutilización de sesión y de
acceso por API. No sustituyen TC-001 ni forman parte de `npm test`.
La prueba adicional de sesión requiere ejecutar primero el autorregistro en
la misma instancia de Cypress; su respaldo vive en memoria y se pierde al cerrar
el proceso. Por eso `npx cypress run` sin seleccionar archivos puede ejecutar
pruebas adicionales que requieren esa preparación.

Los tres escenarios de entrega usan candidatos nuevos y no tienen esa
 dependencia. Los selectores y textos corresponden al DOM real inspeccionado.
La ruta inglesa muestra `Evaluations`; también se admite `Evaluaciones`.
Si la plataforma cambia sus controles o no habilita el envío, la prueba falla y
debe revisarse la evidencia; no se omiten aserciones ni se fuerzan envíos.

Hay peticiones secundarias de reportes/analítica que pueden fallar fuera del
flujo probado. No se desactivan validaciones, CAPTCHA, MFA ni controles de seguridad.
No hay endpoints, credenciales ni resultados de evaluación simulados.

## Entrega

Publica el código, configuración, lockfile y este README en GitHub. Comparte
aparte el video y verifica ambos enlaces en una ventana sin sesión. El correo
de respuesta debe indicar nombre completo, Cypress + JavaScript, enlace del
repositorio y enlace del video. No incluyas tokens ni archivos de sesión.
