const { query, logger } = require("../database/connection");
const emailService = require("./emailService");

class ReminderService {
  constructor() {
    this.emailService = emailService;
  }

  // Enviar recordatorios de 24 horas
  async send24HourReminders() {
    try {
      logger.info("🔔 Iniciando envío de recordatorios de 24 horas...");

      // Obtener citas que están en 24 horas
      const result = await query(`
        SELECT 
          b.id,
          b.client_name,
          b.client_email,
          a.name as advisor_name,
          ts.start_utc,
          ts.end_utc
        FROM bookings b
        JOIN time_slots ts ON b.slot_id = ts.id
        JOIN advisors a ON b.advisor_id = a.id
        WHERE b.status = 'confirmed'
          AND ts.start_utc BETWEEN NOW() + INTERVAL '23 hours' AND NOW() + INTERVAL '25 hours'
          AND NOT EXISTS (
            SELECT 1 FROM email_logs el 
            WHERE el.booking_id = b.id 
            AND el.type = 'reminder_24h' 
            AND el.status = 'sent'
          )
      `);

      let sentCount = 0;
      let errorCount = 0;

      for (const booking of result.rows) {
        try {
          await this.emailService.sendReminderEmail(booking, "reminder_24h");
          sentCount++;
          logger.info(`✅ Recordatorio 24h enviado para booking ${booking.id}`);
        } catch (error) {
          errorCount++;
          logger.error(
            `❌ Error enviando recordatorio 24h para booking ${booking.id}:`,
            error
          );
        }
      }

      logger.info(
        `📊 Recordatorios 24h: ${sentCount} enviados, ${errorCount} errores`
      );
      return { sent: sentCount, errors: errorCount };
    } catch (error) {
      logger.error("❌ Error en envío de recordatorios 24h:", error);
      throw error;
    }
  }

  // Enviar recordatorios de 1 hora
  async send1HourReminders() {
    try {
      logger.info("🔔 Iniciando envío de recordatorios de 1 hora...");

      // Obtener citas que están en 1 hora
      const result = await query(`
        SELECT 
          b.id,
          b.client_name,
          b.client_email,
          a.name as advisor_name,
          ts.start_utc,
          ts.end_utc
        FROM bookings b
        JOIN time_slots ts ON b.slot_id = ts.id
        JOIN advisors a ON b.advisor_id = a.id
        WHERE b.status = 'confirmed'
          AND ts.start_utc BETWEEN NOW() + INTERVAL '55 minutes' AND NOW() + INTERVAL '65 minutes'
          AND NOT EXISTS (
            SELECT 1 FROM email_logs el 
            WHERE el.booking_id = b.id 
            AND el.type = 'reminder_1h' 
            AND el.status = 'sent'
          )
      `);

      let sentCount = 0;
      let errorCount = 0;

      for (const booking of result.rows) {
        try {
          await this.emailService.sendReminderEmail(booking, "reminder_1h");
          sentCount++;
          logger.info(`✅ Recordatorio 1h enviado para booking ${booking.id}`);
        } catch (error) {
          errorCount++;
          logger.error(
            `❌ Error enviando recordatorio 1h para booking ${booking.id}:`,
            error
          );
        }
      }

      logger.info(
        `📊 Recordatorios 1h: ${sentCount} enviados, ${errorCount} errores`
      );
      return { sent: sentCount, errors: errorCount };
    } catch (error) {
      logger.error("❌ Error en envío de recordatorios 1h:", error);
      throw error;
    }
  }

  // Procesar todos los recordatorios pendientes
  async processAllReminders() {
    try {
      logger.info("🚀 Procesando todos los recordatorios...");

      const results24h = await this.send24HourReminders();
      const results1h = await this.send1HourReminders();

      const totalSent = results24h.sent + results1h.sent;
      const totalErrors = results24h.errors + results1h.errors;

      logger.info(
        `📊 Total recordatorios: ${totalSent} enviados, ${totalErrors} errores`
      );

      return {
        reminder_24h: results24h,
        reminder_1h: results1h,
        total: { sent: totalSent, errors: totalErrors },
      };
    } catch (error) {
      logger.error("❌ Error procesando recordatorios:", error);
      throw error;
    }
  }
}

module.exports = ReminderService;
