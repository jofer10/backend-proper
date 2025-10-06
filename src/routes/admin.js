const express = require("express");
const { body, query, validationResult } = require("express-validator");
const { authenticateToken } = require("../middleware/auth");
const AdminService = require("../services/adminService");
const BookingService = require("../services/bookingService");
const emailService = require("../services/emailService");
const { requestLogger } = require("../middleware/errorHandler");

const router = express.Router();

// Aplicar logging y autenticación a todas las rutas
router.use(requestLogger);
router.use(authenticateToken);

/**
 * @swagger
 * /api/admin/bookings:
 *   get:
 *     tags: [Admin]
 */
router.get(
  "/bookings",
  [
    query("advisor_id")
      .optional()
      .isInt({ min: 1 })
      .withMessage("advisor_id debe ser un entero positivo"),
    query("status")
      .optional()
      .isIn(["confirmed", "cancelled", "completed"])
      .withMessage("status debe ser válido"),
    query("from_date")
      .optional()
      .isISO8601()
      .withMessage("from_date debe ser una fecha válida"),
    query("to_date")
      .optional()
      .isISO8601()
      .withMessage("to_date debe ser una fecha válida"),
  ],
  async (req, res, next) => {
    try {
      // Validar parámetros
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: "Parámetros inválidos",
          details: errors.array(),
          code: "VALIDATION_ERROR",
        });
      }

      const filters = {
        advisor_id: req.query.advisor_id
          ? parseInt(req.query.advisor_id)
          : null,
        status: req.query.status,
        from_date: req.query.from_date,
        to_date: req.query.to_date,
      };

      const bookings = await AdminService.getBookings(filters);

      res.json({
        success: true,
        data: bookings,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/admin/bookings/{id}:
 *   get:
 *     tags: [Admin]
 */
router.get("/bookings/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const bookingId = parseInt(id);

    if (isNaN(bookingId)) {
      return res.status(400).json({
        success: false,
        error: "ID de reserva inválido",
        code: "INVALID_ID",
      });
    }

    const bookings = await AdminService.getBookings({});
    const booking = bookings.find((b) => b.id === bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: "Reserva no encontrada",
        code: "NOT_FOUND",
      });
    }

    res.json({
      success: true,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/admin/bookings/{id}/resend-email:
 *   post:
 *     tags: [Admin]
 */
router.post("/bookings/:id/resend-email", async (req, res, next) => {
  try {
    const { id } = req.params;
    const bookingId = parseInt(id);

    if (isNaN(bookingId)) {
      return res.status(400).json({
        success: false,
        error: "ID de reserva inválido",
        code: "INVALID_ID",
      });
    }

    // Programar reenvío de email
    await AdminService.resendEmail(bookingId);

    // Intentar enviar email inmediatamente
    try {
      await emailService.resendConfirmationEmail(bookingId);
    } catch (emailError) {
      console.error("Error enviando email:", emailError);
    }

    res.json({
      success: true,
      message: "Email programado para reenvío",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/admin/bookings/{id}/status:
 *   put:
 *     tags: [Admin]
 */
router.put(
  "/bookings/:id/status",
  [
    body("status")
      .isIn(["confirmed", "cancelled", "completed"])
      .withMessage("status debe ser válido"),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: "Datos inválidos",
          details: errors.array(),
          code: "VALIDATION_ERROR",
        });
      }

      const { id } = req.params;
      const { status } = req.body;
      const bookingId = parseInt(id);

      if (isNaN(bookingId)) {
        return res.status(400).json({
          success: false,
          error: "ID de reserva inválido",
          code: "INVALID_ID",
        });
      }

      const result = await AdminService.updateBookingStatus(bookingId, status);

      res.json({
        success: true,
        message: "Estado actualizado exitosamente",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/admin/bookings/{id}:
 *   delete:
 *     tags: [Admin]
 */
router.delete("/bookings/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const bookingId = parseInt(id);

    if (isNaN(bookingId)) {
      return res.status(400).json({
        success: false,
        error: "ID de reserva inválido",
        code: "INVALID_ID",
      });
    }

    // Cancelar la reserva (cambiar estado a cancelled)
    await AdminService.updateBookingStatus(bookingId, "cancelled");

    res.json({
      success: true,
      message: "Reserva cancelada exitosamente",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     tags: [Admin]
 */
router.get("/stats", async (req, res, next) => {
  try {
    const stats = await AdminService.getStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/admin/email-logs:
 *   get:
 *     tags: [Admin]
 */
router.get(
  "/email-logs",
  [
    query("type")
      .optional()
      .isIn(["confirmation", "reminder_24h", "reminder_1h"])
      .withMessage("type debe ser válido"),
    query("status")
      .optional()
      .isIn(["pending", "sent", "failed"])
      .withMessage("status debe ser válido"),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: "Parámetros inválidos",
          details: errors.array(),
          code: "VALIDATION_ERROR",
        });
      }

      const filters = {
        type: req.query.type,
        status: req.query.status,
      };

      const emailLogs = await AdminService.getEmailLogs(filters);

      res.json({
        success: true,
        data: emailLogs,
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
