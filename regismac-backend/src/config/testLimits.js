/**
 * Configuración de límites de tiempo para las pruebas
 * Estos valores determinan si una máquina cumple las condiciones para ser considerada "pronta"
 */

const DEFAULT_TEST_LIMITS = {
  TEMPO_0_GRADI_MAX: Number(process.env.TEMPO_0_GRADI_MAX) || 540,
  TEMPO_MENO8_GRADI_MAX: Number(process.env.TEMPO_MENO8_GRADI_MAX) || 1200,
};

const TEST_LIMIT_KEYS = {
  TEMPO_0_GRADI_MAX: "test.tempo_0_gradi_max",
  TEMPO_MENO8_GRADI_MAX: "test.tempo_meno8_gradi_max",
};

function validateAndNormalizeLimits(rawLimits = {}) {
  const nextLimits = {
    ...DEFAULT_TEST_LIMITS,
    ...rawLimits,
  };

  const numericKeys = ["TEMPO_0_GRADI_MAX", "TEMPO_MENO8_GRADI_MAX"];
  for (const key of numericKeys) {
    const value = Number(nextLimits[key]);
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`Valore non valido per ${key}`);
    }
    nextLimits[key] = value;
  }

  return nextLimits;
}

export async function getTestLimits(prisma) {
  const rows = await prisma.systemConfig.findMany({
    where: {
      key: { in: Object.values(TEST_LIMIT_KEYS) },
    },
  });

  const persistedLimits = {};
  for (const [limitName, configKey] of Object.entries(TEST_LIMIT_KEYS)) {
    const row = rows.find((item) => item.key === configKey);
    if (row) {
      persistedLimits[limitName] = Number(row.value);
    }
  }

  return validateAndNormalizeLimits(persistedLimits);
}

/**
 * Verifica si un test cumple con los límites establecidos
 * @param {number} tempo0Gradi - Tiempo en segundos para alcanzar 0°C
 * @param {number} tempoMeno8Gradi - Tiempo en segundos para alcanzar -8°C
 * @returns {boolean} - true si cumple las condiciones, false en caso contrario
 */
export async function verificarLimitesTest(prisma, tempo0Gradi, tempoMeno8Gradi) {
  const limits = await getTestLimits(prisma);
  const cumple0Grados = tempo0Gradi <= limits.TEMPO_0_GRADI_MAX;
  const cumpleMenos8Grados = tempoMeno8Gradi <= limits.TEMPO_MENO8_GRADI_MAX;
  
  return cumple0Grados && cumpleMenos8Grados;
}

/**
 * Obtiene los límites en formato legible
 * @returns {Object} - Objeto con los límites en formato legible
 */
export async function obtenerLimitesLegibles(prisma) {
  const limits = await getTestLimits(prisma);
  return {
    tempo0Gradi: {
      max: limits.TEMPO_0_GRADI_MAX,
      maxMinutos: limits.TEMPO_0_GRADI_MAX / 60,
      descripcion: `Máximo ${limits.TEMPO_0_GRADI_MAX / 60} minutos (${limits.TEMPO_0_GRADI_MAX} segundos)`
    },
    tempoMeno8Gradi: {
      max: limits.TEMPO_MENO8_GRADI_MAX,
      maxMinutos: limits.TEMPO_MENO8_GRADI_MAX / 60,
      descripcion: `Máximo ${limits.TEMPO_MENO8_GRADI_MAX / 60} minutos (${limits.TEMPO_MENO8_GRADI_MAX} segundos)`
    }
  };
}

export async function updateTestLimits(prisma, partialLimits = {}) {
  const currentLimits = await getTestLimits(prisma);
  const nextLimits = validateAndNormalizeLimits({
    ...currentLimits,
    ...partialLimits,
  });

  const writeOps = Object.entries(TEST_LIMIT_KEYS).map(([limitName, configKey]) =>
    prisma.systemConfig.upsert({
      where: { key: configKey },
      create: { key: configKey, value: String(nextLimits[limitName]) },
      update: { value: String(nextLimits[limitName]) },
    })
  );

  await prisma.$transaction(writeOps);
  return nextLimits;
}




