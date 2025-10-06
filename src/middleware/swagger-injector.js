/**
 * Middleware para inyectar documentación Swagger automáticamente
 * Lee la configuración centralizada y genera la documentación completa
 */

const swaggerRoutes = require("../config/swagger-routes");

/**
 * Inyecta documentación Swagger completa en tiempo de ejecución
 */
const injectSwaggerDocs = () => {
  const paths = {};

  Object.entries(swaggerRoutes).forEach(([path, methods]) => {
    Object.entries(methods).forEach(([method, config]) => {
      if (!paths[path]) {
        paths[path] = {};
      }
      paths[path][method] = config;
    });
  });

  return { paths };
};

/**
 * Middleware que agrega la documentación a la especificación de Swagger
 */
const swaggerInjector = (req, res, next) => {
  // Solo procesar requests a la documentación de Swagger
  if (req.path === "/api-docs" || req.path === "/api-docs/") {
    const additionalPaths = injectSwaggerDocs();

    // Agregar los paths a la especificación existente
    if (res.locals.swaggerSpec) {
      res.locals.swaggerSpec.paths = {
        ...res.locals.swaggerSpec.paths,
        ...additionalPaths.paths,
      };
    }
  }

  next();
};

module.exports = { swaggerInjector, injectSwaggerDocs };
