const { connectDB, logger } = require("./connection");
require("dotenv").config();

const runMigrations = async () => {
  try {
    logger.info("🗄️ Ejecutando migraciones...");

    const { query } = require("./connection");

    // Las tablas ya se crean automáticamente en connection.js
    // Este archivo es para migraciones futuras si es necesario

    logger.info("✅ Migraciones completadas");
  } catch (error) {
    logger.error("❌ Error en migraciones:", error);
    throw error;
  }
};

// Ejecutar si se llama directamente
if (require.main === module) {
  const runMigrationsScript = async () => {
    try {
      await connectDB();
      await runMigrations();
      logger.info("🎉 Script de migraciones completado");
      process.exit(0);
    } catch (error) {
      logger.error("Error:", error);
      process.exit(1);
    }
  };

  runMigrationsScript();
}

module.exports = { runMigrations };
