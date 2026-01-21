export const errorHandler = (err, req, res, next) => {
  console.error("🔥 ERROR:", err);
  console.error("🔥 ERROR Code:", err.code);
  console.error("🔥 ERROR Message:", err.message);

  // Manejar errores de Prisma (conexión a base de datos)
  if (err.code === 'P1001' || err.code === 'P1002' || err.code === 'P1017' || err.code === 'P1000') {
    // Detectar el tipo de base de datos desde DATABASE_URL
    const dbUrl = process.env.DATABASE_URL || '';
    const dbType = dbUrl.includes('postgresql') ? 'PostgreSQL' 
                  : dbUrl.includes('mysql') ? 'MySQL'
                  : 'database';
    
    // En producción, dar más información útil
    const isProduction = process.env.NODE_ENV === 'production';
    let errorMessage;
    
    if (isProduction) {
      // Mensaje específico para producción
      if (dbType === 'PostgreSQL') {
        errorMessage = 'Errore di connessione al database PostgreSQL su Render.com. Il database potrebbe essere inattivo. Verifica il dashboard di Render.';
      } else {
        errorMessage = `Errore di connessione al database ${dbType}. Verifica che il servizio database sia disponibile.`;
      }
    } else {
      errorMessage = `Errore di connessione al database. Verifica che ${dbType} sia in esecuzione e che la configurazione in .env sia corretta.`;
    }
    
    // Log detallado para diagnóstico
    console.error('🔍 Database Connection Error Details:', {
      code: err.code,
      dbType: dbType,
      hasDatabaseUrl: !!dbUrl,
      databaseUrlPrefix: dbUrl.substring(0, 20) + '...',
      isProduction: isProduction
    });
    
    return res.status(503).json({
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
      code: err.code,
      dbType: dbType
    });
  }

  // Manejar errores de validación de Prisma
  if (err.code === 'P2002') {
    return res.status(409).json({
      error: "Esiste già un record con questi dati unici"
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      error: "Record non trovato"
    });
  }

  // Manejar errores de validación de esquema
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: "Errore di validazione",
      details: err.errors
    });
  }

  // Manejar errores de OAuth (redirect_uri_mismatch, etc.)
  if (err.message && (err.message.includes('redirect_uri_mismatch') || err.message.includes('invalid_request'))) {
    const callbackURL = `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/auth/google/callback`;
    return res.status(400).json({
      error: "Errore di configurazione OAuth",
      message: "Il redirect_uri non corrisponde. Verifica la configurazione in Google Cloud Console.",
      callbackURL: callbackURL,
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }

  // En producción, no exponer detalles del error
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    error: err.message || "Errore interno del server",
    ...(isDevelopment && { 
      details: err.stack,
      code: err.code 
    })
  });
};
