# Script de instalación para el Sistema de Reservas
# Prueba Técnica con Stored Procedures

Write-Host "🚀 Instalando Sistema de Reservas con Stored Procedures" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green

# Verificar que Node.js esté instalado
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js detectado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js no está instalado. Por favor instala Node.js 18+" -ForegroundColor Red
    exit 1
}

# Verificar que PostgreSQL esté instalado
try {
    $psqlVersion = psql --version
    Write-Host "✅ PostgreSQL detectado: $psqlVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ PostgreSQL no está instalado. Por favor instala PostgreSQL 13+" -ForegroundColor Red
    exit 1
}

# Crear base de datos
Write-Host "📊 Creando base de datos..." -ForegroundColor Yellow
try {
    createdb booking_app
    Write-Host "✅ Base de datos creada" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Base de datos ya existe o error al crear" -ForegroundColor Yellow
}

# Configurar backend
Write-Host "🔧 Configurando backend..." -ForegroundColor Yellow
Set-Location backend

# Instalar dependencias
Write-Host "📦 Instalando dependencias del backend..." -ForegroundColor Yellow
npm install

# Crear archivo .env si no existe
if (!(Test-Path .env)) {
    Write-Host "📝 Creando archivo .env..." -ForegroundColor Yellow
    Copy-Item env.example .env
    Write-Host "⚠️ Por favor edita el archivo .env con tus datos de base de datos y email" -ForegroundColor Yellow
}

# Crear directorio de logs
if (!(Test-Path logs)) {
    New-Item -ItemType Directory -Path logs
}

# Ejecutar migraciones
Write-Host "🗄️ Ejecutando migraciones..." -ForegroundColor Yellow
npm run migrate

# Crear stored procedures
Write-Host "🔧 Creando stored procedures..." -ForegroundColor Yellow
npm run sp:create

# Ejecutar seed
Write-Host "🌱 Poblando base de datos con datos de ejemplo..." -ForegroundColor Yellow
npm run seed

Write-Host "✅ Backend configurado exitosamente!" -ForegroundColor Green

# Configurar frontend
Write-Host "🎨 Configurando frontend..." -ForegroundColor Yellow
Set-Location ../frontend

# Instalar dependencias
Write-Host "📦 Instalando dependencias del frontend..." -ForegroundColor Yellow
npm install

# Crear archivo .env.local si no existe
if (!(Test-Path .env.local)) {
    Write-Host "📝 Creando archivo .env.local..." -ForegroundColor Yellow
    Copy-Item env.local.example .env.local
}

Write-Host "✅ Frontend configurado exitosamente!" -ForegroundColor Green

Write-Host ""
Write-Host "🎉 ¡Instalación completada!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Próximos pasos:" -ForegroundColor Cyan
Write-Host "1. Edita backend/.env con tus datos de base de datos y email" -ForegroundColor White
Write-Host "2. Edita frontend/.env.local si es necesario" -ForegroundColor White
Write-Host "3. Inicia el backend: cd backend && npm run dev" -ForegroundColor White
Write-Host "4. Inicia el frontend: cd frontend && npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "🔑 Credenciales admin por defecto:" -ForegroundColor Cyan
Write-Host "Email: admin@bookingapp.com" -ForegroundColor White
Write-Host "Password: admin123" -ForegroundColor White
Write-Host ""
Write-Host "🌐 URLs:" -ForegroundColor Cyan
Write-Host "Backend: http://localhost:3001" -ForegroundColor White
Write-Host "Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "Health Check: http://localhost:3001/api/health" -ForegroundColor White
Write-Host ""
Write-Host "📚 Documentación: README.md" -ForegroundColor Cyan
Write-Host ""
Write-Host "¡Disfruta desarrollando! 🚀" -ForegroundColor Green
