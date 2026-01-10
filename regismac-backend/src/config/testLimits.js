/**
 * Configuración de límites de tiempo para las pruebas
 * Estos valores determinan si una máquina cumple las condiciones para ser considerada "pronta"
 */

// Límites de tiempo en segundos
export const TEST_LIMITS = {
  // Tiempo máximo para alcanzar 0°C (en segundos)
  // Valor actual: 540 segundos = 9 minutos
  TEMPO_0_GRADI_MAX: 540,
  
  // Tiempo mínimo para alcanzar -8°C (en segundos)
  // Valor actual: 540 segundos = 9 minutos
  TEMPO_MENO8_GRADI_MIN: 540,
  
  // Tiempo máximo para alcanzar -8°C (en segundos)
  // Valor actual: 1200 segundos = 20 minutos
  TEMPO_MENO8_GRADI_MAX: 1200,
};

/**
 * Verifica si un test cumple con los límites establecidos
 * @param {number} tempo0Gradi - Tiempo en segundos para alcanzar 0°C
 * @param {number} tempoMeno8Gradi - Tiempo en segundos para alcanzar -8°C
 * @returns {boolean} - true si cumple las condiciones, false en caso contrario
 */
export function verificarLimitesTest(tempo0Gradi, tempoMeno8Gradi) {
  const cumple0Grados = tempo0Gradi <= TEST_LIMITS.TEMPO_0_GRADI_MAX;
  const cumpleMenos8Grados = 
    tempoMeno8Gradi >= TEST_LIMITS.TEMPO_MENO8_GRADI_MIN && 
    tempoMeno8Gradi <= TEST_LIMITS.TEMPO_MENO8_GRADI_MAX;
  
  return cumple0Grados && cumpleMenos8Grados;
}

/**
 * Obtiene los límites en formato legible
 * @returns {Object} - Objeto con los límites en formato legible
 */
export function obtenerLimitesLegibles() {
  return {
    tempo0Gradi: {
      max: TEST_LIMITS.TEMPO_0_GRADI_MAX,
      maxMinutos: TEST_LIMITS.TEMPO_0_GRADI_MAX / 60,
      descripcion: `Máximo ${TEST_LIMITS.TEMPO_0_GRADI_MAX / 60} minutos (${TEST_LIMITS.TEMPO_0_GRADI_MAX} segundos)`
    },
    tempoMeno8Gradi: {
      min: TEST_LIMITS.TEMPO_MENO8_GRADI_MIN,
      max: TEST_LIMITS.TEMPO_MENO8_GRADI_MAX,
      minMinutos: TEST_LIMITS.TEMPO_MENO8_GRADI_MIN / 60,
      maxMinutos: TEST_LIMITS.TEMPO_MENO8_GRADI_MAX / 60,
      descripcion: `Entre ${TEST_LIMITS.TEMPO_MENO8_GRADI_MIN / 60} y ${TEST_LIMITS.TEMPO_MENO8_GRADI_MAX / 60} minutos (${TEST_LIMITS.TEMPO_MENO8_GRADI_MIN}-${TEST_LIMITS.TEMPO_MENO8_GRADI_MAX} segundos)`
    }
  };
}




