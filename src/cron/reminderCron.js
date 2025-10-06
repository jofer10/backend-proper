const cron = require("node-cron");
const ReminderService = require("../services/reminderService");
const { logger } = require("../database/connection");

class ReminderCron {
  constructor() {
    this.reminderService = new ReminderService();
    this.isRunning = false;
  }

  // Iniciar el cron job
  start() {
    if (this.isRunning) {
      logger.warn("⚠️ Cron de recordatorios ya está ejecutándose");
      return;
    }

    logger.info("🚀 Iniciando cron de recordatorios...");

    // Ejecutar cada 5 minutos
    this.task = cron.schedule(
      "*/5 * * * *",
      async () => {
        try {
          logger.info("⏰ Ejecutando verificación de recordatorios...");
          await this.reminderService.processAllReminders();
        } catch (error) {
          logger.error("❌ Error en cron de recordatorios:", error);
        }
      },
      {
        scheduled: false,
      }
    );

    this.task.start();
    this.isRunning = true;
    logger.info("✅ Cron de recordatorios iniciado (cada 5 minutos)");
  }

  // Detener el cron job
  stop() {
    if (!this.isRunning) {
      logger.warn("⚠️ Cron de recordatorios no está ejecutándose");
      return;
    }

    this.task.stop();
    this.isRunning = false;
    logger.info("🛑 Cron de recordatorios detenido");
  }

  // Verificar estado
  getStatus() {
    return {
      isRunning: this.isRunning,
      nextRun: this.isRunning ? this.task.nextDate() : null,
    };
  }

  // Ejecutar manualmente
  async runManually() {
    try {
      logger.info("🔧 Ejecutando recordatorios manualmente...");
      const results = await this.reminderService.processAllReminders();
      logger.info("✅ Recordatorios ejecutados manualmente:", results);
      return results;
    } catch (error) {
      logger.error("❌ Error ejecutando recordatorios manualmente:", error);
      throw error;
    }
  }
}

module.exports = ReminderCron;
