const bcrypt = require("bcryptjs");
const { query, logger } = require("./connection");
require("dotenv").config();

const seedDatabase = async () => {
  try {
    logger.info("🌱 Iniciando seed de la base de datos...");

    // Limpiar datos existentes y resetear secuencias
    await query("DELETE FROM email_logs");
    await query("DELETE FROM bookings");
    await query("DELETE FROM time_slots");
    await query("DELETE FROM advisors");
    await query("DELETE FROM admins");

    // Resetear secuencias para que empiecen desde 1
    await query("ALTER SEQUENCE advisors_id_seq RESTART WITH 1");
    await query("ALTER SEQUENCE time_slots_id_seq RESTART WITH 1");
    await query("ALTER SEQUENCE bookings_id_seq RESTART WITH 1");
    await query("ALTER SEQUENCE email_logs_id_seq RESTART WITH 1");
    await query("ALTER SEQUENCE admins_id_seq RESTART WITH 1");

    // Crear asesores
    const advisors = [
      { name: "Dr. María García", timezone: "America/Mexico_City" },
      { name: "Dr. Carlos López", timezone: "America/Mexico_City" },
      { name: "Dra. Ana Martínez", timezone: "America/New_York" },
      { name: "Dr. Roberto Silva", timezone: "Europe/Madrid" },
    ];

    const advisorIds = [];
    for (const advisor of advisors) {
      const result = await query(
        "INSERT INTO advisors (name, timezone) VALUES ($1, $2) RETURNING id",
        [advisor.name, advisor.timezone]
      );
      advisorIds.push(result.rows[0].id);
    }

    logger.info(`✅ Creados ${advisors.length} asesores`);

    // Crear slots de tiempo para los próximos 30 días
    const now = new Date();
    const slots = [];

    for (
      let advisorIndex = 0;
      advisorIndex < advisorIds.length;
      advisorIndex++
    ) {
      const advisorId = advisorIds[advisorIndex];

      // Crear slots para los próximos 30 días
      for (let day = 0; day < 30; day++) {
        const currentDate = new Date(now);
        currentDate.setDate(now.getDate() + day);

        // Saltar fines de semana para algunos asesores
        if (day % 7 === 0 || day % 7 === 6) {
          if (advisorIndex % 2 === 0) continue; // Solo algunos asesores trabajan fines de semana
        }

        // Crear slots de 1 hora desde las 9 AM hasta las 6 PM
        for (let hour = 9; hour < 18; hour++) {
          const startTime = new Date(currentDate);
          startTime.setHours(hour, 0, 0, 0);

          const endTime = new Date(currentDate);
          endTime.setHours(hour + 1, 0, 0, 0);

          // Algunos slots aleatorios como "blocked" para simular horarios no disponibles
          const status = Math.random() < 0.1 ? "blocked" : "free";

          slots.push({
            advisor_id: advisorId,
            start_utc: startTime.toISOString(),
            end_utc: endTime.toISOString(),
            status,
          });
        }
      }
    }

    // Insertar slots en lotes
    for (const slot of slots) {
      await query(
        "INSERT INTO time_slots (advisor_id, start_utc, end_utc, status) VALUES ($1, $2, $3, $4)",
        [slot.advisor_id, slot.start_utc, slot.end_utc, slot.status]
      );
    }

    logger.info(`✅ Creados ${slots.length} slots de tiempo`);

    // Crear admin por defecto
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    await query("INSERT INTO admins (email, password_hash) VALUES ($1, $2)", [
      process.env.ADMIN_EMAIL || "admin@bookingapp.com",
      hashedPassword,
    ]);

    logger.info(
      "✅ Admin creado:",
      process.env.ADMIN_EMAIL || "admin@bookingapp.com"
    );

    // Obtener algunos slots disponibles para crear reservas de ejemplo
    const availableSlots = await query(
      "SELECT id, advisor_id FROM time_slots WHERE status = 'free' ORDER BY id LIMIT 2"
    );

    let bookingsCreated = 0;

    if (availableSlots.rows.length >= 2) {
      // Crear algunas reservas de ejemplo
      const sampleBookings = [
        {
          slot_id: availableSlots.rows[0].id,
          advisor_id: availableSlots.rows[0].advisor_id,
          client_name: "Juan Pérez",
          client_email: "juan@example.com",
        },
        {
          slot_id: availableSlots.rows[1].id,
          advisor_id: availableSlots.rows[1].advisor_id,
          client_name: "María González",
          client_email: "maria@example.com",
        },
      ];

      for (const booking of sampleBookings) {
        const result = await query(
          "INSERT INTO bookings (slot_id, advisor_id, client_name, client_email) VALUES ($1, $2, $3, $4) RETURNING id",
          [
            booking.slot_id,
            booking.advisor_id,
            booking.client_name,
            booking.client_email,
          ]
        );

        // Marcar el slot como booked
        await query("UPDATE time_slots SET status = $1 WHERE id = $2", [
          "booked",
          booking.slot_id,
        ]);

        // Crear log de email
        await query(
          "INSERT INTO email_logs (booking_id, type, status, sent_at) VALUES ($1, $2, $3, $4)",
          [result.rows[0].id, "confirmation", "sent", new Date().toISOString()]
        );
      }

      bookingsCreated = sampleBookings.length;
      logger.info(`✅ Creadas ${bookingsCreated} reservas de ejemplo`);
    } else {
      logger.info(
        "⚠️ No hay suficientes slots disponibles para crear reservas de ejemplo"
      );
    }

    logger.info("🎉 Seed completado exitosamente!");
    logger.info("\n📋 Datos creados:");
    logger.info(`- ${advisors.length} asesores`);
    logger.info(`- ${slots.length} slots de tiempo`);
    logger.info(`- 1 administrador`);
    logger.info(`- ${bookingsCreated} reservas de ejemplo`);
    logger.info("\n🔑 Credenciales admin:");
    logger.info(`Email: ${process.env.ADMIN_EMAIL || "admin@bookingapp.com"}`);
    logger.info(`Password: ${adminPassword}`);
  } catch (error) {
    logger.error("❌ Error en seed:", error);
    throw error;
  }
};

// Ejecutar seed si se llama directamente
if (require.main === module) {
  const { connectDB } = require("./connection");

  const runSeed = async () => {
    try {
      await connectDB();
      await seedDatabase();
      process.exit(0);
    } catch (error) {
      logger.error("Error:", error);
      process.exit(1);
    }
  };

  runSeed();
}

module.exports = { seedDatabase };
