const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { callProcedure, logger } = require("../database/connection");
const { generateToken } = require("../middleware/auth");

class AuthService {
  // Login de administrador
  static async login(email, password) {
    // Obtener datos del admin usando stored procedure
    const result = await callProcedure("sp_admin_login", [email, password]);

    if (result.sql_err !== "0") {
      throw new Error(result.sql_msn);
    }

    const adminData = result.data;

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(
      password,
      adminData.password_hash
    );

    if (!isValidPassword) {
      logger.warn("Login fallido - contraseña incorrecta", {
        email,
        ip: "unknown",
      });
      throw new Error("Credenciales inválidas");
    }

    // Generar token JWT
    const token = generateToken(adminData.admin_id, email);

    logger.info("Login exitoso", {
      adminId: adminData.admin_id,
      email,
    });

    return {
      token,
      id: adminData.admin_id,
      email: adminData.email,
    };
  }

  // Verificar token
  static async verifyToken(token) {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verificar que el admin aún existe
    const result = await callProcedure("sp_admin_verify", [decoded.email]);

    if (result.sql_err !== "0") {
      throw new Error("Token inválido");
    }

    return {
      id: decoded.adminId,
      email: decoded.email,
    };
  }

  // Crear admin (solo para desarrollo)
  static async createAdmin(email, password) {
    // Solo permitir en desarrollo
    if (process.env.NODE_ENV === "production") {
      throw new Error("Creación de admin no permitida en producción");
    }

    logger.info("Creando admin", { email });

    const hashedPassword = await bcrypt.hash(password, 12);

    // Usar stored procedure para crear admin
    const result = await callProcedure("sp_create_admin", [
      email,
      hashedPassword,
    ]);

    if (result.sql_err !== "0") {
      throw new Error(result.sql_msn);
    }

    logger.info("Admin creado exitosamente", {
      id: result.data.admin_id,
      email: result.data.email,
    });

    return result.data;
  }
}

module.exports = AuthService;
