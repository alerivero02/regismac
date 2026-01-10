# Configuración de Google OAuth para Producción

## Variables de Entorno Necesarias

Necesitas configurar estas variables en Vercel:

- `GOOGLE_CLIENT_ID` - ID del cliente OAuth de Google
- `GOOGLE_CLIENT_SECRET` - Secret del cliente OAuth de Google
- `BACKEND_URL` - Ya configurado: `https://regismac.vercel.app`
- `FRONTEND_URL` - Ya configurado: `https://regismac.vercel.app`

## Pasos para Configurar Google OAuth

### 1. Crear/Configurar Proyecto en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto o crea uno nuevo
3. Ve a **APIs & Services** → **Credentials**

### 2. Crear Credenciales OAuth 2.0

1. Click en **+ CREATE CREDENTIALS** → **OAuth client ID**
2. Si es la primera vez, configura la pantalla de consentimiento:
   - Tipo de aplicación: **External** (o Internal si tienes Google Workspace)
   - Nombre de la app: **RegisMac**
   - Email de soporte: Tu email
   - Dominios autorizados: `vercel.app` (opcional)
   - Guarda y continúa

3. Configura el OAuth Client:
   - **Application type**: `Web application`
   - **Name**: `RegisMac Production`
   
4. **Authorized JavaScript origins**:
   ```
   https://regismac.vercel.app
   ```

5. **Authorized redirect URIs**:
   ```
   https://regismac.vercel.app/api/auth/google/callback
   ```

6. Click en **CREATE**
7. Copia el **Client ID** y **Client Secret**

### 3. Configurar Variables en Vercel

1. Ve a tu proyecto en Vercel: https://vercel.com/dashboard
2. Settings → **Environment Variables**
3. Agrega estas variables para **Production**:

   | Variable | Valor |
   |----------|-------|
   | `GOOGLE_CLIENT_ID` | (Pega el Client ID de Google) |
   | `GOOGLE_CLIENT_SECRET` | (Pega el Client Secret de Google) |

4. Guarda los cambios

### 4. Verificar Configuración

Después de agregar las variables:
- Vercel hará un nuevo deploy automáticamente
- Espera 1-2 minutos
- Prueba el login con Google en: https://regismac.vercel.app/login

## Notas Importantes

- El callback URL debe ser exactamente: `https://regismac.vercel.app/api/auth/google/callback`
- Asegúrate de que las variables estén configuradas para el entorno **Production**
- Si cambias el dominio de Vercel, actualiza también las URLs en Google Cloud Console
