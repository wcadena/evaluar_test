const grupoVisible = () => cy.get('[role="radiogroup"]', { timeout: 30000 }).filter(':visible');

export const abrirSeleccionMultiple = (processId) => {
  cy.contains('[role="tabpanel"] [role="button"]', 'Teletrabajo', { timeout: 30000 })
    .should('be.visible').find('button').should('be.enabled').click();

  cy.get('[role="dialog"]', { timeout: 30000 }).should('be.visible').within(() => {
    cy.contains('h2', 'Teletrabajo').should('be.visible');
    cy.contains('11 preguntas de opción múltiple').should('be.visible');
    cy.contains('button', /^Start$/).should('be.enabled').click();
  });

  cy.get('body', { timeout: 30000 }).should(($body) => {
    const pregunta = $body.find('[role="radiogroup"]:visible').length;
    const continuar = $body.find('[role="dialog"]:visible').text().includes('Continue Evaluation');
    expect(Boolean(pregunta || continuar), 'pregunta o confirmación de continuación').to.eq(true);
  }).then(($body) => {
    if ($body.find('[role="dialog"]:visible').text().includes('Continue Evaluation')) {
      cy.contains('[role="dialog"] button', /^Continue$/).should('be.enabled').click();
    }
  });

  cy.location('pathname', { timeout: 30000 }).should('include', `/evaluation/${processId}/PSYCHOMETRIC/`)
    .then((ruta) => {
      const evaluationId = ruta.split('/PSYCHOMETRIC/')[1].split('/')[0];
      cy.wrap(evaluationId).as('evaluacionTeletrabajo');
    });
  grupoVisible().should('have.length', 1);
  cy.get('[role="checkbox"]').should('not.exist');
};

export const responderPreguntaSeleccionMultiple = () => {
  // En Teletrabajo las opciones múltiples son alternativas de selección única.
  // Fallar ante otro tipo de control evita asumir reglas de checkbox desconocidas.
  return grupoVisible().should('have.length', 1)
    .find('button[role="radio"]').should('have.length', 3).then(($opciones) => {
      const marcadas = [...$opciones].filter(o => o.getAttribute('aria-checked') === 'true');
      expect(marcadas.length, 'máximo una opción seleccionada').to.be.at.most(1);
      const opcion = marcadas[0] || [...$opciones].find(o =>
        !o.disabled && o.getAttribute('aria-disabled') !== 'true'
      );
      expect(Boolean(opcion), 'opción habilitada disponible').to.eq(true);
      expect(opcion.value, 'identificador real de alternativa').to.match(/^TEL11_Q\d+_A\d+$/);
      const value = opcion.value;
      const questionId = value.replace(/_A\d+$/, '');

      cy.get(`label[for="${opcion.id}"]`).should('be.visible')
        .invoke('text').should('not.be.empty');
      if (!marcadas.length) {
        grupoVisible().find(`button[role="radio"][value="${value}"]`)
          .should('be.visible').and('be.enabled').click();
      }
      grupoVisible().find('button[role="radio"][aria-checked="true"]')
        .should('have.length', 1).and('have.value', value);

      return cy.then(() => ({ questionId, value }));
    });
};

export const completarSeleccionMultiple = (actual = 1, totalEsperado) => {
  // Clase estable del contador inspeccionado, sin IDs dinámicos de React/Radix.
  cy.get('.nav-counter', { timeout: 30000 }).invoke('text').then((texto) => {
    const contador = texto.match(/Question\s+(\d+)\s*\/\s*(\d+)/);
    expect(Boolean(contador), 'contador de preguntas disponible').to.eq(true);
    const numero = Number(contador[1]);
    const total = Number(contador[2]);
    expect(numero, 'avance secuencial').to.eq(actual);
    expect(total, 'límite máximo de preguntas').to.be.within(1, 30);
    if (totalEsperado) expect(total, 'total estable durante la evaluación').to.eq(totalEsperado);

    responderPreguntaSeleccionMultiple().then(({ questionId, value }) => {
      if (actual === 1) cy.screenshot('TC003-02-opciones-seleccionadas');
      const ultima = actual === total;
      cy.get(`button[aria-label="${ultima ? 'Finish' : 'Next'}"]`)
        .should('be.visible').and('be.enabled').click();

      cy.get('@evaluacionTeletrabajo').then((evaluationId) => {
        cy.wait('@guardarSeleccion', { timeout: 60000, log: false }).then(({ request, response }) => {
          expect(response?.statusCode, 'respuesta aceptada por el backend').to.eq(200);
          expect(request.body).to.include({ questionId, evaluationId, answerType: 'SINGLE' });
          expect(request.body.answer, 'una alternativa enviada').to.be.an('array').and.have.length(1);
          expect(request.body.answer[0].id, 'selección enviada coincide con la interfaz').to.eq(value);
        });
      });

      if (!ultima) {
        cy.get('.nav-counter', { timeout: 30000 }).should('contain.text', `Question ${actual + 1}`);
        grupoVisible().find('button[role="radio"]').should(($opciones) => {
          expect([...$opciones].every(o => !o.value.startsWith(`${questionId}_A`)),
            'opciones de una pregunta nueva').to.eq(true);
        });
        if (actual === 1) cy.screenshot('TC003-03-avance-preguntas');
        completarSeleccionMultiple(actual + 1, total);
      }
    });
  });
};
