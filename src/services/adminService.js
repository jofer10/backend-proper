const { callProcedure, logger } = require("../database/connection");

class AdminService {
  // Obtener estadísticas generales
  static async getStats() {
    const result = await callProcedure("sp_get_admin_stats");

    if (result.sql_err !== "0") {
      throw new Error(result.sql_msn);
    }

    return result.data;
  }

  // Obtener logs de email
  static async getEmailLogs(filters = {}) {
    const result = await callProcedure("sp_get_email_logs", [
      filters.type || null,
      filters.status || null,
    ]);

    if (result.sql_err !== "0") {
      throw new Error(result.sql_msn);
    }

    return result.data || [];
  }

  // Obtener reservas con filtros
  static async getBookings(filters = {}) {
    const result = await callProcedure("sp_get_admin_bookings", [
      filters.advisor_id || null,
      filters.status || null,
      filters.from_date || null,
      filters.to_date || null,
    ]);

    if (result.sql_err !== "0") {
      throw new Error(result.sql_msn);
    }

    return result.data || [];
  }

  // Reenviar email de confirmación
  static async resendEmail(bookingId) {
    const result = await callProcedure("sp_resend_email", [bookingId]);

    if (result.sql_err !== "0") {
      throw new Error(result.sql_msn);
    }

    return result.data;
  }

  // Actualizar estado de reserva
  static async updateBookingStatus(bookingId, status) {
    const result = await callProcedure("sp_update_booking_status", [
      bookingId,
      status,
    ]);

    if (result.sql_err !== "0") {
      throw new Error(result.sql_msn);
    }

    return result.data;
  }
}

module.exports = AdminService;
