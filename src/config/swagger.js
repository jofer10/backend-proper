const swaggerJSDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const { injectSwaggerDocs } = require("../middleware/swagger-injector");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Booking App API",
      version: "1.0.0",
      description: "API para sistema de reservas de citas con asesores",
      contact: {
        name: "API Support",
        email: "support@bookingapp.com",
      },
    },
    servers: [
      {
        url: "https://backend-proper.onrender.com/",
        description: "Servidor de desarrollo",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        Advisor: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            name: { type: "string", example: "Juan Pérez" },
            email: { type: "string", example: "juan@example.com" },
            specialty: { type: "string", example: "Finanzas" },
            experience_years: { type: "integer", example: 5 },
            rating: { type: "number", example: 4.8 },
            bio: { type: "string", example: "Experto en finanzas personales" },
          },
        },
        TimeSlot: {
          type: "object",
          properties: {
            advisor_id: { type: "integer", example: 1 },
            date: { type: "string", format: "date", example: "2024-01-15" },
            time_slots: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  time: { type: "string", example: "09:00" },
                  available: { type: "boolean", example: true },
                },
              },
            },
          },
        },
        Booking: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            advisor_id: { type: "integer", example: 1 },
            client_name: { type: "string", example: "María García" },
            client_email: { type: "string", example: "maria@example.com" },
            client_phone: { type: "string", example: "+1234567890" },
            appointment_date: {
              type: "string",
              format: "date",
              example: "2024-01-15",
            },
            appointment_time: { type: "string", example: "09:00" },
            status: { type: "string", example: "confirmed" },
            notes: { type: "string", example: "Consulta sobre inversiones" },
            created_at: { type: "string", format: "date-time" },
          },
        },
        Error: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "Error message" },
            error: { type: "string", example: "Error details" },
          },
        },
        Success: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Success message" },
            data: { type: "object" },
          },
        },
      },
    },
  },
  apis: ["./src/routes/*.js"], // Solo archivos de rutas con comentarios JSDoc
};

const specs = swaggerJSDoc(options);

// Inyectar documentación centralizada
const additionalDocs = injectSwaggerDocs();
if (additionalDocs.paths) {
  specs.paths = {
    ...specs.paths,
    ...additionalDocs.paths,
  };
}

module.exports = {
  swaggerUi,
  specs,
};
