# Activar inicio de sesión con Google en producción

Para que el botón **"Continua con Google"** funcione en tu app desplegada (por ejemplo en Render), debes configurar una aplicación OAuth en Google Cloud y las variables de entorno en tu servicio.

---

## 1. Crear o usar un proyecto en Google Cloud

1. Entra en [Google Cloud Console](https://console.cloud.google.com/).
2. Crea un proyecto o selecciona uno existente (por ejemplo **RegisMAC**).
3. En el menú lateral, ve a **APIs y servicios** → **Credenciales**.

---

## 2. Pantalla de consentimiento OAuth

1. Ve a **APIs y servicios** → **Pantalla de consentimiento de OAuth**.
2. Si es la primera vez:
   - Elige **Externo** (para que cualquier cuenta de Google pueda iniciar sesión) y pulsa **Crear**.
   - Rellena **Nombre de la aplicación** (ej. RegisMAC), **Correo de asistencia** y **Dominio** (opcional).
   - En **Dominios autorizados** añade tu dominio de producción (ej. `regismac.onrender.com`) sin `https://`.
   - Guarda los cambios.
3. Si ya tienes la pantalla de consentimiento, comprueba que el dominio de producción esté en **Dominios autorizados**.

---

## 3. Crear credenciales OAuth 2.0

1. Ve a **APIs y servicios** → **Credenciales**.
2. Pulsa **+ Crear credenciales** → **ID de cliente de OAuth**.
3. Tipo de aplicación: **Aplicación web**.
4. **Nombre**: por ejemplo "RegisMAC Web Producción".
5. En **URIs de redirección autorizados** añade exactamente:
   ```text
   https://TU-DOMINIO-PRODUCCION/api/auth/google/callback
   ```
   Ejemplo para Render:
   ```text
   https://regismac.onrender.com/api/auth/google/callback
   ```
   (Sustituye `regismac.onrender.com` por tu URL real si es distinta.)
6. En **Orígenes de JavaScript autorizados** (si lo pide) puedes añadir:
   ```text
   https://regismac.onrender.com
   ```
7. Pulsa **Crear**.
8. Copia el **ID de cliente** y el **Secreto de cliente** (los usarás en el paso 5).

---

## 4. Variables de entorno en producción (Render)

En el **Dashboard de Render** → tu servicio **regismac** → **Environment**:

1. **GOOGLE_CLIENT_ID**  
   Valor: el **ID de cliente** que copiaste (ej. `xxxxx.apps.googleusercontent.com`).

2. **GOOGLE_CLIENT_SECRET**  
   Valor: el **Secreto de cliente** que copiaste.

3. **BACKEND_URL**  
   Debe ser la URL pública de tu app en producción, por ejemplo:
   ```text
   https://regismac.onrender.com
   ```
   (Sin barra final.)

4. **FRONTEND_URL**  
   En Render suele ser la misma que el backend si frontend y API están en el mismo servicio:
   ```text
   https://regismac.onrender.com
   ```

Guarda los cambios. Render volverá a desplegar el servicio si está configurado para redeploy al cambiar variables.

---

## 5. Comprobar que funciona

1. Abre tu app en producción: `https://tu-dominio.onrender.com`.
2. Ve a la página de login.
3. Pulsa **Continua con Google**.
4. Deberías ser redirigido a Google, elegir cuenta y volver a tu app ya autenticado.

---

## Errores frecuentes

| Error | Causa | Solución |
|-------|--------|----------|
| **redirect_uri_mismatch** | La URL de callback no coincide con la configurada en Google. | En Google Cloud, en **URIs de redirección autorizados**, pon exactamente `https://TU-DOMINIO/api/auth/google/callback` (mismo protocolo, dominio y path). |
| **Google OAuth non configurato** | Faltan variables en el servidor. | Comprueba en Render que **GOOGLE_CLIENT_ID** y **GOOGLE_CLIENT_SECRET** estén definidas y sin espacios. |
| **Access blocked: invalid_client** | Secreto incorrecto o cliente mal configurado. | Revisa que el **Secreto de cliente** en Render sea el mismo que en Google y que el tipo de aplicación sea **Aplicación web**. |

---

## Resumen rápido

1. Google Cloud Console → Credenciales → Crear **ID de cliente OAuth** (tipo **Aplicación web**).
2. Añadir URI de redirección: `https://TU-DOMINIO/api/auth/google/callback`.
3. En Render: definir **GOOGLE_CLIENT_ID**, **GOOGLE_CLIENT_SECRET**, **BACKEND_URL** y **FRONTEND_URL**.
4. Probar el botón **Continua con Google** en la URL de producción.
