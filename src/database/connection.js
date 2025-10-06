const { Pool } = require("pg");
const winston = require("winston");

// Configurar logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // Solo logs críticos en consola
    new winston.transports.Console({
      level: "error", // Solo errores críticos en consola
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    // Todos los logs en archivo
    new winston.transports.File({
      filename: process.env.LOG_FILE || "logs/app.log",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Logger especial para logs de consola (conexión, servidor, etc.)
const consoleLogger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple()
  ),
  transports: [new winston.transports.Console()],
});

let pool;

const connectDB = async () => {
  try {
    // Configuración de la base de datos
    const config = {
      // Usar PgBouncer si está disponible, sino usar conexión directa
      host: process.env.DB_HOST || "localhost",
      port:
        process.env.DB_PORT ||
        (process.env.USE_PGBOUNCER === "true" ? 6432 : 5432),
      database: process.env.DB_NAME || "booking_app",
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "postgres123",
      ssl: { rejectUnauthorized: false },
      max: 20, // máximo de conexiones en el pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000, // Aumentado a 10 segundos
    };

    pool = new Pool(config);

    // Test de conexión
    const client = await pool.connect();
    consoleLogger.info("✅ Conectado a PostgreSQL");

    // Verificar si las tablas existen, si no, crearlas
    await createTablesIfNotExist(client);

    client.release();

    return pool;
  } catch (error) {
    logger.error("❌ Error conectando a la base de datos:", error);
    throw error;
  }
};

const createTablesIfNotExist = async (client) => {
  try {
    // Crear tabla de asesores
    await client.query(`
      CREATE TABLE IF NOT EXISTS advisors (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Crear tabla de slots de tiempo
    await client.query(`
      CREATE TABLE IF NOT EXISTS time_slots (
        id SERIAL PRIMARY KEY,
        advisor_id INTEGER NOT NULL REFERENCES advisors(id) ON DELETE CASCADE,
        start_utc TIMESTAMP NOT NULL,
        end_utc TIMESTAMP NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (status IN ('free', 'booked', 'blocked')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(advisor_id, start_utc, end_utc)
      )
    `);

    // Crear tabla de reservas
    await client.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        slot_id INTEGER NOT NULL REFERENCES time_slots(id) ON DELETE CASCADE,
        advisor_id INTEGER NOT NULL REFERENCES advisors(id) ON DELETE CASCADE,
        client_name VARCHAR(255) NOT NULL,
        client_email VARCHAR(255) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Crear tabla de logs de email
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_logs (
        id SERIAL PRIMARY KEY,
        booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL CHECK (type IN ('confirmation', 'reminder_24h', 'reminder_1h')),
        status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'sent', 'failed')),
        attempts INTEGER DEFAULT 0,
        sent_at TIMESTAMP,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Crear tabla de administradores
    await client.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Crear tabla de logs de sistema
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_logs (
        id SERIAL PRIMARY KEY,
        level VARCHAR(20) NOT NULL,
        message TEXT NOT NULL,
        data JSONB,
        user_id INTEGER,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Crear índices para optimizar consultas
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_time_slots_advisor_date 
      ON time_slots(advisor_id, start_utc, status)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_slot 
      ON bookings(slot_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_email_logs_booking 
      ON email_logs(booking_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_system_logs_level_date 
      ON system_logs(level, created_at)
    `);

    consoleLogger.info("✅ Tablas creadas/verificadas correctamente");
  } catch (error) {
    logger.error("❌ Error creando tablas:", error);
    throw error;
  }
};

const getPool = () => {
  if (!pool) {
    throw new Error(
      "Base de datos no inicializada. Llama a connectDB() primero."
    );
  }
  return pool;
};

const query = async (text, params = []) => {
  const pool = getPool();
  const start = Date.now();

  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;

    // Solo log de errores para queries normales
    return res;
  } catch (error) {
    logger.error("❌ Error en query:", {
      text: text.substring(0, 100) + "...",
      error: error.message,
      params,
    });
    throw error;
  }
};

// Función para ejecutar stored procedures
const callProcedure = async (procedureName, params = []) => {
  const pool = getPool();
  const start = Date.now();

  try {
    // Construir la llamada al stored procedure
    const paramPlaceholders = params
      .map((_, index) => `$${index + 1}`)
      .join(", ");
    const queryText = `SELECT ${procedureName}(${paramPlaceholders})`;

    // Log específico con formato select nombre_sp(param1, 'param2', etc)
    const formattedParams = params
      .map((param) => {
        if (typeof param === "string") {
          return `'${param}'`;
        }
        return param;
      })
      .join(", ");

    logger.info(`select ${procedureName}(${formattedParams})`);

    const res = await pool.query(queryText, params);
    const duration = Date.now() - start;

    return res.rows[0][procedureName];
  } catch (error) {
    logger.error("❌ Error en stored procedure:", {
      procedureName,
      error: error.message,
      params,
    });
    throw error;
  }
};

module.exports = {
  connectDB,
  getPool,
  query,
  callProcedure,
  logger,
  consoleLogger,
};
