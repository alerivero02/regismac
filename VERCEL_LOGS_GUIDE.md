# Cómo Ver Logs de Error en Vercel

## Opción 1: Ver Logs desde el Dashboard Principal

1. Ve a: https://vercel.com/dashboard
2. Selecciona tu proyecto `regismac`
3. En la página principal del proyecto, busca la sección **"Deployments"**
4. Haz clic en el último deployment (el más reciente)
5. En la página del deployment, busca:
   - **"Runtime Logs"** o **"Logs"** (pestaña o sección)
   - O haz scroll hacia abajo para ver los logs del build y runtime

## Opción 2: Ver Logs en Tiempo Real

1. Ve a: https://vercel.com/dashboard
2. Selecciona tu proyecto `regismac`
3. En el menú lateral izquierdo, busca **"Logs"** o **"Runtime Logs"**
4. Ahí verás todos los logs en tiempo real

## Opción 3: Ver Logs desde el Deployment

1. Ve a: https://vercel.com/dashboard
2. Selecciona tu proyecto `regismac`
3. Click en **"Deployments"** en el menú superior
4. Haz clic en el deployment más reciente
5. Busca la pestaña **"Logs"** o **"Runtime"**
6. Filtra por nivel "Error" si es posible

## Opción 4: Ver Logs desde la URL del Error

Si estás viendo el error 500 en el navegador:
1. Abre las herramientas de desarrollador (F12)
2. Ve a la pestaña **"Network"**
3. Haz la petición que causa el error 500
4. Haz clic en la petición que falló
5. Ve a la pestaña **"Response"** para ver el mensaje de error

## Qué Buscar en los Logs

Busca líneas que contengan:
- `❌ Error`
- `Error en`
- `500`
- `ERR_`
- `Cannot find`
- `undefined`
- Stack traces

Copia y comparte esas líneas para poder ayudarte mejor.
