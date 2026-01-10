# Script para crear usuario administrador en Neon Database
# Ejecutar desde la raíz del proyecto: .\scripts\create-admin-neon.ps1

Write-Host "👤 Crear Usuario Administrador en Neon Database" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Connection string de Neon
$DATABASE_URL = "postgresql://neondb_owner:npg_X7abERnIgAT4@ep-lingering-tooth-agdmiw5c-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
$env:DATABASE_URL = $DATABASE_URL

Write-Host "📋 Información del Administrador" -ForegroundColor Green
Write-Host ""

Write-Host "Email del administrador:" -ForegroundColor Yellow
Write-Host "(Presiona Enter para usar: admin@regismac.com)" -ForegroundColor Gray
$email = Read-Host "Email"
if ([string]::IsNullOrWhiteSpace($email)) {
    $email = "admin@regismac.com"
}

Write-Host ""
Write-Host "Contraseña:" -ForegroundColor Yellow
Write-Host "(Presiona Enter para usar: Admin123!)" -ForegroundColor Gray
$password = Read-Host "Contraseña" -AsSecureString
$passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))
if ([string]::IsNullOrWhiteSpace($passwordPlain)) {
    $passwordPlain = "Admin123!"
}

Write-Host ""
Write-Host "Nombre completo:" -ForegroundColor Yellow
Write-Host "(Presiona Enter para usar: Administrador)" -ForegroundColor Gray
$nombre = Read-Host "Nombre"
if ([string]::IsNullOrWhiteSpace($nombre)) {
    $nombre = "Administrador"
}

Write-Host ""
Write-Host "🔧 Creando administrador..." -ForegroundColor Yellow
Write-Host ""

# Ir al directorio del backend
Set-Location regismac-backend

# Ejecutar script de creación
node scripts/createAdmin.js "$email" "$passwordPlain" "$nombre"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ ¡Administrador creado exitosamente!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Credenciales de acceso:" -ForegroundColor Cyan
    Write-Host "   Email: $email" -ForegroundColor White
    Write-Host "   Contraseña: $passwordPlain" -ForegroundColor White
    Write-Host ""
    Write-Host "⚠️  IMPORTANTE: Guarda estas credenciales en un lugar seguro" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ Error al crear el administrador" -ForegroundColor Red
    Write-Host "💡 Verifica que la base de datos esté correctamente migrada" -ForegroundColor Yellow
    Write-Host ""
}

# Volver al directorio raíz
Set-Location ..

Write-Host "📋 Próximos pasos:" -ForegroundColor Cyan
Write-Host "1. Accede a tu aplicación: https://tu-proyecto.vercel.app" -ForegroundColor White
Write-Host "2. Inicia sesión con las credenciales creadas" -ForegroundColor White
Write-Host "3. Cambia la contraseña desde tu perfil" -ForegroundColor White
Write-Host ""
