const filasVisibles = () => cy.get('[role="radiogroup"]', { timeout: 30000 }).filter(':visible');

export const abrirMatriz = (processId) => {
  cy.contains('[role="tabpanel"] [role="button"]', 'Personalidad', { timeout: 30000 })
    .should('be.visible').find('button').should('be.enabled').click();
  cy.get('[role="dialog"]', { timeout: 30000 }).should('be.visible').within(() => {
    cy.contains('h2', 'Personalidad').should('be.visible');
    cy.contains('matrices con cinco conductas').should('be.visible');
    cy.contains('button', /^Start$/).should('be.enabled').click();
  });

  // El candidato nuevo también puede recibir el diálogo Continue Evaluation.
  cy.get('body', { timeout: 30000 }).should(($body) => {
    const matriz = $body.find('[role="radiogroup"]:visible').length;
    const continuar = $body.find('[role="dialog"]:visible').text().includes('Continue Evaluation');
    expect(Boolean(matriz || continuar), 'matriz o confirmación de continuación').to.eq(true);
  }).then(($body) => {
    if ($body.find('[role="dialog"]:visible').text().includes('Continue Evaluation')) {
      cy.contains('[role="dialog"] button', /^Continue$/).should('be.enabled').click();
    }
  });
  cy.location('pathname', { timeout: 30000 })
    .should('include', `/evaluation/${processId}/PSYCHOMETRIC/`);
  filasVisibles().should('have.length', 5);
};

export const responderMatriz = () => {
  const seleccionadas = [];
  const posicionesUsadas = new Set();

  return filasVisibles().should('have.length', 5).then(($filas) => {
    // La interfaz no proporciona nombre accesible para las filas. Su orden
    // visual determina la asignación reproducible, sin interpretar el contenido.
    for (let indice = 0; indice < $filas.length; indice += 1) {
      filasVisibles().eq(indice).find('button[role="radio"]')
        .should('have.length', 5).then(($opciones) => {
          const existentes = [...$opciones].filter(o => o.getAttribute('aria-checked') === 'true');
          expect(existentes.length, 'máximo una selección por fila').to.be.at.most(1);
          const opcion = existentes[0] || [...$opciones].find(o =>
            !o.disabled && o.getAttribute('aria-disabled') !== 'true' && !posicionesUsadas.has(o.value)
          );
          expect(Boolean(opcion), 'opción disponible en la fila').to.eq(true);
          const value = opcion.value;
          const id = opcion.id;
          expect(posicionesUsadas.has(value), 'posición no repetida').to.eq(false);
          posicionesUsadas.add(value);
          seleccionadas.push({ questionId: id.slice(0, -(value.length + 1)), value });

          if (!existentes.length) {
            filasVisibles().eq(indice).find(`button[role="radio"][value="${value}"]`)
              .should('be.visible').and('be.enabled').click();
          }
          filasVisibles().eq(indice).find('button[role="radio"][aria-checked="true"]')
            .should('have.length', 1).and('have.value', value);
        });
    }
  }).then(() => {
    filasVisibles().each(($fila) => {
      expect($fila.find('[role="radio"][aria-checked="true"]').length, 'fila respondida').to.eq(1);
    });
    return cy.then(() => seleccionadas);
  });
};

export const avanzarEvaluacion = (actual, total, respuestas) => {
  const ultima = actual === total;
  const boton = ultima ? 'Finish' : 'Next';
  cy.get(`button[aria-label="${boton}"]`).should('be.visible').and('be.enabled').click();

  cy.wait('@guardarMatriz', { timeout: 60000, log: false }).then(({ request, response }) => {
    expect(response?.statusCode, 'guardado de matriz HTTP').to.eq(200);
    expect(request.body, 'una respuesta por fila').to.be.an('array').and.have.length(respuestas.length);
    respuestas.forEach(({ questionId, value }) => {
      const enviada = request.body.find(r => r.questionId === questionId);
      expect(Boolean(enviada), 'fila enviada al backend').to.eq(true);
      expect(enviada.answer).to.have.length(1);
      expect(enviada.answer[0].id, 'selección enviada coincide con la interfaz').to.eq(value);
    });
  });

  if (!ultima) {
    cy.get('.nav-counter', { timeout: 30000 })
      .should('contain.text', `Question ${actual + 1}`);
  }
};

export const completarMatrices = (actual = 1, totalEsperado) => {
  // nav-counter es el contador real; se evita cualquier id generado por Radix.
  cy.get('.nav-counter', { timeout: 30000 }).invoke('text').then((texto) => {
    const contador = texto.match(/Question\s+(\d+)\s*\/\s*(\d+)/);
    expect(Boolean(contador), 'contador de preguntas disponible').to.eq(true);
    const numero = Number(contador[1]);
    const total = Number(contador[2]);
    expect(numero, 'avance secuencial').to.eq(actual);
    expect(total, 'límite de seguridad de preguntas').to.be.within(1, 30);
    if (totalEsperado) expect(total, 'total de preguntas estable').to.eq(totalEsperado);

    responderMatriz().then((respuestas) => {
      if (actual === 1) cy.screenshot('TC002-02-preguntas-respondidas');
      avanzarEvaluacion(actual, total, respuestas);
      if (actual < total) {
        if (actual === 1) cy.screenshot('TC002-03-avance-evaluacion');
        completarMatrices(actual + 1, total);
      }
    });
  });
};
