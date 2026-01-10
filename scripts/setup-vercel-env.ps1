# Script para configurar variables de entorno en Vercel
# Ejecutar desde la raíz del proyecto: .\scripts\setup-vercel-env.ps1

Write-Host "🚀 Configuración de Variables de Entorno para Vercel" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar si vercel CLI está instalado
$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue
if (-not $vercelInstalled) {
    Write-Host "❌ Vercel CLI no está instalado." -ForegroundColor Red
    Write-Host "Instalando Vercel CLI..." -ForegroundColor Yellow
    npm install -g vercel
    Write-Host "✅ Vercel CLI instalado correctamente" -ForegroundColor Green
    Write-Host ""
}

# Login en Vercel
Write-Host "🔐 Iniciando sesión en Vercel..." -ForegroundColor Yellow
vercel login

Write-Host ""
Write-Host "📋 Configurando variables de entorno..." -ForegroundColor Cyan
Write-Host ""

# DATABASE_URL (Neon)
Write-Host "🗄️  DATABASE_URL (Neon PostgreSQL)" -ForegroundColor Green
$databaseUrl = "postgresql://neondb_owner:npg_X7abERnIgAT4@ep-lingering-tooth-agdmiw5c-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
Write-Host "Usando: $databaseUrl" -ForegroundColor Gray
$databaseUrl | vercel env add DATABASE_URL production

# NODE_ENV
Write-Host ""
Write-Host "🌐 NODE_ENV" -ForegroundColor Green
"production" | vercel env add NODE_ENV production

# SESSION_SECRET
Write-Host ""
Write-Host "🔑 SESSION_SECRET" -ForegroundColor Green
Write-Host "Generando secret seguro..." -ForegroundColor Gray
$sessionSecret = node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
Write-Host "Secret generado: $sessionSecret" -ForegroundColor Gray
$sessionSecret | vercel env add SESSION_SECRET production

# BACKEND_URL
Write-Host ""
Write-Host "🔗 BACKEND_URL" -ForegroundColor Green
Write-Host "Ingresa la URL de tu proyecto en Vercel (ej: https://regismac.vercel.app):" -ForegroundColor Yellow
$backendUrl = Read-Host "URL"
$backendUrl | vercel env add BACKEND_URL production

# FRONTEND_URL (igual que BACKEND_URL)
Write-Host ""
Write-Host "🌍 FRONTEND_URL" -ForegroundColor Green
Write-Host "Usando la misma URL que BACKEND_URL: $backendUrl" -ForegroundColor Gray
$backendUrl | vercel env add FRONTEND_URL production

# Variables opcionales
Write-Host ""
Write-Host "📧 Variables opcionales (Google OAuth y Email)" -ForegroundColor Cyan
Write-Host ""
Write-Host "¿Deseas configurar Google OAuth? (s/n):" -ForegroundColor Yellow
$configureGoogle = Read-Host
if ($configureGoogle -eq "s" -or $configureGoogle -eq "S") {
    Write-Host ""
    Write-Host "GOOGLE_CLIENT_ID:" -ForegroundColor Green
    $googleClientId = Read-Host
    $googleClientId | vercel env add GOOGLE_CLIENT_ID production
    
    Write-Host ""
    Write-Host "GOOGLE_CLIENT_SECRET:" -ForegroundColor Green
    $googleClientSecret = Read-Host
    $googleClientSecret | vercel env add GOOGLE_CLIENT_SECRET production
    
    Write-Host ""
    Write-Host "GOOGLE_CALLBACK_URL:" -ForegroundColor Green
    $googleCallback = "$backendUrl/api/auth/google/callback"
    Write-Host "Usando: $googleCallback" -ForegroundColor Gray
    $googleCallback | vercel env add GOOGLE_CALLBACK_URL production
}

Write-Host ""
Write-Host "¿Deseas configurar Email (Nodemailer)? (s/n):" -ForegroundColor Yellow
$configureEmail = Read-Host
if ($configureEmail -eq "s" -or $configureEmail -eq "S") {
    Write-Host ""
    Write-Host "EMAIL_USER (ej: tu_email@gmail.com):" -ForegroundColor Green
    $emailUser = Read-Host
    $emailUser | vercel env add EMAIL_USER production
    
    Write-Host ""
    Write-Host "EMAIL_PASS (App Password de Google):" -ForegroundColor Green
    $emailPass = Read-Host
    $emailPass | vercel env add EMAIL_PASS production
}

Write-Host ""
Write-Host "✅ Variables de entorno configuradas correctamente!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Próximos pasos:" -ForegroundColor Cyan
Write-Host "1. Ejecutar migraciones en Neon: cd regismac-backend && npx prisma migrate deploy" -ForegroundColor White
Write-Host "2. Commit y push: git add . && git commit -m 'Deploy' && git push" -ForegroundColor White
Write-Host "3. Vercel desplegará automáticamente" -ForegroundColor White
Write-Host ""
Write-Host "🔍 Para ver las variables configuradas: vercel env ls" -ForegroundColor Yellow
Write-Host "📊 Para ver logs en tiempo real: vercel logs --prod --follow" -ForegroundColor Yellow
Write-Host ""
