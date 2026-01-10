# Script de deployment para RegisMAC (PowerShell)
# Ejecuta: .\scripts\deploy.ps1

Write-Host "🚀 Iniciando deployment de RegisMAC..." -ForegroundColor Cyan
Write-Host ""

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: No se encontró package.json. Asegúrate de estar en la raíz del proyecto." -ForegroundColor Red
    exit 1
}

# Verificar que Git está inicializado
if (-not (Test-Path ".git")) {
    Write-Host "⚠️  Git no está inicializado. Inicializando..." -ForegroundColor Yellow
    git init
}

# Verificar cambios sin commitear
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "📝 Hay cambios sin commitear:" -ForegroundColor Yellow
    git status --short
    Write-Host ""
    $response = Read-Host "¿Deseas hacer commit de estos cambios? (s/n)"
    if ($response -eq "s" -or $response -eq "S") {
        $commitMessage = Read-Host "Mensaje del commit"
        if ([string]::IsNullOrWhiteSpace($commitMessage)) {
            $commitMessage = "feat: Update before deployment"
        }
        git add .
        git commit -m $commitMessage
        Write-Host "✅ Cambios commiteados" -ForegroundColor Green
    }
}

# Verificar que hay un remote configurado
$remotes = git remote
if (-not ($remotes -contains "origin")) {
    Write-Host "⚠️  No hay remote configurado." -ForegroundColor Yellow
    $repoUrl = Read-Host "URL del repositorio de GitHub"
    if ($repoUrl) {
        git remote add origin $repoUrl
        Write-Host "✅ Remote agregado" -ForegroundColor Green
    } else {
        Write-Host "❌ No se puede continuar sin un remote." -ForegroundColor Red
        exit 1
    }
}

# Verificar branch
$currentBranch = git branch --show-current
if (-not $currentBranch) {
    Write-Host "⚠️  No hay branch. Creando branch 'main'..." -ForegroundColor Yellow
    git checkout -b main
    $currentBranch = "main"
}

# Push a GitHub
Write-Host ""
Write-Host "📤 Haciendo push a GitHub..." -ForegroundColor Cyan
try {
    git push origin $currentBranch
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Push exitoso" -ForegroundColor Green
    } else {
        # Intentar con --set-upstream
        git push --set-upstream origin $currentBranch
    }
} catch {
    Write-Host "⚠️  Error en el push. Verifica tu configuración de Git." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Deployment iniciado. Vercel debería detectar el push automáticamente." -ForegroundColor Green
Write-Host "💡 Ve a https://vercel.com para ver el progreso del deployment." -ForegroundColor Yellow
Write-Host ""
