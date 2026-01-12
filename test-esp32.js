/**
 * Script para verificar que el ESP32 está funcionando correctamente
 * 
 * Uso:
 *   node test-esp32.js https://TU-URL
 * 
 * Ejemplo:
 *   node test-esp32.js https://regismac.onrender.com
 */

const BASE_URL = process.argv[2] || 'http://localhost:3000';

if (!BASE_URL) {
  console.error('❌ Error: Debes proporcionar la URL del servidor');
  console.log('Uso: node test-esp32.js https://TU-URL');
  process.exit(1);
}

const SENSOR_ENDPOINT = `${BASE_URL}/api/sensor/datos`;
const ESTADO_ENDPOINT = `${BASE_URL}/api/sensor/estado`;
const HEALTH_ENDPOINT = `${BASE_URL}/api/health`;

console.log('\n🔍 Verificando conexión del ESP32...\n');
console.log('Servidor:', BASE_URL);
console.log('Endpoint sensor:', SENSOR_ENDPOINT);
console.log('');

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Test 1: Verificar que el servidor está funcionando
async function testHealth() {
  try {
    log('1️⃣ Verificando salud del servidor...', 'cyan');
    const response = await fetch(HEALTH_ENDPOINT);
    const data = await response.json();
    
    if (response.ok && data.status === 'ok') {
      log('   ✅ Servidor funcionando correctamente', 'green');
      return true;
    } else {
      log('   ❌ Servidor no responde correctamente', 'red');
      return false;
    }
  } catch (error) {
    log(`   ❌ Error al conectar con el servidor: ${error.message}`, 'red');
    return false;
  }
}

// Test 2: Verificar que el endpoint acepta datos
async function testEnviarDatos() {
  try {
    log('\n2️⃣ Verificando que el endpoint acepta datos...', 'cyan');
    
    const testData = {
      temperatura: 25.5,
      humedad: 60.0
    };
    
    const response = await fetch(SENSOR_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      log('   ✅ Endpoint acepta datos correctamente', 'green');
      log(`   📊 Respuesta: ${data.message}`, 'blue');
      return true;
    } else {
      log(`   ❌ Error: ${data.message || response.statusText}`, 'red');
      log(`   📊 Código HTTP: ${response.status}`, 'yellow');
      return false;
    }
  } catch (error) {
    log(`   ❌ Error al enviar datos: ${error.message}`, 'red');
    return false;
  }
}

// Test 3: Verificar estado del sensor (requiere autenticación, pero podemos intentar)
async function testEstadoSensor() {
  try {
    log('\n3️⃣ Verificando estado del sensor...', 'cyan');
    log('   ⚠️  Nota: Este endpoint requiere autenticación', 'yellow');
    
    const response = await fetch(ESTADO_ENDPOINT, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Incluir cookies si hay sesión
    });
    
    if (response.status === 401 || response.status === 403) {
      log('   ⚠️  Requiere autenticación (esto es normal)', 'yellow');
      log('   💡 Para ver el estado, inicia sesión en el frontend', 'blue');
      return null; // No es un error, solo requiere auth
    }
    
    const data = await response.json();
    
    if (response.ok) {
      if (data.temperatura !== null && data.temperatura !== undefined) {
        log('   ✅ Sensor está enviando datos!', 'green');
        log(`   📊 Temperatura: ${data.temperatura}°C`, 'blue');
        log(`   📊 Humedad: ${data.humedad || 'N/A'}%`, 'blue');
        if (data.timestamp) {
          const fecha = new Date(data.timestamp);
          log(`   📊 Última actualización: ${fecha.toLocaleString()}`, 'blue');
        }
        return true;
      } else {
        log('   ⚠️  No hay datos del sensor aún', 'yellow');
        log('   💡 Verifica que el ESP32 esté enviando datos', 'blue');
        return false;
      }
    } else {
      log(`   ❌ Error: ${data.message || response.statusText}`, 'red');
      return false;
    }
  } catch (error) {
    log(`   ❌ Error al obtener estado: ${error.message}`, 'red');
    return false;
  }
}

// Test 4: Verificar formato de datos
async function testFormatoDatos() {
  try {
    log('\n4️⃣ Verificando formato de datos...', 'cyan');
    
    // Test con datos válidos
    const validData = { temperatura: 20.0, humedad: 50.0 };
    const response1 = await fetch(SENSOR_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validData),
    });
    
    if (response1.ok) {
      log('   ✅ Formato de datos correcto', 'green');
    } else {
      log('   ❌ Error con formato válido', 'red');
    }
    
    // Test con datos inválidos (sin temperatura)
    const invalidData = { humedad: 50.0 };
    const response2 = await fetch(SENSOR_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidData),
    });
    
    if (response2.status === 400) {
      log('   ✅ Validación funcionando (rechaza datos sin temperatura)', 'green');
    } else {
      log('   ⚠️  Validación no funciona como se espera', 'yellow');
    }
    
    return true;
  } catch (error) {
    log(`   ❌ Error: ${error.message}`, 'red');
    return false;
  }
}

// Ejecutar todos los tests
async function runTests() {
  const results = {
    health: false,
    enviarDatos: false,
    estadoSensor: null,
    formatoDatos: false,
  };
  
  results.health = await testHealth();
  
  if (!results.health) {
    log('\n❌ El servidor no está funcionando. No se pueden ejecutar más tests.', 'red');
    process.exit(1);
  }
  
  results.enviarDatos = await testEnviarDatos();
  results.estadoSensor = await testEstadoSensor();
  results.formatoDatos = await testFormatoDatos();
  
  // Resumen
  log('\n' + '='.repeat(50), 'cyan');
  log('📊 RESUMEN DE VERIFICACIÓN', 'cyan');
  log('='.repeat(50), 'cyan');
  
  log(`\n✅ Servidor funcionando: ${results.health ? 'SÍ' : 'NO'}`, results.health ? 'green' : 'red');
  log(`✅ Endpoint acepta datos: ${results.enviarDatos ? 'SÍ' : 'NO'}`, results.enviarDatos ? 'green' : 'red');
  log(`✅ Formato de datos: ${results.formatoDatos ? 'SÍ' : 'NO'}`, results.formatoDatos ? 'green' : 'red');
  
  if (results.estadoSensor === true) {
    log(`✅ Sensor enviando datos: SÍ`, 'green');
  } else if (results.estadoSensor === false) {
    log(`⚠️  Sensor enviando datos: NO (verifica el ESP32)`, 'yellow');
  } else {
    log(`⚠️  Sensor enviando datos: Requiere autenticación`, 'yellow');
  }
  
  log('\n💡 Para verificar completamente:', 'blue');
  log('   1. Inicia sesión en el frontend', 'blue');
  log('   2. Ve a la página de Tests', 'blue');
  log('   3. Haz clic en el botón "ESP32"', 'blue');
  log('   4. Verifica que los datos se actualicen cada 5 segundos', 'blue');
  
  log('\n');
  
  // Exit code
  const allPassed = results.health && results.enviarDatos && results.formatoDatos;
  process.exit(allPassed ? 0 : 1);
}

// Ejecutar
runTests().catch(error => {
  log(`\n❌ Error fatal: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

