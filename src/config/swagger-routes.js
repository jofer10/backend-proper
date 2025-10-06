/**
 * Configuración centralizada de rutas para Swagger
 */

const swaggerRoutes = {
  // Rutas de Bookings
  "/api/bookings/availability": {
    get: {
      summary: "Obtener disponibilidad de un asesor",
      tags: ["Bookings"],
      parameters: [
        {
          name: "advisor_id",
          in: "query",
          required: true,
          type: "integer",
          minimum: 1,
          description: "ID del asesor",
        },
        {
          name: "from",
          in: "query",
          required: true,
          type: "string",
          format: "date",
          description: "Fecha de inicio (ISO 8601)",
        },
        {
          name: "to",
          in: "query",
          required: true,
          type: "string",
          format: "date",
          description: "Fecha de fin (ISO 8601)",
        },
      ],
      responses: {
        200: {
          description: "Disponibilidad obtenida exitosamente",
          schema: { $ref: "#/components/schemas/Success" },
        },
        400: {
          description: "Error de validación",
          schema: { $ref: "#/components/schemas/Error" },
        },
        500: {
          description: "Error interno del servidor",
          schema: { $ref: "#/components/schemas/Error" },
        },
      },
    },
  },

  "/api/bookings": {
    post: {
      summary: "Crear una nueva reserva",
      tags: ["Bookings"],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["slot_id", "client_name", "client_email"],
              properties: {
                slot_id: {
                  type: "integer",
                  minimum: 1,
                  description: "ID del slot de tiempo",
                },
                client_name: {
                  type: "string",
                  minLength: 2,
                  maxLength: 255,
                  description: "Nombre del cliente",
                },
                client_email: {
                  type: "string",
                  format: "email",
                  description: "Email del cliente",
                },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: "Reserva creada exitosamente",
          schema: { $ref: "#/components/schemas/Success" },
        },
        400: {
          description: "Error de validación",
          schema: { $ref: "#/components/schemas/Error" },
        },
        500: {
          description: "Error interno del servidor",
          schema: { $ref: "#/components/schemas/Error" },
        },
      },
    },
  },

  "/api/bookings/advisors": {
    get: {
      summary: "Obtener lista de asesores disponibles",
      tags: ["Bookings"],
      responses: {
        200: {
          description: "Lista de asesores obtenida exitosamente",
          schema: { $ref: "#/components/schemas/Success" },
        },
        500: {
          description: "Error interno del servidor",
          schema: { $ref: "#/components/schemas/Error" },
        },
      },
    },
  },

  "/api/bookings/my-bookings": {
    get: {
      summary: "Obtener reservas de un cliente por email",
      tags: ["Bookings"],
      parameters: [
        {
          name: "email",
          in: "query",
          required: true,
          type: "string",
          format: "email",
          description: "Email del cliente",
        },
      ],
      responses: {
        200: {
          description: "Reservas del cliente obtenidas exitosamente",
          schema: { $ref: "#/components/schemas/Success" },
        },
        400: {
          description: "Error de validación",
          schema: { $ref: "#/components/schemas/Error" },
        },
        500: {
          description: "Error interno del servidor",
          schema: { $ref: "#/components/schemas/Error" },
        },
      },
    },
  },

  // Rutas de Authentication
  "/api/auth/login": {
    post: {
      summary: "Iniciar sesión como administrador",
      tags: ["Authentication"],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["email", "password"],
              properties: {
                email: {
                  type: "string",
                  format: "email",
                  description: "Email del administrador",
                },
                password: {
                  type: "string",
                  minLength: 6,
                  description: "Contraseña del administrador",
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Login exitoso",
          schema: { $ref: "#/components/schemas/Success" },
        },
        401: {
          description: "Credenciales inválidas",
          schema: { $ref: "#/components/schemas/Error" },
        },
        400: {
          description: "Error de validación",
          schema: { $ref: "#/components/schemas/Error" },
        },
      },
    },
  },

  "/api/auth/register": {
    post: {
      summary: "Crear administrador (solo desarrollo)",
      tags: ["Authentication"],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["email", "password"],
              properties: {
                email: {
                  type: "string",
                  format: "email",
                  description: "Email del administrador",
                },
                password: {
                  type: "string",
                  minLength: 6,
                  description: "Contraseña del administrador",
                },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: "Admin creado exitosamente",
          schema: { $ref: "#/components/schemas/Success" },
        },
        403: {
          description: "No permitido en producción",
          schema: { $ref: "#/components/schemas/Error" },
        },
        400: {
          description: "Error de validación",
          schema: { $ref: "#/components/schemas/Error" },
        },
      },
    },
  },

  "/api/auth/me": {
    get: {
      summary: "Obtener información del usuario autenticado",
      tags: ["Authentication"],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: "Información del usuario obtenida exitosamente",
          schema: { $ref: "#/components/schemas/Success" },
        },
        401: {
          description: "Token requerido",
          schema: { $ref: "#/components/schemas/Error" },
        },
      },
    },
  },

  // Rutas de Admin
  "/api/admin/bookings": {
    get: {
      summary: "Obtener todas las reservas (solo administradores)",
      tags: ["Admin"],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "advisor_id",
          in: "query",
          type: "integer",
          minimum: 1,
          description: "Filtrar por ID del asesor",
        },
        {
          name: "status",
          in: "query",
          type: "string",
          enum: ["confirmed", "cancelled", "completed"],
          description: "Filtrar por estado de la reserva",
        },
        {
          name: "from_date",
          in: "query",
          type: "string",
          format: "date",
          description: "Filtrar desde esta fecha",
        },
        {
          name: "to_date",
          in: "query",
          type: "string",
          format: "date",
          description: "Filtrar hasta esta fecha",
        },
      ],
      responses: {
        200: {
          description: "Lista de reservas obtenida exitosamente",
          schema: { $ref: "#/components/schemas/Success" },
        },
        401: {
          description: "No autorizado",
          schema: { $ref: "#/components/schemas/Error" },
        },
        500: {
          description: "Error interno del servidor",
          schema: { $ref: "#/components/schemas/Error" },
        },
      },
    },
  },

  "/api/admin/bookings/{id}": {
    get: {
      summary: "Obtener una reserva específica",
      tags: ["Admin"],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          type: "integer",
          minimum: 1,
          description: "ID de la reserva",
        },
      ],
      responses: {
        200: {
          description: "Reserva obtenida exitosamente",
          schema: { $ref: "#/components/schemas/Success" },
        },
        404: {
          description: "Reserva no encontrada",
          schema: { $ref: "#/components/schemas/Error" },
        },
      },
    },
    delete: {
      summary: "Cancelar una reserva",
      tags: ["Admin"],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          type: "integer",
          minimum: 1,
          description: "ID de la reserva",
        },
      ],
      responses: {
        200: {
          description: "Reserva cancelada exitosamente",
          schema: { $ref: "#/components/schemas/Success" },
        },
        404: {
          description: "Reserva no encontrada",
          schema: { $ref: "#/components/schemas/Error" },
        },
      },
    },
  },

  "/api/admin/bookings/{id}/resend-email": {
    post: {
      summary: "Reenviar email de confirmación de una reserva",
      tags: ["Admin"],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          type: "integer",
          minimum: 1,
          description: "ID de la reserva",
        },
      ],
      responses: {
        200: {
          description: "Email programado para reenvío exitosamente",
          schema: { $ref: "#/components/schemas/Success" },
        },
        400: {
          description: "ID de reserva inválido",
          schema: { $ref: "#/components/schemas/Error" },
        },
        404: {
          description: "Reserva no encontrada",
          schema: { $ref: "#/components/schemas/Error" },
        },
      },
    },
  },

  "/api/admin/bookings/{id}/status": {
    put: {
      summary: "Actualizar estado de una reserva",
      tags: ["Admin"],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          type: "integer",
          minimum: 1,
          description: "ID de la reserva",
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["status"],
              properties: {
                status: {
                  type: "string",
                  enum: ["confirmed", "cancelled", "completed"],
                  description: "Nuevo estado de la reserva",
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Estado actualizado exitosamente",
          schema: { $ref: "#/components/schemas/Success" },
        },
        400: {
          description: "Datos inválidos",
          schema: { $ref: "#/components/schemas/Error" },
        },
      },
    },
  },

  "/api/admin/stats": {
    get: {
      summary: "Obtener estadísticas del sistema",
      tags: ["Admin"],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: "Estadísticas obtenidas exitosamente",
          schema: { $ref: "#/components/schemas/Success" },
        },
        401: {
          description: "No autorizado",
          schema: { $ref: "#/components/schemas/Error" },
        },
      },
    },
  },

  "/api/admin/email-logs": {
    get: {
      summary: "Obtener logs de email",
      tags: ["Admin"],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "type",
          in: "query",
          type: "string",
          enum: ["confirmation", "reminder_24h", "reminder_1h"],
          description: "Filtrar por tipo de email",
        },
        {
          name: "status",
          in: "query",
          type: "string",
          enum: ["pending", "sent", "failed"],
          description: "Filtrar por estado del email",
        },
      ],
      responses: {
        200: {
          description: "Logs de email obtenidos exitosamente",
          schema: { $ref: "#/components/schemas/Success" },
        },
        401: {
          description: "No autorizado",
          schema: { $ref: "#/components/schemas/Error" },
        },
      },
    },
  },

  // Rutas de Recordatorios
  "/api/reminders/status": {
    get: {
      summary: "Obtener estado del sistema de recordatorios",
      tags: ["Reminders"],
      responses: {
        200: {
          description: "Estado del sistema obtenido exitosamente",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean" },
                  data: {
                    type: "object",
                    properties: {
                      isRunning: { type: "boolean" },
                      nextRun: { type: "string", format: "date-time" },
                      message: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },

  "/api/reminders/start": {
    post: {
      summary: "Iniciar sistema de recordatorios",
      tags: ["Reminders"],
      responses: {
        200: {
          description: "Sistema de recordatorios iniciado exitosamente",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean" },
                  message: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
  },

  "/api/reminders/stop": {
    post: {
      summary: "Detener sistema de recordatorios",
      tags: ["Reminders"],
      responses: {
        200: {
          description: "Sistema de recordatorios detenido exitosamente",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean" },
                  message: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
  },

  "/api/reminders/run": {
    post: {
      summary: "Ejecutar recordatorios manualmente",
      tags: ["Reminders"],
      responses: {
        200: {
          description: "Recordatorios ejecutados exitosamente",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean" },
                  message: { type: "string" },
                  data: {
                    type: "object",
                    properties: {
                      reminder_24h: {
                        type: "object",
                        properties: {
                          sent: { type: "integer" },
                          errors: { type: "integer" },
                        },
                      },
                      reminder_1h: {
                        type: "object",
                        properties: {
                          sent: { type: "integer" },
                          errors: { type: "integer" },
                        },
                      },
                      total: {
                        type: "object",
                        properties: {
                          sent: { type: "integer" },
                          errors: { type: "integer" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },

  "/api/reminders/email-test": {
    get: {
      summary: "Probar conexión de email",
      tags: ["Reminders"],
      responses: {
        200: {
          description: "Prueba de conexión de email ejecutada",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean" },
                  message: { type: "string" },
                  data: {
                    type: "object",
                    properties: {
                      isConnected: { type: "boolean" },
                      config: {
                        type: "object",
                        properties: {
                          host: { type: "string" },
                          port: { type: "string" },
                          user: { type: "string" },
                          from: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },

  "/api/reminders/test": {
    get: {
      summary: "Probar sistema de recordatorios (solo 24h)",
      tags: ["Reminders"],
      responses: {
        200: {
          description: "Prueba de recordatorios ejecutada",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean" },
                  message: { type: "string" },
                  data: {
                    type: "object",
                    properties: {
                      sent: { type: "integer" },
                      errors: { type: "integer" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

module.exports = swaggerRoutes;
