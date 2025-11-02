// backend/src/modules/tareas/__tests__/__mocks__/invService.js
module.exports = {
  _moverStock: jest.fn(async () => true),
  _getFactor: jest.fn(async (fromU, toU) => {
    // factor genérico (1:1) salvo que quieras simular conversiones
    return 1;
  }),
};
