#!/bin/bash
# Script de deployment para RegisMAC

echo "🚀 Iniciando deployment de RegisMAC..."

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: No se encontró package.json. Asegúrate de estar en la raíz del proyecto.${NC}"
    exit 1
fi

# Verificar que Git está inicializado
if [ ! -d ".git" ]; then
    echo -e "${YELLOW}⚠️  Git no está inicializado. Inicializando...${NC}"
    git init
fi

# Verificar cambios sin commitear
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}📝 Hay cambios sin commitear.${NC}"
    read -p "¿Deseas hacer commit de estos cambios? (s/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        read -p "Mensaje del commit: " commit_message
        git add .
        git commit -m "${commit_message:-feat: Update before deployment}"
    fi
fi

# Verificar que hay un remote configurado
if ! git remote | grep -q "origin"; then
    echo -e "${YELLOW}⚠️  No hay remote configurado.${NC}"
    read -p "URL del repositorio de GitHub: " repo_url
    if [ -n "$repo_url" ]; then
        git remote add origin "$repo_url"
    else
        echo -e "${RED}❌ No se puede continuar sin un remote.${NC}"
        exit 1
    fi
fi

# Push a GitHub
echo -e "${GREEN}📤 Haciendo push a GitHub...${NC}"
git push origin main || git push origin master

echo -e "${GREEN}✅ Deployment iniciado. Vercel debería detectar el push automáticamente.${NC}"
echo -e "${YELLOW}💡 Ve a https://vercel.com para ver el progreso del deployment.${NC}"
