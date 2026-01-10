# 🔐 Autenticación GitHub

## Problema
GitHub requiere autenticación con Personal Access Token (ya no acepta passwords).

## Solución Rápida

### Opción 1: Personal Access Token (Recomendado)

1. Ve a: **https://github.com/settings/tokens**
2. Click en **"Generate new token"** → **"Generate new token (classic)"**
3. Configuración:
   - Note: `regismac-deploy`
   - Expiration: `90 days` (o el que prefieras)
   - Scopes: Marca **`repo`** (todos los permisos)
4. Click en **"Generate token"**
5. **COPIA el token** (solo se muestra una vez)

6. En tu terminal, ejecuta:
```powershell
git push -u origin main
```

7. Cuando pida autenticación:
   - Username: `alerivero02`
   - Password: **Pega el token** (no tu password de GitHub)

### Opción 2: GitHub CLI

Si tienes GitHub CLI instalado:
```powershell
gh auth login
```

Luego:
```powershell
git push -u origin main
```

### Opción 3: Configurar Credential Manager

```powershell
git config --global credential.helper manager-core
git push -u origin main
```

---

**✅ Cuando el push sea exitoso, escribe "GITHUB LISTO"**
