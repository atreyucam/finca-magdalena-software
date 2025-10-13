// scripts/seed.js
const { connect, sync, seed } = require('../src/db');

(async () => {
  try {
    await connect();
    await sync();
    await seed();
    console.log('🌱 Seed ejecutado con éxito');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error en seed:', err);
    process.exit(1);
  }
})();
