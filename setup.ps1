# Script de instalacion para el Sistema de Reservas
# Desarrollo Local sin Docker

Write-Host "Configurando Sistema de Reservas - Desarrollo Local" -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Green

# Verificar que Node.js este instalado
Write-Host "Verificando Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "Node.js detectado: $nodeVersion" -ForegroundColor Green
}
catch {
    Write-Host "Node.js no esta instalado." -ForegroundColor Red
    Write-Host "Descarga Node.js desde: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Verificar que PostgreSQL este instalado
Write-Host "Verificando PostgreSQL..." -ForegroundColor Yellow
try {
    $psqlVersion = psql --version
    Write-Host "PostgreSQL detectado: $psqlVersion" -ForegroundColor Green
}
catch {
    Write-Host "PostgreSQL no esta instalado." -ForegroundColor Red
    Write-Host "Descarga PostgreSQL desde: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    exit 1
}

# Verificar que npm este disponible
Write-Host "Verificando npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "npm detectado: v$npmVersion" -ForegroundColor Green
}
catch {
    Write-Host "npm no esta disponible. Reinstala Node.js" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Configuracion del proyecto:" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan

# Crear base de datos
Write-Host "Configurando base de datos..." -ForegroundColor Yellow
Write-Host "Se creara la base de datos 'booking_app' si no existe" -ForegroundColor Cyan

try {
    $env:PGPASSWORD = "postgres"
    createdb -U postgres booking_app 2>$null
    Write-Host "Base de datos 'booking_app' creada o ya existe" -ForegroundColor Green
}
catch {
    Write-Host "No se pudo crear la base de datos automaticamente" -ForegroundColor Yellow
    Write-Host "Crea manualmente la base de datos:" -ForegroundColor Cyan
    Write-Host "1. Abre pgAdmin o psql" -ForegroundColor White
    Write-Host "2. Ejecuta: CREATE DATABASE booking_app;" -ForegroundColor White
    Write-Host "3. Continua con el script" -ForegroundColor White
}

# Instalar dependencias
Write-Host ""
Write-Host "Instalando dependencias..." -ForegroundColor Yellow
Write-Host "Esto puede tomar unos minutos..." -ForegroundColor Cyan

try {
    npm install
    Write-Host "Dependencias instaladas correctamente" -ForegroundColor Green
}
catch {
    Write-Host "Error al instalar dependencias" -ForegroundColor Red
    Write-Host "Intenta ejecutar manualmente: npm install" -ForegroundColor Yellow
    exit 1
}

# Crear archivo .env
Write-Host ""
Write-Host "Configurando variables de entorno..." -ForegroundColor Yellow

if (!(Test-Path .env)) {
    Write-Host "Creando archivo .env desde plantilla..." -ForegroundColor Cyan
    Copy-Item env.example .env
    Write-Host "Archivo .env creado" -ForegroundColor Green
    Write-Host ""
    Write-Host "IMPORTANTE: Debes editar el archivo .env con tus datos:" -ForegroundColor Yellow
    Write-Host "- DB_USER: tu usuario de PostgreSQL" -ForegroundColor White
    Write-Host "- DB_PASSWORD: tu contrasena de PostgreSQL" -ForegroundColor White
    Write-Host "- EMAIL_USER y EMAIL_PASS: credenciales de email" -ForegroundColor White
}
else {
    Write-Host "Archivo .env ya existe" -ForegroundColor Green
}

# Crear directorio de logs
if (!(Test-Path logs)) {
    New-Item -ItemType Directory -Path logs -Force | Out-Null
    Write-Host "Directorio de logs creado" -ForegroundColor Green
}

# Ejecutar migraciones
Write-Host ""
Write-Host "Configurando base de datos..." -ForegroundColor Yellow
Write-Host "Ejecutando migraciones..." -ForegroundColor Cyan

try {
    npm run migrate
    Write-Host "Migraciones ejecutadas correctamente" -ForegroundColor Green
}
catch {
    Write-Host "Error en las migraciones. Verifica tu configuracion de base de datos" -ForegroundColor Red
    Write-Host "Asegurate de que:" -ForegroundColor Yellow
    Write-Host "- PostgreSQL este ejecutandose" -ForegroundColor White
    Write-Host "- Las credenciales en .env sean correctas" -ForegroundColor White
    Write-Host "- La base de datos 'booking_app' exista" -ForegroundColor White
}

# Crear stored procedures
Write-Host "Creando stored procedures..." -ForegroundColor Cyan

try {
    npm run sp:create
    Write-Host "Stored procedures creados correctamente" -ForegroundColor Green
}
catch {
    Write-Host "Error al crear stored procedures" -ForegroundColor Red
}

# Ejecutar seed
Write-Host "Poblando base de datos con datos de ejemplo..." -ForegroundColor Cyan

try {
    npm run seed
    Write-Host "Datos de ejemplo insertados correctamente" -ForegroundColor Green
}
catch {
    Write-Host "Error al insertar datos de ejemplo" -ForegroundColor Red
}

Write-Host ""
Write-Host "Configuracion completada!" -ForegroundColor Green
Write-Host "=============================" -ForegroundColor Green

Write-Host ""
Write-Host "Proximos pasos:" -ForegroundColor Cyan
Write-Host "==================" -ForegroundColor Cyan
Write-Host "1. Edita el archivo .env con tus datos de PostgreSQL y email" -ForegroundColor White
Write-Host "2. Inicia el servidor: npm run dev" -ForegroundColor White
Write-Host "3. Abre tu navegador en: http://localhost:3001" -ForegroundColor White
Write-Host "4. Documentacion API: http://localhost:3001/api-docs" -ForegroundColor White

Write-Host ""
Write-Host "Credenciales de administrador:" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Email: admin@bookingapp.com" -ForegroundColor White
Write-Host "Password: admin123" -ForegroundColor White

Write-Host ""
Write-Host "URLs importantes:" -ForegroundColor Cyan
Write-Host "===================" -ForegroundColor Cyan
Write-Host "API: http://localhost:3001" -ForegroundColor White
Write-Host "Health Check: http://localhost:3001/api/health" -ForegroundColor White
Write-Host "Swagger Docs: http://localhost:3001/api-docs" -ForegroundColor White

Write-Host ""
Write-Host "Comandos utiles:" -ForegroundColor Cyan
Write-Host "===================" -ForegroundColor Cyan
Write-Host "Iniciar servidor: npm run dev" -ForegroundColor White
Write-Host "Solo servidor: npm start" -ForegroundColor White
Write-Host "Ejecutar migraciones: npm run migrate" -ForegroundColor White
Write-Host "Poblar datos: npm run seed" -ForegroundColor White

Write-Host ""
Write-Host "Recursos adicionales:" -ForegroundColor Cyan
Write-Host "=======================" -ForegroundColor Cyan
Write-Host "README.md: Documentacion completa del proyecto" -ForegroundColor White
Write-Host "Mailtrap: https://mailtrap.io (para emails de desarrollo)" -ForegroundColor White
Write-Host "PostgreSQL Docs: https://www.postgresql.org/docs/" -ForegroundColor White

Write-Host ""
Write-Host "Listo para desarrollar! Disfruta codificando!" -ForegroundColor Green
