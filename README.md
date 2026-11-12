# Sesión autenticada reutilizable

Las pruebas actuales de `login.cy.js` conservan su formulario, datos Faker y
aserciones. Al indicar `sessionUser`, la última prueba guarda la sesión final
establecida por la aplicación mediante `cy.session()`. No se utiliza el token
del POST para fabricar cookies. El identificador combina dominio, proceso y
el alias de cuenta `sessionUser`; usa un alias diferente para cada cuenta.

Para preparar y reutilizar la sesión en la misma ejecución, ejecuta los archivos
en este orden (este comando ejecuta los autorregistros de las pruebas existentes):

```powershell
npx cypress run --spec "cypress/e2e/login.cy.js,cypress/e2e/acceso-autenticado.cy.js" --browser chrome --expose sessionUser=cuenta-qa
```

Para ejecutar únicamente el acceso:

```powershell
npx cypress run --spec "cypress/e2e/acceso-autenticado.cy.js" --browser chrome --expose sessionUser=cuenta-qa
```

**Una nueva ejecución de ese segundo comando no dispone de la sesión anterior.**
Fallará expresamente si no encuentra la sesión; no registra otra cuenta ni
inventa un login. Todavía no se dispone de un mecanismo confirmado para
reautenticar una cuenta existente. Cuando la sesión caduque o el servidor la
rechace, hace falta autenticar de nuevo mediante un flujo autorizado; no hay
renovación automática implementada.

En modo interactivo:

```powershell
npx cypress open --browser chrome --expose sessionUser=cuenta-qa
```

Ejecuta primero `login.cy.js` y luego `acceso-autenticado.cy.js`, sin cerrar
Cypress ni limpiar las sesiones. `cacheAcrossSpecs` permite compartirlas dentro
de esa ejecución en la misma máquina. No existe persistencia permanente.

La captura inicial conserva las cookies reales y los almacenamientos local y de
sesión del origen de la aplicación en memoria. Cypress almacena el contexto
resultante en su caché de sesiones. No se escriben tokens en archivos, fixtures,
variables de entorno ni logs propios. `sessionUser` es solo un alias sin secretos.

Al final de la última prueba de `login.cy.js`, `guardarSesionActual()` también
guarda un respaldo en memoria del proceso Node mediante `cy.task()`. Se comprueba
la escritura con la aserción `sesión guardada en memoria`. Si la caché de
`cy.session()` no existe, el setup restaura ese respaldo y vuelve a validar el
acceso real. Reinicia Cypress después de cambiar `setupNodeEvents`; luego ejecuta
login y acceso en la misma instancia. Cerrar o reiniciar el proceso elimina el
respaldo. Restaurar un respaldo expirado no renueva la autenticación y hará
fallar la validación.

La validación visita el proceso, comprueba cookies y vigencia, acepta las rutas
`/en/process/{id}` y `/process/{id}`, exige las tres secciones visibles y comprueba
que el campo de nombre del autorregistro ya no exista. Una redirección al login,
un error HTTP o contenido autenticado ausente hace fallar la validación.

La evidencia de acceso se genera en
`cypress/screenshots/acceso-autenticado.cy.js/03-acceso-sesion-reutilizada.png`.
Comprueba `passing` en la salida de Cypress. No publiques evidencia con datos
personales. La implementación se verificó estáticamente; aún no se ha confirmado
una ejecución E2E exitosa en este entorno. No se ejecutaron nuevos registros
para implementar esta mejora.
