# 🚀 Backend - Sistema de Reservas con Stored Procedures

API REST para el sistema de reservas de citas con Node.js, Express, PostgreSQL y Stored Procedures.

## 📋 Características

- ✅ **Stored Procedures**: Toda la lógica de negocio en PostgreSQL
- ✅ **API REST completa** con validaciones robustas
- ✅ **Autenticación JWT** segura
- ✅ **Prevención de doble reserva** con transacciones atómicas
- ✅ **Sistema de emails** con logs completos
- ✅ **Recordatorios automáticos** (24h y 1h antes)
- ✅ **Docker & PgBouncer** para optimización
- ✅ **Rate limiting** y seguridad avanzada
- ✅ **Logging completo** con Winston
- ✅ **Manejo de errores** centralizado

## 🚀 Inicialización Rápida

### Opción 1: Con Docker (Recomendado)

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp env.example .env
# Editar .env con tus datos (ver sección Variables de Entorno)

# 3. Iniciar con Docker (PostgreSQL + PgBouncer)
.\start-with-pgbouncer.ps1
```

### Opción 2: PostgreSQL Local

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp env.example .env
# Configurar USE_PGBOUNCER=false y puerto 5432

# 3. Crear base de datos local
createdb booking_app

# 4. Ejecutar migraciones y seed
npm run migrate
npm run seed

# 5. Crear stored procedures
npm run sp:create

# 6. Iniciar servidor
npm run dev
```

## 🔧 Variables de Entorno

### Configuración para Docker (Recomendado)

```env
# Database - Docker con PgBouncer
USE_PGBOUNCER=true
DB_HOST=localhost
DB_PORT=6432
DB_NAME=booking_app
DB_USER=postgres
DB_PASSWORD=postgres123

# Server
PORT=3001
NODE_ENV=development

# JWT
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=24h

# Email (Mailtrap para desarrollo)
EMAIL_HOST=sandbox.smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_USER=your-mailtrap-username
EMAIL_PASS=your-mailtrap-password
EMAIL_FROM=noreply@bookingapp.com

# Admin
ADMIN_EMAIL=admin@bookingapp.com
ADMIN_PASSWORD=admin123

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log
```

### Configuración para PostgreSQL Local

```env
# Database - PostgreSQL Local
USE_PGBOUNCER=false
DB_HOST=localhost
DB_PORT=5432
DB_NAME=booking_app
DB_USER=tu_usuario_postgres
DB_PASSWORD=tu_password_postgres

# Server
PORT=3001
NODE_ENV=development

# JWT
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=24h

# Email (Mailtrap para desarrollo)
EMAIL_HOST=sandbox.smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_USER=your-mailtrap-username
EMAIL_PASS=your-mailtrap-password
EMAIL_FROM=noreply@bookingapp.com

# Admin
ADMIN_EMAIL=admin@bookingapp.com
ADMIN_PASSWORD=admin123

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log
```

### 🔄 Cambio entre Docker y Local

Para cambiar entre Docker y PostgreSQL local, solo modifica estas variables en tu `.env`:

**Para Docker:**

```env
USE_PGBOUNCER=true
DB_PORT=6432
```

**Para Local:**

```env
USE_PGBOUNCER=false
DB_PORT=5432
```

## 📊 Stored Procedures

### Lista de Stored Procedures

1. **`sp_get_advisors()`** - Obtener todos los asesores
2. **`sp_get_availability(advisor_id, from_date, to_date)`** - Obtener disponibilidad
3. **`sp_create_booking(slot_id, client_name, client_email)`** - Crear reserva
4. **`sp_get_client_bookings(client_email)`** - Obtener reservas del cliente
5. **`sp_admin_login(email, password)`** - Login de administrador
6. **`sp_admin_verify(email)`** - Verificar admin por email (para tokens)
7. **`sp_create_admin(email, password_hash)`** - Crear administrador (solo desarrollo)
8. **`sp_get_admin_bookings(advisor_id, status, from_date, to_date)`** - Obtener reservas para admin
9. **`sp_resend_email(booking_id)`** - Reenviar email
10. **`sp_update_booking_status(booking_id, status)`** - Actualizar estado de reserva
11. **`sp_get_admin_stats()`** - Obtener estadísticas
12. **`sp_get_email_logs(type, status)`** - Obtener logs de email

### Características de los SP

- ✅ **Validaciones robustas** en cada SP
- ✅ **Manejo de errores** con RAISE EXCEPTION
- ✅ **Respuestas JSON** estandarizadas
- ✅ **Logging automático** de operaciones
- ✅ **Transacciones atómicas** para prevenir doble reserva

## 🔌 API Endpoints

### Públicos

```
GET    /api/bookings/availability    # Ver disponibilidad
POST   /api/bookings                 # Crear reserva
GET    /api/bookings/advisors        # Listar asesores
GET    /api/bookings/my-bookings     # Mis reservas
```

### Autenticación

```
POST   /api/auth/login               # Login admin
GET    /api/auth/me                  # Verificar token
POST   /api/auth/register            # Registrar admin (solo desarrollo)
```

### Admin (requiere JWT)

```
GET    /api/admin/bookings           # Listar reservas
GET    /api/admin/bookings/:id       # Ver reserva
POST   /api/admin/bookings/:id/resend-email  # Reenviar email
PUT    /api/admin/bookings/:id/status         # Cambiar estado
DELETE /api/admin/bookings/:id                # Cancelar reserva
GET    /api/admin/stats              # Estadísticas
GET    /api/admin/email-logs         # Logs de email
```

### Recordatorios (Nuevo)

```
GET    /api/reminders/status         # Estado del sistema de recordatorios
POST   /api/reminders/start          # Iniciar recordatorios automáticos
POST   /api/reminders/stop           # Detener recordatorios automáticos
POST   /api/reminders/run             # Ejecutar recordatorios manualmente
GET    /api/reminders/test            # Probar sistema de recordatorios
GET    /api/reminders/email-test      # Probar conexión de email
```

## 📧 Sistema de Emails y Recordatorios

### Configuración Mailtrap

1. Regístrate en [Mailtrap](https://mailtrap.io)
2. Obtén credenciales de tu inbox
3. Configura en `.env`

### Tipos de Email

- **Confirmación**: Al crear reserva
- **Recordatorio 24h**: 24 horas antes (automático)
- **Recordatorio 1h**: 1 hora antes (automático)

### Sistema de Recordatorios Automáticos

El sistema incluye un **cron job** que ejecuta recordatorios cada 5 minutos:

- ✅ **Recordatorios 24h**: Se envían entre 23-25 horas antes de la cita
- ✅ **Recordatorios 1h**: Se envían entre 55-65 minutos antes de la cita
- ✅ **Prevención de duplicados**: No se reenvían recordatorios ya enviados
- ✅ **Logs completos**: Trazabilidad de todos los envíos
- ✅ **API de gestión**: Control del sistema de recordatorios

## 🧪 Testing

```bash
# Ejecutar tests
npm test

# Tests con coverage
npm run test:coverage
```

## 🚀 Deploy

### Railway

1. Conecta tu repositorio
2. Configura variables de entorno
3. Deploy automático

### Render

1. Conecta tu repositorio
2. Selecciona "Web Service"
3. Configura variables de entorno
4. Deploy

## 📝 Scripts Disponibles

```bash
npm run dev          # Desarrollo con nodemon
npm run start        # Producción
npm run migrate      # Ejecutar migraciones
npm run seed         # Poblar con datos de ejemplo
npm run sp:create    # Crear stored procedures
npm test             # Ejecutar tests
```

## 🐳 Docker y PgBouncer

### Iniciar con Docker

```bash
# Opción 1: Script automatizado (Recomendado)
.\start-with-pgbouncer.ps1

# Opción 2: Comandos manuales
docker-compose up -d
npm run dev
```

### Gestión de Docker

```bash
# Ver contenedores
docker ps

# Detener servicios
docker-compose down

# Detener y limpiar
docker-compose down --remove-orphans --volumes

# Ver logs
docker-compose logs -f
```

### Ventajas de PgBouncer

- ✅ **Connection Pooling**: Reutilización de conexiones
- ✅ **Mejor Performance**: Menos overhead de conexiones
- ✅ **Escalabilidad**: Manejo de alta concurrencia
- ✅ **Optimización**: Transacciones más rápidas

## 🔍 Logs y Debugging

```bash
# Ver logs en desarrollo
npm run dev

# Logs de producción
NODE_ENV=production npm start
```

## 🛡️ Seguridad

- ✅ **Rate limiting** (100 req/15min)
- ✅ **Helmet** para headers seguros
- ✅ **CORS** configurado
- ✅ **Validación** de entrada
- ✅ **JWT** con expiración
- ✅ **Hash** de contraseñas con bcrypt
- ✅ **Stored procedures** para prevenir SQL injection

## 📈 Monitoreo

- Health check: `GET /api/health`
- Info del sistema: `GET /api/info`
- Logs de email en `/api/admin/email-logs`
- Estadísticas en `/api/admin/stats`

## 🆘 Troubleshooting

### Error de conexión a BD

```bash
# Verificar PostgreSQL
pg_isready

# Verificar variables de entorno
echo $DATABASE_URL

# Verificar configuración Docker
docker ps
docker-compose logs postgres
```

### Error de email

```bash
# Verificar configuración
node -e "console.log(process.env.EMAIL_HOST)"

# Probar conexión de email
curl http://localhost:3001/api/reminders/email-test
```

### Puerto ocupado

```bash
# Cambiar puerto en .env
PORT=3002

# Verificar procesos en puerto
netstat -ano | findstr :3001
```

### Error en stored procedures

```bash
# Recrear stored procedures
npm run sp:create
```

### Problemas con Docker

```bash
# Limpiar contenedores
docker-compose down --remove-orphans --volumes

# Reconstruir imágenes
docker-compose build --no-cache

# Ver logs detallados
docker-compose logs -f
```

### Problemas con recordatorios

```bash
# Verificar estado del sistema
curl http://localhost:3001/api/reminders/status

# Probar recordatorios manualmente
curl -X POST http://localhost:3001/api/reminders/run
```

## 🔧 Arquitectura

```
backend/
├── src/
│   ├── config/
│   │   ├── swagger.js             # Configuración Swagger
│   │   └── swagger-routes.js      # Documentación API
│   ├── cron/
│   │   └── reminderCron.js        # Cron jobs para recordatorios
│   ├── database/
│   │   ├── connection.js          # Conexión y logging
│   │   ├── create-stored-procedures.js  # Script de SP
│   │   ├── migrate.js             # Migraciones
│   │   └── seed.js                # Datos de ejemplo
│   ├── middleware/
│   │   ├── auth.js                # Autenticación JWT
│   │   ├── errorHandler.js        # Manejo de errores
│   │   └── swagger-injector.js    # Inyección Swagger
│   ├── routes/
│   │   ├── auth.js                # Rutas de autenticación
│   │   ├── bookings.js            # Rutas de reservas
│   │   ├── admin.js               # Rutas de administración
│   │   └── reminders.js           # Rutas de recordatorios
│   ├── services/
│   │   ├── advisorService.js      # Servicios de asesores
│   │   ├── bookingService.js      # Servicios de reservas
│   │   ├── authService.js         # Servicios de autenticación
│   │   ├── adminService.js        # Servicios de admin
│   │   ├── emailService.js        # Servicios de email
│   │   └── reminderService.js     # Servicios de recordatorios
│   ├── utils/
│   │   └── swagger-generator.js   # Generador de documentación
│   └── server.js                   # Servidor principal
├── docker-compose.yml             # Docker PostgreSQL + PgBouncer
├── pgbouncer.ini                  # Configuración PgBouncer
├── start-with-pgbouncer.ps1       # Script de inicio automatizado
└── package.json
```

## 🎯 Ventajas de Stored Procedures

1. **Seguridad**: Prevención de SQL injection
2. **Performance**: Lógica en la base de datos
3. **Consistencia**: Validaciones centralizadas
4. **Mantenibilidad**: Lógica de negocio en un lugar
5. **Transacciones**: Operaciones atómicas
6. **Logging**: Trazabilidad completa

## 🎯 Resumen de Características

### ✅ Funcionalidades Core

- **API REST completa** con 16 endpoints
- **Stored Procedures** para toda la lógica de negocio
- **Autenticación JWT** segura
- **Sistema de emails** con Mailtrap
- **Prevención de doble reserva** con transacciones atómicas

### ✅ Funcionalidades Extra

- **Recordatorios automáticos** (24h y 1h antes)
- **Docker & PgBouncer** para optimización
- **Cron jobs** para automatización
- **Swagger/OpenAPI** para documentación
- **Logging estructurado** con Winston
- **Rate limiting** y seguridad avanzada

### ✅ Opciones de Despliegue

- **Docker** (Recomendado): PostgreSQL + PgBouncer
- **Local**: PostgreSQL nativo
- **Producción**: Railway/Render + Vercel

---

**¡Backend con Stored Procedures y Docker listo para producción! 🚀**
