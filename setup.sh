#!/bin/bash

# Script de instalación para el Sistema de Reservas
# Prueba Técnica con Stored Procedures

echo "🚀 Instalando Sistema de Reservas con Stored Procedures"
echo "=================================================="

# Verificar que Node.js esté instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado. Por favor instala Node.js 18+"
    exit 1
fi

# Verificar que PostgreSQL esté instalado
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL no está instalado. Por favor instala PostgreSQL 13+"
    exit 1
fi

echo "✅ Node.js y PostgreSQL detectados"

# Crear base de datos
echo "📊 Creando base de datos..."
createdb booking_app 2>/dev/null || echo "Base de datos ya existe"

# Configurar backend
echo "🔧 Configurando backend..."
cd backend

# Instalar dependencias
echo "📦 Instalando dependencias del backend..."
npm install

# Crear archivo .env si no existe
if [ ! -f .env ]; then
    echo "📝 Creando archivo .env..."
    cp env.example .env
    echo "⚠️  Por favor edita el archivo .env con tus datos de base de datos y email"
fi

# Crear directorio de logs
mkdir -p logs

# Ejecutar migraciones
echo "🗄️ Ejecutando migraciones..."
npm run migrate

# Crear stored procedures
echo "🔧 Creando stored procedures..."
npm run sp:create

# Ejecutar seed
echo "🌱 Poblando base de datos con datos de ejemplo..."
npm run seed

echo "✅ Backend configurado exitosamente!"

# Configurar frontend
echo "🎨 Configurando frontend..."
cd ../frontend

# Instalar dependencias
echo "📦 Instalando dependencias del frontend..."
npm install

# Crear archivo .env.local si no existe
if [ ! -f .env.local ]; then
    echo "📝 Creando archivo .env.local..."
    cp env.local.example .env.local
fi

echo "✅ Frontend configurado exitosamente!"

echo ""
echo "🎉 ¡Instalación completada!"
echo ""
echo "📋 Próximos pasos:"
echo "1. Edita backend/.env con tus datos de base de datos y email"
echo "2. Edita frontend/.env.local si es necesario"
echo "3. Inicia el backend: cd backend && npm run dev"
echo "4. Inicia el frontend: cd frontend && npm run dev"
echo ""
echo "🔑 Credenciales admin por defecto:"
echo "Email: admin@bookingapp.com"
echo "Password: admin123"
echo ""
echo "🌐 URLs:"
echo "Backend: http://localhost:3001"
echo "Frontend: http://localhost:3000"
echo "Health Check: http://localhost:3001/api/health"
echo ""
echo "📚 Documentación: README.md"
echo ""
echo "¡Disfruta desarrollando! 🚀"
