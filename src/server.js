const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

// Swagger
const { swaggerUi, specs } = require("./config/swagger");

const { connectDB, logger } = require("./database/connection");
const { consoleLogger } = require("./database/connection");
const {
  handleSPError,
  handleSPResponse,
  requestLogger,
  customRateLimit,
} = require("./middleware/errorHandler");

// Importar rutas
const authRoutes = require("./routes/auth");
const bookingRoutes = require("./routes/bookings");
const adminRoutes = require("./routes/admin");
const reminderRoutes = require("./routes/reminders");

// Importar sistema de recordatorios
const ReminderCron = require("./cron/reminderCron");

const app = express();
const PORT = process.env.PORT || 3001;

// Crear directorio de logs si no existe
const logsDir = path.dirname(process.env.LOG_FILE || "logs/app.log");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Middleware de seguridad
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  })
);

app.use(
  cors({
    origin: ["http://localhost:3000", "https://frontend-proper.vercel.app"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP
  message: {
    success: false,
    error: "Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde.",
    code: "RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Rate limiting personalizado para endpoints críticos
app.use("/api/bookings", customRateLimit(5 * 60 * 1000, 20)); // 20 requests por 5 minutos
app.use("/api/auth/login", customRateLimit(15 * 60 * 1000, 5)); // 5 intentos por 15 minutos

// Logging de requests
app.use(
  morgan("combined", {
    stream: {
      write: (message) => {
        logger.info(message.trim());
      },
    },
  })
);

// Middleware personalizado para logging
// app.use(requestLogger); // Deshabilitado para consola limpia

// Middleware para parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Middleware para manejar respuestas de stored procedures
app.use(handleSPResponse);

// Swagger Documentation
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(specs, {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "Booking App API Documentation",
  })
);

// Rutas
app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/reminders", reminderRoutes);

// Ruta de salud
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Servidor funcionando correctamente",
    data: {
      status: "OK",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || "1.0.0",
    },
  });
});

// Ruta de información del sistema
app.get("/api/info", (req, res) => {
  res.json({
    success: true,
    data: {
      name: "Sistema de Reservas API",
      version: "1.0.0",
      environment: process.env.NODE_ENV,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      node_version: process.version,
    },
  });
});

// Middleware de manejo de errores
app.use(handleSPError);

// Ruta 404
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "Ruta no encontrada",
    code: "NOT_FOUND",
    path: req.originalUrl,
  });
});

// Manejo de errores no capturados
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Iniciar servidor
const startServer = async () => {
  try {
    // Conectar a la base de datos
    await connectDB();

    // Crear stored procedures
    const {
      createStoredProcedures,
    } = require("./database/create-stored-procedures");
    await createStoredProcedures();

    // Iniciar sistema de recordatorios
    const reminderCron = new ReminderCron();
    reminderCron.start();

    // Iniciar servidor
    app.listen(PORT, "0.0.0.0", () => {
      consoleLogger.info(`🚀 Servidor corriendo en puerto ${PORT}`);
      consoleLogger.info(`📊 Entorno: ${process.env.NODE_ENV}`);
      consoleLogger.info(
        `🌐 Health check: http://localhost:${PORT}/api/health`
      );
      consoleLogger.info(`📋 API Info: http://localhost:${PORT}/api/info`);
      consoleLogger.info(`🔔 Sistema de recordatorios iniciado`);

      // Probar conexión de email
      const emailService = require("./services/emailService");
      emailService.testConnection();
    });
  } catch (error) {
    logger.error("❌ Error al iniciar servidor:", error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
