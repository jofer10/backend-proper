const express = require("express");
const router = express.Router();
const ReminderCron = require("../cron/reminderCron");
const ReminderService = require("../services/reminderService");
const { logger } = require("../database/connection");

// Instancia global del cron
let reminderCron = null;

// Inicializar cron si no existe
const initCron = () => {
  if (!reminderCron) {
    reminderCron = new ReminderCron();
  }
  return reminderCron;
};

// GET /api/reminders/status - Estado del sistema de recordatorios
router.get("/status", (req, res) => {
  try {
    const cron = initCron();
    const status = cron.getStatus();

    res.json({
      success: true,
      data: {
        isRunning: status.isRunning,
        nextRun: status.nextRun,
        message: status.isRunning
          ? "Sistema de recordatorios activo"
          : "Sistema de recordatorios inactivo",
      },
    });
  } catch (error) {
    logger.error("Error obteniendo estado de recordatorios:", error);
    res.status(500).json({
      success: false,
      message: "Error obteniendo estado de recordatorios",
      error: error.message,
    });
  }
});

// POST /api/reminders/start - Iniciar sistema de recordatorios
router.post("/start", (req, res) => {
  try {
    const cron = initCron();
    cron.start();

    logger.info("Sistema de recordatorios iniciado manualmente");
    res.json({
      success: true,
      message: "Sistema de recordatorios iniciado correctamente",
    });
  } catch (error) {
    logger.error("Error iniciando sistema de recordatorios:", error);
    res.status(500).json({
      success: false,
      message: "Error iniciando sistema de recordatorios",
      error: error.message,
    });
  }
});

// POST /api/reminders/stop - Detener sistema de recordatorios
router.post("/stop", (req, res) => {
  try {
    const cron = initCron();
    cron.stop();

    logger.info("Sistema de recordatorios detenido manualmente");
    res.json({
      success: true,
      message: "Sistema de recordatorios detenido correctamente",
    });
  } catch (error) {
    logger.error("Error deteniendo sistema de recordatorios:", error);
    res.status(500).json({
      success: false,
      message: "Error deteniendo sistema de recordatorios",
      error: error.message,
    });
  }
});

// POST /api/reminders/run - Ejecutar recordatorios manualmente
router.post("/run", async (req, res) => {
  try {
    const cron = initCron();
    const results = await cron.runManually();

    logger.info("Recordatorios ejecutados manualmente:", results);
    res.json({
      success: true,
      message: "Recordatorios ejecutados correctamente",
      data: results,
    });
  } catch (error) {
    logger.error("Error ejecutando recordatorios manualmente:", error);
    res.status(500).json({
      success: false,
      message: "Error ejecutando recordatorios",
      error: error.message,
    });
  }
});

// GET /api/reminders/test - Probar sistema de recordatorios
router.get("/test", async (req, res) => {
  try {
    const reminderService = new ReminderService();

    // Ejecutar solo recordatorios de 24h para prueba
    const results = await reminderService.send24HourReminders();

    res.json({
      success: true,
      message: "Prueba de recordatorios ejecutada",
      data: results,
    });
  } catch (error) {
    logger.error("Error en prueba de recordatorios:", error);
    res.status(500).json({
      success: false,
      message: "Error en prueba de recordatorios",
      error: error.message,
    });
  }
});

module.exports = router;
