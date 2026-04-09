const SEQUENCE_CONFIG = {
  maquina: {
    table: 'Maquina',
    idColumn: 'id_maquina',
  },
  test: {
    table: 'Test',
    idColumn: 'id_test',
  },
};

function quoteIdentifier(identifier) {
  return `"${String(identifier).replace(/"/g, '""')}"`;
}

function buildSyncStatement(table, idColumn) {
  const quotedTable = quoteIdentifier(table);
  const quotedColumn = quoteIdentifier(idColumn);
  return `
    SELECT setval(
      pg_get_serial_sequence('"public".${quotedTable}', '${idColumn}'),
      COALESCE((SELECT MAX(${quotedColumn}) FROM "public".${quotedTable}), 0) + 1,
      false
    );
  `;
}

export async function syncSequence(prisma, key) {
  const config = SEQUENCE_CONFIG[key];
  if (!config) {
    throw new Error(`Sequence key no soportada: ${key}`);
  }

  const statement = buildSyncStatement(config.table, config.idColumn);
  await prisma.$executeRawUnsafe(statement);
}

export async function syncKnownSequences(prisma) {
  await syncSequence(prisma, 'maquina');
  await syncSequence(prisma, 'test');
}

export function isPrimaryKeyCollision(error, key) {
  if (!error || error.code !== 'P2002') {
    return false;
  }

  const target = Array.isArray(error.meta?.target)
    ? error.meta.target.join(',')
    : String(error.meta?.target || '');
  const details = `${error.message || ''} ${target}`.toLowerCase();

  if (key === 'maquina') {
    return details.includes('id_maquina') || details.includes('maquina_pkey');
  }

  if (key === 'test') {
    return details.includes('id_test') || details.includes('test_pkey');
  }

  return false;
}
