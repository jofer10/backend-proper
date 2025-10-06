const express = require("express");
const { body, query, validationResult } = require("express-validator");
const AdvisorService = require("../services/advisorService");
const BookingService = require("../services/bookingService");
const emailService = require("../services/emailService");
const { requestLogger } = require("../middleware/errorHandler");

const router = express.Router();

// Aplicar logging a todas las rutas
router.use(requestLogger);

/**
 * @swagger
 * /api/bookings/availability:
 *   get:
 *     tags: [Bookings]
 */
router.get(
  "/availability",
  [
    query("advisor_id")
      .isInt({ min: 1 })
      .withMessage("advisor_id debe ser un entero positivo"),
    query("from")
      .isISO8601()
      .withMessage("from debe ser una fecha válida (ISO 8601)"),
    query("to")
      .isISO8601()
      .withMessage("to debe ser una fecha válida (ISO 8601)"),
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

      const { advisor_id, from, to } = req.query;

      // Obtener disponibilidad
      const result = await AdvisorService.getAvailability(
        parseInt(advisor_id),
        from,
        to
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/bookings:
 *   post:
 *     tags: [Bookings]
 */
router.post(
  "/",
  [
    body("slot_id")
      .isInt({ min: 1 })
      .withMessage("slot_id debe ser un entero positivo"),
    body("client_name")
      .isLength({ min: 2, max: 255 })
      .withMessage("client_name debe tener entre 2 y 255 caracteres"),
    body("client_email")
      .isEmail()
      .withMessage("client_email debe ser un email válido"),
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

      const { slot_id, client_name, client_email } = req.body;

      // Crear la reserva
      const booking = await BookingService.create(
        slot_id,
        client_name,
        client_email
      );

      // Obtener datos completos para el email
      const bookingWithDetails = await BookingService.getClientBookings(
        client_email
      );
      const bookingData = bookingWithDetails.find(
        (b) => b.id === booking.booking_id
      );

      // Enviar email de confirmación
      try {
        if (bookingData) {
          await emailService.sendConfirmationEmail(bookingData);
        }
      } catch (emailError) {
        // No fallar la reserva si el email falla
        console.error("Error enviando email:", emailError);
      }

      res.status(201).json({
        success: true,
        message: "Reserva creada exitosamente",
        data: booking,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/bookings/advisors:
 *   get:
 *     tags: [Bookings]
 */
router.get("/advisors", async (req, res, next) => {
  try {
    const advisors = await AdvisorService.getAll();

    res.json({
      success: true,
      data: advisors,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/bookings/my-bookings:
 *   get:
 *     tags: [Bookings]
 */
router.get(
  "/my-bookings",
  [query("email").isEmail().withMessage("email debe ser válido")],
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

      const { email } = req.query;
      const bookings = await BookingService.getClientBookings(email);

      res.json({
        success: true,
        data: bookings,
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
