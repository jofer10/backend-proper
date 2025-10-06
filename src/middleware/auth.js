const jwt = require("jsonwebtoken");
const { callProcedure, logger } = require("../database/connection");

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      logger.warn("Token no proporcionado:", {
        ip: req.ip,
        url: req.url,
        userAgent: req.get("User-Agent"),
      });

      return res.status(401).json({
        success: false,
        error: "Token de acceso requerido",
        code: "TOKEN_REQUIRED",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verificar que el admin aún existe usando stored procedure
    const result = await callProcedure("sp_admin_verify", [decoded.email]);

    if (result.sql_err !== "0") {
      logger.warn("Token inválido - admin no encontrado:", {
        adminId: decoded.adminId,
        email: decoded.email,
        ip: req.ip,
      });

      return res.status(401).json({
        success: false,
        error: "Token inválido - usuario no encontrado",
        code: "INVALID_TOKEN",
      });
    }

    req.admin = {
      id: decoded.adminId,
      email: decoded.email,
    };

    logger.info("Autenticación exitosa:", {
      adminId: decoded.adminId,
      email: decoded.email,
      ip: req.ip,
    });

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      logger.warn("Token inválido:", {
        error: error.message,
        ip: req.ip,
        url: req.url,
      });

      return res.status(401).json({
        success: false,
        error: "Token inválido",
        code: "INVALID_TOKEN",
      });
    }

    if (error.name === "TokenExpiredError") {
      logger.warn("Token expirado:", {
        ip: req.ip,
        url: req.url,
      });

      return res.status(401).json({
        success: false,
        error: "Token expirado",
        code: "TOKEN_EXPIRED",
      });
    }

    logger.error("Error en autenticación:", {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
      url: req.url,
    });

    return res.status(500).json({
      success: false,
      error: "Error interno del servidor",
      code: "AUTH_ERROR",
    });
  }
};

const generateToken = (adminId, email) => {
  return jwt.sign({ adminId, email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "24h",
  });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

module.exports = {
  authenticateToken,
  generateToken,
  verifyToken,
};
