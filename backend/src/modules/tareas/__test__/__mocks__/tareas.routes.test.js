// backend/src/modules/tareas/__tests__/tareas.routes.test.js
jest.mock('../../../../middlewares/auth.middleware', () => require('./auth.middleware'));
jest.mock('../../../../middlewares/rbac.middleware', () => require('./rbac.middleware'));
jest.mock('../../tareas.service.js', () => ({
  verificarTarea: jest.fn().mockResolvedValue({ id: 5, estado: 'Verificada' })
}));

const request = require('supertest');
const express = require('express');
const router = require('../../tareas.routes');
const service = require('../../tareas.service');

describe('tareas.routes', () => {
  it('POST /:id/verificar devuelve 200', async () => {
    const app = express();
    app.use(express.json());
    // simular socket io en app
    app.set('io', null);
    app.use('/tareas', router);

    const res = await request(app)
      .post('/tareas/5/verificar')
      .send({ comentario: 'OK' })
      .expect(200);

    expect(res.body).toEqual({ id: 5, estado: 'Verificada' });
    expect(service.verificarTarea).toHaveBeenCalled();
  });
});
