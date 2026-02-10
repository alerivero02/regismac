# Configurar Google OAuth para regismac.site

## Problema: redirect_uri_mismatch

Si ves el error "redirect_uri_mismatch", necesitas agregar la URL de producción a Google Cloud Console.

## Pasos para configurar:

1. **Ir a Google Cloud Console**
   - https://console.cloud.google.com/
   - Selecciona tu proyecto

2. **Navegar a Credenciales OAuth**
   - APIs & Services → Credentials
   - Busca tu OAuth 2.0 Client ID
   - Haz clic para editarlo

3. **Agregar URI autorizado**
   - En "Authorized redirect URIs", agrega:
     ```
     https://regismac.site/api/auth/google/callback
     ```
   - También mantén (si existe):
     ```
     http://localhost:3000/api/auth/google/callback
     ```

4. **Guardar cambios**
   - Haz clic en "Save"
   - Los cambios pueden tardar unos minutos en propagarse

## Verificar configuración:

El callback URL que se está usando es:
- **Producción**: `https://regismac.site/api/auth/google/callback`
- **Desarrollo**: `http://localhost:3000/api/auth/google/callback`

Esto se determina automáticamente según:
- Si `BACKEND_URL` está configurado → usa esa URL
- Si no hay `BACKEND_URL` y estás en producción → usa `https://regismac.site`
- Si estás en desarrollo → usa `http://localhost:3000`

## Variables de entorno necesarias en Railway:

- `GOOGLE_CLIENT_ID`: Tu Client ID de Google
- `GOOGLE_CLIENT_SECRET`: Tu Client Secret de Google
- `BACKEND_URL`: `https://regismac.site` (opcional, se detecta automáticamente)
