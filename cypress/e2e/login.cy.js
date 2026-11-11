
describe('Pruebas de Login - The Internet', () => {
  const url = 'https://the-internet.herokuapp.com/login';

  beforeEach(() => {
    cy.visit(url);
  });

  it('TC-001: Login exitoso', () => {
    cy.get('#username').type('tomsmith');
    cy.get('#password').type('SuperSecretPassword!');
    cy.get('button[type="submit"]').click();

    cy.url().should('include', '/secure');
    cy.get('#flash')
      .should('contain.text', 'You logged into a secure area!');
    cy.get('a[href="/logout"]').should('be.visible');
  });

  it('TC-002: Contraseña incorrecta', () => {
    cy.get('#username').type('tomsmith');
    cy.get('#password').type('passwordIncorrecta');
    cy.get('button[type="submit"]').click();

    cy.get('#flash')
      .should('contain.text', 'Your password is invalid!');
  });

  it('TC-003: Usuario incorrecto', () => {
    cy.get('#username').type('usuarioIncorrecto');
    cy.get('#password').type('SuperSecretPassword!');
    cy.get('button[type="submit"]').click();

    cy.get('#flash')
      .should('contain.text', 'Your username is invalid!');
  });

  it('TC-004: Cerrar sesión', () => {
    cy.get('#username').type('tomsmith');
    cy.get('#password').type('SuperSecretPassword!');
    cy.get('button[type="submit"]').click();

    cy.url().should('include', '/secure');

    cy.get('a[href="/logout"]').click();

    cy.url().should('include', '/login');
    cy.get('#flash')
      .should('contain.text', 'You logged out of the secure area!');
  });
});
