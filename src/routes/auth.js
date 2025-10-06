const express = require("express");
const { body, validationResult } = require("express-validator");
const AuthService = require("../services/authService");
const {
  requestLogger,
  validateRequest,
} = require("../middleware/errorHandler");

const router = express.Router();

// Aplicar logging a todas las rutas
router.use(requestLogger);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Authentication]
 */
router.post(
  "/login",
  [
    body("email").isEmail().normalizeEmail().withMessage("Email inválido"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password debe tener al menos 6 caracteres"),
  ],
  async (req, res, next) => {
    try {
      // Validar datos de entrada
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: "Datos inválidos",
          details: errors.array(),
          code: "VALIDATION_ERROR",
        });
      }

      const { email, password } = req.body;

      // Intentar login
      const result = await AuthService.login(email, password);

      res.json({
        success: true,
        message: "Login exitoso",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Authentication]
 */
router.post(
  "/register",
  [
    body("email").isEmail().normalizeEmail().withMessage("Email inválido"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password debe tener al menos 6 caracteres"),
  ],
  async (req, res, next) => {
    try {
      // Solo permitir en desarrollo
      if (process.env.NODE_ENV === "production") {
        return res.status(403).json({
          success: false,
          error: "Registro no permitido en producción",
          code: "NOT_ALLOWED",
        });
      }

      // Validar datos de entrada
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: "Datos inválidos",
          details: errors.array(),
          code: "VALIDATION_ERROR",
        });
      }

      const { email, password } = req.body;

      // Crear admin
      const admin = await AuthService.createAdmin(email, password);

      res.status(201).json({
        success: true,
        message: "Admin creado exitosamente",
        data: {
          id: admin.id,
          email: admin.email,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 */
router.get("/me", async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Token requerido",
        code: "TOKEN_REQUIRED",
      });
    }

    const admin = await AuthService.verifyToken(token);

    res.json({
      success: true,
      data: {
        id: admin.id,
        email: admin.email,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
