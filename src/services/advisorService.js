const { callProcedure, logger } = require("../database/connection");

class AdvisorService {
  // Obtener todos los asesores
  static async getAll() {
    const result = await callProcedure("sp_get_advisors");

    if (result.sql_err !== "0") {
      throw new Error(result.sql_msn);
    }

    return result.data || [];
  }

  // Obtener disponibilidad de un asesor
  static async getAvailability(advisorId, fromDate, toDate) {
    const result = await callProcedure("sp_get_availability", [
      advisorId,
      fromDate,
      toDate,
    ]);

    if (result.sql_err !== "0") {
      throw new Error(result.sql_msn);
    }

    return result.data;
  }
}

module.exports = AdvisorService;
