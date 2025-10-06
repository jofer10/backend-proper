const nodemailer = require("nodemailer");
const { query, logger } = require("../database/connection");

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false, // true para 465, false para otros puertos
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  // Enviar email de confirmación
  async sendConfirmationEmail(booking) {
    try {
      logger.info("Enviando email de confirmación", {
        bookingId: booking.id,
        email: booking.client_email,
      });

      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: booking.client_email,
        subject: `Confirmación de cita - ${booking.advisor_name}`,
        html: this.generateConfirmationHTML(booking),
      };

      await this.transporter.sendMail(mailOptions);

      // Actualizar log de email
      await this.updateEmailLog(booking.id, "confirmation", "sent");

      logger.info("Email de confirmación enviado exitosamente", {
        bookingId: booking.id,
        email: booking.client_email,
      });

      return { success: true };
    } catch (error) {
      logger.error("Error enviando email de confirmación:", error);

      // Actualizar log de email como fallido
      await this.updateEmailLog(
        booking.id,
        "confirmation",
        "failed",
        error.message
      );

      throw error;
    }
  }

  // Enviar email de recordatorio
  async sendReminderEmail(booking, type = "reminder_24h") {
    try {
      logger.info("Enviando email de recordatorio", {
        bookingId: booking.id,
        email: booking.client_email,
        type,
      });

      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: booking.client_email,
        subject: `Recordatorio de cita - ${booking.advisor_name}`,
        html: this.generateReminderHTML(booking, type),
      };

      await this.transporter.sendMail(mailOptions);

      // Actualizar log de email
      await this.updateEmailLog(booking.id, type, "sent");

      logger.info("Email de recordatorio enviado exitosamente", {
        bookingId: booking.id,
        email: booking.client_email,
        type,
      });

      return { success: true };
    } catch (error) {
      logger.error("Error enviando email de recordatorio:", error);

      // Actualizar log de email como fallido
      await this.updateEmailLog(booking.id, type, "failed", error.message);

      throw error;
    }
  }

  // Reenviar email de confirmación
  async resendConfirmationEmail(bookingId) {
    try {
      // Obtener datos de la reserva
      const result = await query(
        `
        SELECT 
          b.*,
          ts.start_utc,
          ts.end_utc,
          a.name as advisor_name,
          a.timezone as advisor_timezone
        FROM bookings b
        JOIN time_slots ts ON b.slot_id = ts.id
        JOIN advisors a ON b.advisor_id = a.id
        WHERE b.id = $1
      `,
        [bookingId]
      );

      if (result.rows.length === 0) {
        throw new Error("Reserva no encontrada");
      }

      const booking = result.rows[0];
      return await this.sendConfirmationEmail(booking);
    } catch (error) {
      logger.error("Error reenviando email:", error);
      throw error;
    }
  }

  // Actualizar log de email
  async updateEmailLog(bookingId, type, status, errorMessage = null) {
    try {
      await query(
        `
        INSERT INTO email_logs (booking_id, type, status, error_message, sent_at)
        VALUES ($1, $2, $3, $4, $5)
      `,
        [
          bookingId,
          type,
          status,
          errorMessage,
          status === "sent" ? new Date() : null,
        ]
      );
    } catch (error) {
      logger.error("Error actualizando log de email:", error);
    }
  }

  // Generar HTML de confirmación
  generateConfirmationHTML(booking) {
    const startDate = new Date(booking.start_utc);
    const endDate = new Date(booking.end_utc);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Confirmación de Cita</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .booking-details { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Cita Confirmada</h1>
          </div>
          <div class="content">
            <h2>Hola ${booking.client_name},</h2>
            <p>Tu cita ha sido confirmada exitosamente. Aquí están los detalles:</p>
            
            <div class="booking-details">
              <h3>📅 Detalles de la Cita</h3>
              <p><strong>Asesor:</strong> ${booking.advisor_name}</p>
              <p><strong>Fecha y Hora:</strong> ${startDate.toLocaleString(
                "es-ES",
                {
                  timeZone: booking.advisor_timezone,
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                }
              )}</p>
              <p><strong>Duración:</strong> 1 hora</p>
              <p><strong>ID de Reserva:</strong> #${booking.id}</p>
            </div>
            
            <p>Por favor, llega 5 minutos antes de tu cita programada.</p>
            <p>Si necesitas cancelar o reprogramar, contáctanos con al menos 24 horas de anticipación.</p>
          </div>
          <div class="footer">
            <p>Este es un email automático, por favor no respondas.</p>
            <p>© 2024 Sistema de Reservas</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Generar HTML de recordatorio
  generateReminderHTML(booking, type) {
    const startDate = new Date(booking.start_utc);
    const is24h = type === "reminder_24h";
    const timeText = is24h ? "24 horas" : "1 hora";

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Recordatorio de Cita</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #FF9800; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .booking-details { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Recordatorio de Cita</h1>
          </div>
          <div class="content">
            <h2>Hola ${booking.client_name},</h2>
            <p>Te recordamos que tienes una cita en ${timeText}:</p>
            
            <div class="booking-details">
              <h3>📅 Detalles de la Cita</h3>
              <p><strong>Asesor:</strong> ${booking.advisor_name}</p>
              <p><strong>Fecha y Hora:</strong> ${startDate.toLocaleString(
                "es-ES",
                {
                  timeZone: booking.advisor_timezone,
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                }
              )}</p>
              <p><strong>ID de Reserva:</strong> #${booking.id}</p>
            </div>
            
            <p>Por favor, llega 5 minutos antes de tu cita programada.</p>
          </div>
          <div class="footer">
            <p>Este es un email automático, por favor no respondas.</p>
            <p>© 2024 Sistema de Reservas</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Probar conexión de email
  async testConnection() {
    try {
      await this.transporter.verify();
      logger.info("✅ Conexión de email verificada");
      return true;
    } catch (error) {
      logger.error("❌ Error verificando conexión de email:", error);
      return false;
    }
  }
}

module.exports = new EmailService();
