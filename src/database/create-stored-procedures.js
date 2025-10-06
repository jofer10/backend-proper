const { connectDB, logger } = require("./connection");
require("dotenv").config();

const createStoredProcedures = async () => {
  try {
    logger.info("🔧 Creando stored procedures...");

    const { query } = require("./connection");

    // 1. SP para obtener asesores
    await query(`
      CREATE OR REPLACE FUNCTION sp_get_advisors()
      RETURNS JSON
      LANGUAGE plpgsql
      AS $$
      DECLARE
          v_result JSON;
          v_mensaje TEXT;
      BEGIN
          -- Obtener todos los asesores
          SELECT json_build_object(
              'sql_err', '0',
              'sql_msn', 'Asesores obtenidos exitosamente',
              'data', COALESCE(
                  json_agg(
                      json_build_object(
                          'id', id,
                          'name', name,
                          'timezone', timezone,
                          'created_at', created_at
                      ) ORDER BY id
                  ), 
                  '[]'::json
              )
          ) INTO v_result
          FROM advisors;
          
          RETURN v_result;
      EXCEPTION
          WHEN OTHERS THEN
              RETURN json_build_object(
                  'sql_err', SQLSTATE,
                  'sql_msn', SQLERRM
              );
      END;
      $$;
    `);

    // 2. SP para obtener disponibilidad
    await query(`
      CREATE OR REPLACE FUNCTION sp_get_availability(
          vp_advisor_id INTEGER,
          vp_from_date TIMESTAMP,
          vp_to_date TIMESTAMP
      )
      RETURNS JSON
      LANGUAGE plpgsql
      AS $$
      DECLARE
          v_result JSON;
          v_mensaje TEXT;
      BEGIN
          -- Validaciones iniciales
          IF COALESCE(vp_advisor_id, 0) = 0 THEN
              RAISE EXCEPTION 'Error: ID de asesor inválido.';
          END IF;
          
          IF vp_from_date IS NULL OR vp_to_date IS NULL THEN
              RAISE EXCEPTION 'Error: Fechas de consulta inválidas.';
          END IF;
          
          IF vp_from_date >= vp_to_date THEN
              RAISE EXCEPTION 'Error: La fecha de inicio debe ser menor a la fecha de fin.';
          END IF;
          
          -- Verificar que el asesor existe
          IF NOT EXISTS (SELECT 1 FROM advisors WHERE id = vp_advisor_id) THEN
              RAISE EXCEPTION 'Error: Asesor no encontrado.';
          END IF;
          
          -- Obtener disponibilidad
          SELECT json_build_object(
              'sql_err', '0',
              'sql_msn', 'Disponibilidad obtenida exitosamente',
              'data', (
                  SELECT json_build_object(
                      'id', a.id,
                      'name', a.name,
                      'timezone', a.timezone,
                      'available_slots', COALESCE(
                          (
                              SELECT json_agg(
                                  json_build_object(
                                      'id', ts.id,
                                      'start_utc', ts.start_utc,
                                      'end_utc', ts.end_utc,
                                      'status', ts.status
                                  ) ORDER BY ts.start_utc
                              )
                              FROM time_slots ts
                              WHERE ts.advisor_id = vp_advisor_id
                                AND ts.start_utc >= vp_from_date
                                AND ts.end_utc <= vp_to_date
                                AND ts.status = 'free'
                          ),
                          '[]'::json
                      )
                  )
                  FROM advisors a
                  WHERE a.id = vp_advisor_id
              )
          ) INTO v_result;
          
          RETURN v_result;
      EXCEPTION
          WHEN OTHERS THEN
              RETURN json_build_object(
                  'sql_err', SQLSTATE,
                  'sql_msn', SQLERRM
              );
      END;
      $$;
    `);

    // 3. SP para crear reserva
    await query(`
      CREATE OR REPLACE FUNCTION sp_create_booking(
          vp_slot_id INTEGER,
          vp_client_name VARCHAR(255),
          vp_client_email VARCHAR(255)
      )
      RETURNS JSON
      LANGUAGE plpgsql
      AS $$
      DECLARE
          v_result JSON;
          v_mensaje TEXT;
          v_booking_id INTEGER;
          v_advisor_id INTEGER;
          v_slot_status VARCHAR(20);
      BEGIN
          -- Validaciones iniciales
          IF COALESCE(vp_slot_id, 0) = 0 THEN
              RAISE EXCEPTION 'Error: ID de slot inválido.';
          END IF;
          
          IF TRIM(COALESCE(vp_client_name, '')) = '' THEN
              RAISE EXCEPTION 'Error: Nombre del cliente inválido.';
          END IF;
          
          IF TRIM(COALESCE(vp_client_email, '')) = '' THEN
              RAISE EXCEPTION 'Error: Email del cliente inválido.';
          END IF;
          
          -- Validar formato de email
          IF vp_client_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$' THEN
              RAISE EXCEPTION 'Error: Formato de email inválido.';
          END IF;
          
          -- Obtener información del slot y verificar disponibilidad
          SELECT ts.status, ts.advisor_id
          INTO v_slot_status, v_advisor_id
          FROM time_slots ts
          WHERE ts.id = vp_slot_id
          FOR UPDATE;
          
          IF NOT FOUND THEN
              RAISE EXCEPTION 'Error: Slot no encontrado.';
          END IF;
          
          IF v_slot_status != 'free' THEN
              RAISE EXCEPTION 'Error: Slot no disponible.';
          END IF;
          
          -- Crear la reserva
          INSERT INTO bookings (slot_id, advisor_id, client_name, client_email)
          VALUES (vp_slot_id, v_advisor_id, TRIM(vp_client_name), LOWER(TRIM(vp_client_email)))
          RETURNING id INTO v_booking_id;
          
          -- Marcar el slot como reservado
          UPDATE time_slots 
          SET status = 'booked', updated_at = CURRENT_TIMESTAMP
          WHERE id = vp_slot_id;
          
          -- Crear log de email
          INSERT INTO email_logs (booking_id, type, status)
          VALUES (v_booking_id, 'confirmation', 'pending');
          
          -- Obtener datos de la reserva creada
          SELECT json_build_object(
              'sql_err', '0',
              'sql_msn', 'Reserva creada exitosamente',
              'data', json_build_object(
                  'booking_id', v_booking_id,
                  'client_name', vp_client_name,
                  'client_email', vp_client_email,
                  'status', 'confirmed',
                  'created_at', CURRENT_TIMESTAMP
              )
          ) INTO v_result;
          
          RETURN v_result;
      EXCEPTION
          WHEN OTHERS THEN
              RETURN json_build_object(
                  'sql_err', SQLSTATE,
                  'sql_msn', SQLERRM
              );
      END;
      $$;
    `);

    // 4. SP para obtener reservas del cliente
    await query(`
      CREATE OR REPLACE FUNCTION sp_get_client_bookings(
          vp_client_email VARCHAR(255)
      )
      RETURNS JSON
      LANGUAGE plpgsql
      AS $$
      DECLARE
          v_result JSON;
      BEGIN
          -- Validaciones iniciales
          IF TRIM(COALESCE(vp_client_email, '')) = '' THEN
              RAISE EXCEPTION 'Error: Email del cliente inválido.';
          END IF;
          
          -- Obtener reservas del cliente
          SELECT json_build_object(
              'sql_err', '0',
              'sql_msn', 'Reservas obtenidas exitosamente',
              'data', COALESCE(
                  json_agg(
                      json_build_object(
                          'id', b.id,
                          'client_name', b.client_name,
                          'client_email', b.client_email,
                          'advisor_name', a.name,
                          'start_utc', ts.start_utc,
                          'end_utc', ts.end_utc,
                          'status', b.status,
                          'created_at', b.created_at
                      ) ORDER BY ts.start_utc ASC
                  ), 
                  '[]'::json
              )
          ) INTO v_result
          FROM bookings b
          JOIN time_slots ts ON b.slot_id = ts.id
          JOIN advisors a ON b.advisor_id = a.id
          WHERE b.client_email = LOWER(TRIM(vp_client_email));
          
          RETURN v_result;
      EXCEPTION
          WHEN OTHERS THEN
              RETURN json_build_object(
                  'sql_err', SQLSTATE,
                  'sql_msn', SQLERRM
              );
      END;
      $$;
    `);

    // 5. SP para autenticación de admin
    await query(`
      CREATE OR REPLACE FUNCTION sp_admin_login(
          vp_email VARCHAR(255),
          vp_password VARCHAR(255)
      )
      RETURNS JSON
      LANGUAGE plpgsql
      AS $$
      DECLARE
          v_result JSON;
          v_admin_id INTEGER;
          v_stored_hash VARCHAR(255);
      BEGIN
          -- Validaciones iniciales
          IF TRIM(COALESCE(vp_email, '')) = '' THEN
              RAISE EXCEPTION 'Error: Email inválido.';
          END IF;
          
          IF TRIM(COALESCE(vp_password, '')) = '' THEN
              RAISE EXCEPTION 'Error: Contraseña inválida.';
          END IF;
          
          -- Buscar admin por email
          SELECT id, password_hash
          INTO v_admin_id, v_stored_hash
          FROM admins
          WHERE email = LOWER(TRIM(vp_email));
          
          IF NOT FOUND THEN
              RAISE EXCEPTION 'Error: Credenciales inválidas.';
          END IF;
          
          -- Verificar contraseña (se hará en el código Node.js con bcrypt)
          -- Por ahora solo retornamos el admin_id para verificar en Node.js
          SELECT json_build_object(
              'sql_err', '0',
              'sql_msn', 'Admin encontrado',
              'data', json_build_object(
                  'admin_id', v_admin_id,
                  'email', vp_email,
                  'password_hash', v_stored_hash
              )
          ) INTO v_result;
          
          RETURN v_result;
      EXCEPTION
          WHEN OTHERS THEN
              RETURN json_build_object(
                  'sql_err', SQLSTATE,
                  'sql_msn', SQLERRM
              );
      END;
      $$;
    `);

    // 5.1. SP para verificar admin por email (para tokens)
    await query(`
      CREATE OR REPLACE FUNCTION sp_admin_verify(
          vp_email VARCHAR(255)
      )
      RETURNS JSON
      LANGUAGE plpgsql
      AS $$
      DECLARE
          v_result JSON;
          v_admin_id INTEGER;
      BEGIN
          -- Validaciones iniciales
          IF TRIM(COALESCE(vp_email, '')) = '' THEN
              RAISE EXCEPTION 'Error: Email inválido.';
          END IF;

          -- Buscar admin por email
          SELECT id INTO v_admin_id
          FROM admins 
          WHERE email = LOWER(TRIM(vp_email));
          
          -- Verificar si existe
          IF v_admin_id IS NULL THEN
              RAISE EXCEPTION 'Error: Usuario no encontrado.';
          END IF;
          
          -- Retornar datos del admin
          SELECT json_build_object(
              'sql_err', '0',
              'sql_msn', 'Admin verificado',
              'data', json_build_object(
                  'admin_id', v_admin_id,
                  'email', vp_email
              )
          ) INTO v_result;
          
          RETURN v_result;
      EXCEPTION
          WHEN OTHERS THEN
              RETURN json_build_object(
                  'sql_err', SQLSTATE,
                  'sql_msn', SQLERRM
              );
      END;
      $$;
    `);

    // 5.2. SP para crear admin
    await query(`
      CREATE OR REPLACE FUNCTION sp_create_admin(
          vp_email VARCHAR(255),
          vp_password_hash VARCHAR(255)
      )
      RETURNS JSON
      LANGUAGE plpgsql
      AS $$
      DECLARE
          v_result JSON;
          v_admin_id INTEGER;
      BEGIN
          -- Validaciones iniciales
          IF TRIM(COALESCE(vp_email, '')) = '' THEN
              RAISE EXCEPTION 'Error: Email inválido.';
          END IF;
          
          IF TRIM(COALESCE(vp_password_hash, '')) = '' THEN
              RAISE EXCEPTION 'Error: Hash de contraseña inválido.';
          END IF;
          
          -- Verificar si el email ya existe
          IF EXISTS (SELECT 1 FROM admins WHERE email = LOWER(TRIM(vp_email))) THEN
              RAISE EXCEPTION 'Error: El email ya está registrado.';
          END IF;
          
          -- Crear el admin
          INSERT INTO admins (email, password_hash)
          VALUES (LOWER(TRIM(vp_email)), vp_password_hash)
          RETURNING id INTO v_admin_id;
          
          -- Retornar datos del admin creado
          SELECT json_build_object(
              'sql_err', '0',
              'sql_msn', 'Admin creado exitosamente',
              'data', json_build_object(
                  'admin_id', v_admin_id,
                  'email', LOWER(TRIM(vp_email))
              )
          ) INTO v_result;
          
          RETURN v_result;
      EXCEPTION
          WHEN OTHERS THEN
              RETURN json_build_object(
                  'sql_err', SQLSTATE,
                  'sql_msn', SQLERRM
              );
      END;
      $$;
    `);

    // 6. SP para obtener reservas (admin)
    await query(`
      CREATE OR REPLACE FUNCTION sp_get_admin_bookings(
          vp_advisor_id INTEGER DEFAULT NULL,
          vp_status VARCHAR(20) DEFAULT NULL,
          vp_from_date TIMESTAMP DEFAULT NULL,
          vp_to_date TIMESTAMP DEFAULT NULL
      )
      RETURNS JSON
      LANGUAGE plpgsql
      AS $$
      DECLARE
          v_result JSON;
      BEGIN
          -- Obtener reservas con filtros
          SELECT json_build_object(
              'sql_err', '0',
              'sql_msn', 'Reservas obtenidas exitosamente',
              'data', COALESCE(
                  json_agg(
                      json_build_object(
                          'id', b.id,
                          'client_name', b.client_name,
                          'client_email', b.client_email,
                          'advisor_name', a.name,
                          'start_utc', ts.start_utc,
                          'end_utc', ts.end_utc,
                          'status', b.status,
                          'created_at', b.created_at
                      ) ORDER BY ts.start_utc ASC
                  ), 
                  '[]'::json
              )
          ) INTO v_result
          FROM bookings b
          JOIN time_slots ts ON b.slot_id = ts.id
          JOIN advisors a ON b.advisor_id = a.id
          WHERE (vp_advisor_id IS NULL OR b.advisor_id = vp_advisor_id)
            AND (vp_status IS NULL OR b.status = vp_status)
            AND (vp_from_date IS NULL OR DATE(ts.start_utc) >= DATE(vp_from_date))
            AND (vp_to_date IS NULL OR DATE(ts.start_utc) <= DATE(vp_to_date));
          
          RETURN v_result;
      EXCEPTION
          WHEN OTHERS THEN
              RETURN json_build_object(
                  'sql_err', SQLSTATE,
                  'sql_msn', SQLERRM
              );
      END;
      $$;
    `);

    // 7. SP para reenviar email
    await query(`
      CREATE OR REPLACE FUNCTION sp_resend_email(
          vp_booking_id INTEGER
      )
      RETURNS JSON
      LANGUAGE plpgsql
      AS $$
      DECLARE
          v_result JSON;
          v_booking_exists BOOLEAN;
      BEGIN
          -- Validaciones iniciales
          IF COALESCE(vp_booking_id, 0) = 0 THEN
              RAISE EXCEPTION 'Error: ID de reserva inválido.';
          END IF;
          
          -- Verificar que la reserva existe
          SELECT EXISTS(SELECT 1 FROM bookings WHERE id = vp_booking_id)
          INTO v_booking_exists;
          
          IF NOT v_booking_exists THEN
              RAISE EXCEPTION 'Error: Reserva no encontrada.';
          END IF;
          
          -- Crear nuevo log de email
          INSERT INTO email_logs (booking_id, type, status)
          VALUES (vp_booking_id, 'confirmation', 'pending');
          
          SELECT json_build_object(
              'sql_err', '0',
              'sql_msn', 'Email programado para reenvío',
              'data', json_build_object(
                  'booking_id', vp_booking_id,
                  'status', 'pending'
              )
          ) INTO v_result;
          
          RETURN v_result;
      EXCEPTION
          WHEN OTHERS THEN
              RETURN json_build_object(
                  'sql_err', SQLSTATE,
                  'sql_msn', SQLERRM
              );
      END;
      $$;
    `);

    // 8. SP para actualizar estado de reserva
    await query(`
      CREATE OR REPLACE FUNCTION sp_update_booking_status(
          vp_booking_id INTEGER,
          vp_status VARCHAR(20)
      )
      RETURNS JSON
      LANGUAGE plpgsql
      AS $$
      DECLARE
          v_result JSON;
          v_booking_exists BOOLEAN;
          v_current_status VARCHAR(20);
          v_slot_id INTEGER;
      BEGIN
          -- Validaciones iniciales
          IF COALESCE(vp_booking_id, 0) = 0 THEN
              RAISE EXCEPTION 'Error: ID de reserva inválido.';
          END IF;
          
          IF vp_status NOT IN ('confirmed', 'cancelled', 'completed') THEN
              RAISE EXCEPTION 'Error: Estado de reserva inválido.';
          END IF;
          
          -- Verificar que la reserva existe y obtener datos
          SELECT EXISTS(SELECT 1 FROM bookings WHERE id = vp_booking_id),
                 (SELECT status FROM bookings WHERE id = vp_booking_id),
                 (SELECT slot_id FROM bookings WHERE id = vp_booking_id)
          INTO v_booking_exists, v_current_status, v_slot_id;
          
          IF NOT v_booking_exists THEN
              RAISE EXCEPTION 'Error: Reserva no encontrada.';
          END IF;
          
          -- Verificar que el nuevo estado sea diferente al actual
          IF v_current_status = vp_status THEN
              RAISE EXCEPTION 'Error: El estado de la reserva ya es %. No se puede cambiar al mismo estado.', vp_status;
          END IF;
          
          -- Actualizar estado de la reserva
          UPDATE bookings 
          SET status = vp_status, updated_at = CURRENT_TIMESTAMP
          WHERE id = vp_booking_id;
          
          -- Manejar estado del slot según el estado de la reserva
          IF vp_status = 'cancelled' THEN
              -- Si se cancela, liberar el slot
              UPDATE time_slots 
              SET status = 'free', updated_at = CURRENT_TIMESTAMP
              WHERE id = v_slot_id;
          ELSIF vp_status IN ('confirmed', 'completed') THEN
              -- Verificar si el slot está disponible antes de confirmar
              IF EXISTS (
                  SELECT 1 FROM bookings b2 
                  WHERE b2.slot_id = v_slot_id 
                    AND b2.id != vp_booking_id 
                    AND b2.status IN ('confirmed', 'completed')
              ) THEN
                  RAISE EXCEPTION 'Error: No se puede confirmar la reserva. El slot ya está ocupado por otra reserva activa.';
              END IF;
              
              -- Si se confirma o completa, marcar el slot como ocupado
              UPDATE time_slots 
              SET status = 'booked', updated_at = CURRENT_TIMESTAMP
              WHERE id = v_slot_id;
          END IF;
          
          SELECT json_build_object(
              'sql_err', '0',
              'sql_msn', 'Estado de reserva actualizado exitosamente',
              'data', json_build_object(
                  'booking_id', vp_booking_id,
                  'new_status', vp_status,
                  'previous_status', v_current_status
              )
          ) INTO v_result;
          
          RETURN v_result;
      EXCEPTION
          WHEN OTHERS THEN
              RETURN json_build_object(
                  'sql_err', SQLSTATE,
                  'sql_msn', SQLERRM
              );
      END;
      $$;
    `);

    // 9. SP para obtener estadísticas
    await query(`
      CREATE OR REPLACE FUNCTION sp_get_admin_stats()
      RETURNS JSON
      LANGUAGE plpgsql
      AS $$
      DECLARE
          v_result JSON;
      BEGIN
          SELECT json_build_object(
              'sql_err', '0',
              'sql_msn', 'Estadísticas obtenidas exitosamente',
              'data', json_build_object(
                  'total_bookings', (SELECT COUNT(*) FROM bookings),
                  'confirmed_bookings', (SELECT COUNT(*) FROM bookings WHERE status = 'confirmed'),
                  'cancelled_bookings', (SELECT COUNT(*) FROM bookings WHERE status = 'cancelled'),
                  'completed_bookings', (SELECT COUNT(*) FROM bookings WHERE status = 'completed'),
                  'total_advisors', (SELECT COUNT(*) FROM advisors),
                  'available_slots', (SELECT COUNT(*) FROM time_slots WHERE status = 'free'),
                  'booked_slots', (SELECT COUNT(*) FROM time_slots WHERE status = 'booked'),
                  'blocked_slots', (SELECT COUNT(*) FROM time_slots WHERE status = 'blocked'),
                  'pending_emails', (
                      SELECT COUNT(DISTINCT el.booking_id) 
                      FROM email_logs el
                      WHERE el.status = 'pending'
                        AND NOT EXISTS (
                            SELECT 1 FROM email_logs el2 
                            WHERE el2.booking_id = el.booking_id 
                              AND el2.type = el.type 
                              AND el2.status = 'sent'
                        )
                  ),
                  'sent_emails', (SELECT COUNT(*) FROM email_logs WHERE status = 'sent'),
                  'failed_emails', (SELECT COUNT(*) FROM email_logs WHERE status = 'failed')
              )
          ) INTO v_result;
          
          RETURN v_result;
      EXCEPTION
          WHEN OTHERS THEN
              RETURN json_build_object(
                  'sql_err', SQLSTATE,
                  'sql_msn', SQLERRM
              );
      END;
      $$;
    `);

    // 10. SP para obtener logs de email
    await query(`
      CREATE OR REPLACE FUNCTION sp_get_email_logs(
          vp_type VARCHAR(50) DEFAULT NULL,
          vp_status VARCHAR(20) DEFAULT NULL
      )
      RETURNS JSON
      LANGUAGE plpgsql
      AS $$
      DECLARE
          v_result JSON;
      BEGIN
          SELECT json_build_object(
              'sql_err', '0',
              'sql_msn', 'Logs de email obtenidos exitosamente',
              'data', COALESCE(
                  json_agg(
                      json_build_object(
                          'id', el.id,
                          'booking_id', el.booking_id,
                          'type', el.type,
                          'status', el.status,
                          'attempts', el.attempts,
                          'sent_at', el.sent_at,
                          'error_message', el.error_message,
                          'created_at', el.created_at,
                          'client_name', b.client_name,
                          'client_email', b.client_email,
                          'advisor_name', a.name
                      ) ORDER BY el.created_at DESC
                  ), 
                  '[]'::json
              )
          ) INTO v_result
          FROM email_logs el
          JOIN bookings b ON el.booking_id = b.id
          JOIN time_slots ts ON b.slot_id = ts.id
          JOIN advisors a ON b.advisor_id = a.id
          WHERE (vp_type IS NULL OR el.type = vp_type)
            AND (vp_status IS NULL OR el.status = vp_status)
          LIMIT 100;
          
          RETURN v_result;
      EXCEPTION
          WHEN OTHERS THEN
              RETURN json_build_object(
                  'sql_err', SQLSTATE,
                  'sql_msn', SQLERRM
              );
      END;
      $$;
    `);

    logger.info("✅ Stored procedures creados exitosamente");
  } catch (error) {
    logger.error("❌ Error creando stored procedures:", error);
    throw error;
  }
};

// Ejecutar si se llama directamente
if (require.main === module) {
  const runCreateSP = async () => {
    try {
      await connectDB();
      await createStoredProcedures();
      logger.info("🎉 Script de stored procedures completado");
      process.exit(0);
    } catch (error) {
      logger.error("Error:", error);
      process.exit(1);
    }
  };

  runCreateSP();
}

module.exports = { createStoredProcedures };
