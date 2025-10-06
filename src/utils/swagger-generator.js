/**
 * Generador de documentación Swagger desde configuración centralizada
 * Similar a FastAPI, convierte configuración en comentarios JSDoc
 */

const swaggerRoutes = require("../config/swagger-routes");

class SwaggerGenerator {
  /**
   * Genera comentarios JSDoc para una ruta específica
   */
  static generateJSDoc(path, method, config) {
    let jsdoc = `/**\n * @swagger\n * ${path}:\n *   ${method}:\n`;

    // Agregar propiedades básicas
    if (config.summary) jsdoc += ` *     summary: ${config.summary}\n`;
    if (config.tags) jsdoc += ` *     tags: [${config.tags.join(", ")}]\n`;
    if (config.security)
      jsdoc += ` *     security:\n *       - ${config.security
        .map((s) => Object.keys(s)[0] + ": []")
        .join("\n *       - ")}\n`;

    // Agregar parámetros
    if (config.parameters && config.parameters.length > 0) {
      jsdoc += ` *     parameters:\n`;
      config.parameters.forEach((param) => {
        jsdoc += ` *       - in: ${param.in}\n`;
        jsdoc += ` *         name: ${param.name}\n`;
        if (param.required) jsdoc += ` *         required: true\n`;
        jsdoc += ` *         schema:\n`;
        jsdoc += ` *           type: ${param.type}\n`;
        if (param.minimum) jsdoc += ` *           minimum: ${param.minimum}\n`;
        if (param.enum)
          jsdoc += ` *           enum: [${param.enum.join(", ")}]\n`;
        if (param.format) jsdoc += ` *           format: ${param.format}\n`;
        jsdoc += ` *         description: ${param.description}\n`;
      });
    }

    // Agregar requestBody
    if (config.requestBody) {
      jsdoc += ` *     requestBody:\n`;
      jsdoc += ` *       required: ${config.requestBody.required}\n`;
      jsdoc += ` *       content:\n`;
      jsdoc += ` *         application/json:\n`;
      jsdoc += ` *           schema:\n`;
      jsdoc += ` *             type: object\n`;
      if (config.requestBody.content["application/json"].schema.required) {
        jsdoc += ` *             required:\n`;
        config.requestBody.content["application/json"].schema.required.forEach(
          (field) => {
            jsdoc += ` *               - ${field}\n`;
          }
        );
      }
      jsdoc += ` *             properties:\n`;
      Object.entries(
        config.requestBody.content["application/json"].schema.properties
      ).forEach(([key, value]) => {
        jsdoc += ` *               ${key}:\n`;
        jsdoc += ` *                 type: ${value.type}\n`;
        if (value.minimum)
          jsdoc += ` *                 minimum: ${value.minimum}\n`;
        if (value.minLength)
          jsdoc += ` *                 minLength: ${value.minLength}\n`;
        if (value.maxLength)
          jsdoc += ` *                 maxLength: ${value.maxLength}\n`;
        if (value.format)
          jsdoc += ` *                 format: ${value.format}\n`;
        if (value.enum)
          jsdoc += ` *                 enum: [${value.enum.join(", ")}]\n`;
        jsdoc += ` *                 description: ${value.description}\n`;
      });
    }

    // Agregar responses
    if (config.responses) {
      jsdoc += ` *     responses:\n`;
      Object.entries(config.responses).forEach(([code, response]) => {
        jsdoc += ` *       ${code}:\n`;
        jsdoc += ` *         description: ${response.description}\n`;
        if (response.schema) {
          jsdoc += ` *         content:\n`;
          jsdoc += ` *           application/json:\n`;
          jsdoc += ` *             schema:\n`;
          jsdoc += ` *               $ref: '${response.schema.$ref}'\n`;
        }
      });
    }

    jsdoc += ` */`;
    return jsdoc;
  }

  /**
   * Genera todos los comentarios JSDoc para un archivo de rutas
   */
  static generateForFile(routes) {
    const jsdocs = {};

    Object.entries(swaggerRoutes).forEach(([path, methods]) => {
      Object.entries(methods).forEach(([method, config]) => {
        const key = `${method.toUpperCase()} ${path}`;
        jsdocs[key] = this.generateJSDoc(path, method, config);
      });
    });

    return jsdocs;
  }

  /**
   * Obtiene la documentación para una ruta específica
   */
  static getJSDocForRoute(path, method) {
    if (swaggerRoutes[path] && swaggerRoutes[path][method]) {
      return this.generateJSDoc(path, method, swaggerRoutes[path][method]);
    }
    return null;
  }
}

module.exports = SwaggerGenerator;
