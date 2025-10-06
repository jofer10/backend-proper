const { callProcedure, logger } = require("../database/connection");

class BookingService {
  // Crear una nueva reserva
  static async create(slotId, clientName, clientEmail) {
    const result = await callProcedure("sp_create_booking", [
      slotId,
      clientName,
      clientEmail,
    ]);

    if (result.sql_err !== "0") {
      throw new Error(result.sql_msn);
    }

    return result.data;
  }

  // Obtener reservas de un cliente
  static async getClientBookings(clientEmail) {
    const result = await callProcedure("sp_get_client_bookings", [clientEmail]);

    if (result.sql_err !== "0") {
      throw new Error(result.sql_msn);
    }

    return result.data || [];
  }

  // Obtener reservas para admin (con filtros)
  static async getAdminBookings(filters = {}) {
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

  // Actualizar estado de una reserva
  static async updateStatus(bookingId, status) {
    const result = await callProcedure("sp_update_booking_status", [
      bookingId,
      status,
    ]);

    if (result.sql_err !== "0") {
      throw new Error(result.sql_msn);
    }

    return result.data;
  }

  // Reenviar email de confirmación
  static async resendEmail(bookingId) {
    const result = await callProcedure("sp_resend_email", [bookingId]);

    if (result.sql_err !== "0") {
      throw new Error(result.sql_msn);
    }

    return result.data;
  }
}

module.exports = BookingService;
