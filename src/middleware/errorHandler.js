const { logger } = require("../database/connection");

// Middleware para manejar errores de stored procedures
const handleSPError = (error, req, res, next) => {
  logger.error("Error en stored procedure:", {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  // Si es un error de validación de stored procedure
  if (error.message.includes("Error:")) {
    return res.status(400).json({
      success: false,
      error: error.message,
      code: "VALIDATION_ERROR",
    });
  }

  // Si es un error de base de datos
  if (error.code && error.code.startsWith("23")) {
    return res.status(409).json({
      success: false,
      error: "Conflicto en la base de datos",
      code: "DATABASE_CONFLICT",
    });
  }

  // Si es un error de conexión
  if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
    return res.status(503).json({
      success: false,
      error: "Servicio de base de datos no disponible",
      code: "DATABASE_UNAVAILABLE",
    });
  }

  // Error genérico
  return res.status(500).json({
    success: false,
    error:
      process.env.NODE_ENV === "production"
        ? "Error interno del servidor"
        : error.message,
    code: "INTERNAL_ERROR",
  });
};

// Middleware para manejar respuestas de stored procedures
const handleSPResponse = (req, res, next) => {
  const originalSend = res.send;

  res.send = function (data) {
    try {
      // Si la respuesta es de un stored procedure
      if (typeof data === "object" && data.sql_err !== undefined) {
        if (data.sql_err === "0") {
          // Éxito
          return originalSend.call(this, {
            success: true,
            message: data.sql_msn,
            data: data.data,
          });
        } else {
          // Error del stored procedure
          logger.error("Error en stored procedure:", {
            sql_err: data.sql_err,
            sql_msn: data.sql_msn,
            url: req.url,
            method: req.method,
          });

          return originalSend.call(this, {
            success: false,
            error: data.sql_msn,
            code: "SP_ERROR",
            sql_error: data.sql_err,
          });
        }
      }

      // Respuesta normal
      return originalSend.call(this, data);
    } catch (error) {
      logger.error("Error procesando respuesta:", error);
      return originalSend.call(this, {
        success: false,
        error: "Error procesando respuesta",
        code: "RESPONSE_ERROR",
      });
    }
  };

  next();
};

// Middleware para logging de requests
const requestLogger = (req, res, next) => {
  const start = Date.now();

  // Log del request
  logger.info("Request recibido:", {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    timestamp: new Date().toISOString(),
  });

  // Interceptar la respuesta
  const originalSend = res.send;

  res.send = function (data) {
    const duration = Date.now() - start;

    // Log de la respuesta
    logger.info("Response enviado:", {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });

    return originalSend.call(this, data);
  };

  next();
};

// Middleware para validar datos de entrada
const validateRequest = (schema) => {
  return (req, res, next) => {
    try {
      const { error } = schema.validate(req.body);

      if (error) {
        logger.warn("Validación fallida:", {
          error: error.details[0].message,
          url: req.url,
          body: req.body,
        });

        return res.status(400).json({
          success: false,
          error: error.details[0].message,
          code: "VALIDATION_ERROR",
        });
      }

      next();
    } catch (error) {
      logger.error("Error en validación:", error);
      next(error);
    }
  };
};

// Middleware para rate limiting personalizado
const customRateLimit = (windowMs = 15 * 60 * 1000, max = 100) => {
  const requests = new Map();

  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Limpiar requests antiguos
    if (requests.has(key)) {
      const userRequests = requests
        .get(key)
        .filter((time) => time > windowStart);
      requests.set(key, userRequests);
    } else {
      requests.set(key, []);
    }

    const userRequests = requests.get(key);

    if (userRequests.length >= max) {
      logger.warn("Rate limit excedido:", {
        ip: req.ip,
        url: req.url,
        requests: userRequests.length,
      });

      return res.status(429).json({
        success: false,
        error: "Demasiadas solicitudes",
        code: "RATE_LIMIT_EXCEEDED",
        retryAfter: Math.ceil(windowMs / 1000),
      });
    }

    userRequests.push(now);
    next();
  };
};

module.exports = {
  handleSPError,
  handleSPResponse,
  requestLogger,
  validateRequest,
  customRateLimit,
};
