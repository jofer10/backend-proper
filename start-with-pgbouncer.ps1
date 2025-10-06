# Script para iniciar la aplicacion con PgBouncer
Write-Host "Iniciando aplicacion con PgBouncer..." -ForegroundColor Green

# Verificar si Docker esta corriendo
try {
    docker --version | Out-Null
    Write-Host "Docker encontrado" -ForegroundColor Green
} catch {
    Write-Host "Docker no esta instalado o no esta corriendo" -ForegroundColor Red
    Write-Host "Por favor instala Docker Desktop y vuelve a intentar" -ForegroundColor Yellow
    exit 1
}

# Iniciar servicios con Docker Compose
Write-Host "Iniciando PostgreSQL y PgBouncer con Docker..." -ForegroundColor Blue
docker-compose up -d

# Esperar a que los servicios esten listos
Write-Host "Esperando a que los servicios esten listos..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Verificar que PgBouncer este corriendo
Write-Host "Verificando PgBouncer..." -ForegroundColor Blue
try {
    $pgbouncerStatus = docker ps --filter "name=booking_pgbouncer" --format "table {{.Status}}"
    if ($pgbouncerStatus -match "Up") {
        Write-Host "PgBouncer esta corriendo" -ForegroundColor Green
    } else {
        Write-Host "PgBouncer no esta corriendo" -ForegroundColor Red
    }
} catch {
    Write-Host "Error verificando PgBouncer" -ForegroundColor Red
}

# Configurar variables de entorno para usar PgBouncer
Write-Host "Configurando variables de entorno..." -ForegroundColor Blue
$env:USE_PGBOUNCER = "true"
$env:DB_HOST = "localhost"
$env:DB_PORT = "6432"
$env:DB_NAME = "booking_app"
$env:DB_USER = "postgres"
$env:DB_PASSWORD = "postgres123"

Write-Host "Configuracion:" -ForegroundColor Green
Write-Host "PgBouncer: localhost:6432" -ForegroundColor Cyan
Write-Host "PostgreSQL Docker: localhost:5433" -ForegroundColor Cyan
Write-Host "PostgreSQL Local: localhost:5432" -ForegroundColor Yellow

# Ya estamos en el directorio backend

# Instalar dependencias si es necesario
if (-not (Test-Path "node_modules")) {
    Write-Host "Instalando dependencias..." -ForegroundColor Blue
    npm install
}

# Crear stored procedures
Write-Host "Creando stored procedures..." -ForegroundColor Blue
try {
    node src/database/create-stored-procedures.js
    Write-Host "Stored procedures creados correctamente" -ForegroundColor Green
} catch {
    Write-Host "Error creando stored procedures" -ForegroundColor Red
    exit 1
}

# Ejecutar seed
Write-Host "Ejecutando seed..." -ForegroundColor Blue
try {
    node src/database/seed.js
    Write-Host "Seed ejecutado correctamente" -ForegroundColor Green
} catch {
    Write-Host "Error ejecutando seed" -ForegroundColor Red
    exit 1
}

# Iniciar servidor
Write-Host "Iniciando servidor con PgBouncer..." -ForegroundColor Green
Write-Host "PgBouncer: http://localhost:6432" -ForegroundColor Cyan
Write-Host "PostgreSQL Docker: http://localhost:5433" -ForegroundColor Cyan
Write-Host "PostgreSQL Local: http://localhost:5432" -ForegroundColor Yellow
Write-Host "API: http://localhost:3001" -ForegroundColor Cyan
Write-Host "Swagger: http://localhost:3001/api-docs" -ForegroundColor Cyan

npm run dev