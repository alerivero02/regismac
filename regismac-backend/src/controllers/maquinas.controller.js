import { ApiError } from "../utils/apiError.js";
import { MaquinasService } from "../services/maquinas.service.js";
import GoogleDriveService from "../services/googleDrive.service.js";
import { refreshGoogleAccessToken } from "../utils/googleTokenRefresh.js";

export const getMaquinas = async (req, res, next) => {
  try {
    const service = new MaquinasService(req.app.locals.prisma);
    const data = await service.findAll();
    res.json(data);
  } catch (err) {
    console.error('❌ Error en getMaquinas:', {
      message: err.message,
      code: err.code,
      name: err.name,
      stack: err.stack
    });
    next(err);
  }
};

export const getMaquinaById = async (req, res, next) => {
  try {
    const service = new MaquinasService(req.app.locals.prisma);
    const id = Number(req.params.id);

    const maquina = await service.findById(id);
    if (!maquina) throw new ApiError("Máquina no encontrada", 404);

    res.json(maquina);
  } catch (err) {
    next(err);
  }
};

export const createMaquina = async (req, res, next) => {
  try {
    const service = new MaquinasService(req.app.locals.prisma);
    
    // Si hay fotos, subirlas a Google Drive
    const dataToSave = { ...req.body };
    
    // SIEMPRE crear carpeta para la máquina, incluso si no hay fotos
    // Esto permite guardar PDFs de certificación más adelante
    const user = req.user;
    
    // SIEMPRE intentar obtener tokens de la base de datos, incluso si el usuario inició sesión con email/password
    // Esto permite usar Google Drive si el usuario alguna vez inició sesión con Google (mismo email)
    if (user && user.id_usuario) {
      // SIEMPRE buscar en la base de datos para obtener tokens de Google
      const { UsuariosService } = await import("../services/usuarios.service.js");
      const usuariosService = new UsuariosService(req.app.locals.prisma);
      const usuarioCompleto = await usuariosService.findById(user.id_usuario);
      
      // Intentar obtener accessToken y refreshToken de múltiples fuentes
      let accessToken = req.session?.googleAccessToken || user.accessToken;
      let refreshToken = req.session?.googleRefreshToken || user.refreshToken;
      
      // Si el usuario completo tiene google_refresh_token, usarlo (incluso si inició sesión con email/password)
      if (usuarioCompleto) {
        // Actualizar user.google_id si existe en la base de datos
        if (usuarioCompleto.google_id) {
          user.google_id = usuarioCompleto.google_id;
        }
        
        // SIEMPRE intentar obtener el refresh token de la base de datos
        // Esto funciona incluso si el usuario inició sesión con email/password
        if (usuarioCompleto.google_refresh_token) {
          refreshToken = usuarioCompleto.google_refresh_token;
        }
      }
      
      // Si no hay access token pero hay refresh token, SIEMPRE intentar refrescar
      if (!accessToken && refreshToken) {
        try {
          accessToken = await refreshGoogleAccessToken(refreshToken);
          req.session.googleAccessToken = accessToken;
        } catch (refreshError) {
          console.error('❌ Error al refrescar token Google:', refreshError.message);
        }
      }
      
      // Si tenemos access token, verificar que el usuario tenga google_id
      if (accessToken) {
        // Verificar que el usuario tenga google_id (ya debería estar actualizado desde la base de datos)
        if (!user.google_id) {
          throw new ApiError(
            'Per caricare foto e creare cartelle, devi effettuare il login con Google almeno una volta. ' +
            'Dopo il primo login, i token verranno salvati e potrai usare Google Drive senza dover riaccedere.',
            400
          );
        }
        
        try {
          const driveService = new GoogleDriveService(accessToken);

          // SIEMPRE crear o encontrar carpeta para esta máquina nueva (incluso si no hay fotos)
          const folderName = req.body.numero_telaio 
            ? `Maquina ${req.body.numero_telaio}` 
            : `Maquina Nueva`;
          
          let machineFolderId = null;
          try {
            machineFolderId = await driveService.findOrCreateFolder(
              folderName,
              process.env.GOOGLE_DRIVE_FOLDER_ID
            );
          } catch (folderError) {
            console.error('❌ Error al crear carpeta en Google Drive:', folderError.message);
            // Si falla la creación de carpeta, lanzar error para que el usuario lo sepa
            throw new ApiError(
              `Errore nella creazione della cartella per la macchina: ${folderError.message}. ` +
              'Verifica i permessi di Google Drive. Potrebbe essere necessario effettuare nuovamente il login con Google.',
              500
            );
          }

          // Si hay fotos, subirlas a la carpeta de la máquina
          if (req.files && req.files.foto1 && req.files.foto1[0]) {
            const file = req.files.foto1[0];
            const fileName = `maquina_${req.body.numero_telaio || 'nueva'}_foto1_${Date.now()}.${file.originalname.split('.').pop()}`;
            const result = await driveService.uploadFile(
              file.buffer,
              fileName,
              file.mimetype,
              machineFolderId // Usar la carpeta de la máquina
            );
            // SIEMPRE usar directImageUrl para mostrar imágenes correctamente
            dataToSave.foto1 = result.directImageUrl;
          }

          if (req.files && req.files.foto2 && req.files.foto2[0]) {
            const file = req.files.foto2[0];
            const fileName = `maquina_${req.body.numero_telaio || 'nueva'}_foto2_${Date.now()}.${file.originalname.split('.').pop()}`;
            const result = await driveService.uploadFile(
              file.buffer,
              fileName,
              file.mimetype,
              machineFolderId // Usar la carpeta de la máquina
            );
            // SIEMPRE usar directImageUrl para mostrar imágenes correctamente
            dataToSave.foto2 = result.directImageUrl;
          }
        } catch (error) {
          console.error('❌ Error al trabajar con Google Drive:', error.message);
          // Si es un error de creación de carpeta, ya se lanzó arriba
          // Si es un error de subida de foto, lanzar error específico
          if (req.files && (req.files.foto1 || req.files.foto2)) {
            throw new ApiError(
              "Errore nel caricamento delle foto su Google Drive. " +
              "Per favore, riprova più tardi o contatta l'amministratore se il problema persiste.",
              500
            );
          }
          // Si no hay fotos pero falló la creación de carpeta, el error ya se lanzó arriba
          throw error;
        }
      }
    }

    const nueva = await service.create(dataToSave);
    res.status(201).json(nueva);
  } catch (err) {
    next(err);
  }
};

export const updateMaquina = async (req, res, next) => {
  try {
    // Verificar que prisma esté disponible
    if (!req.app || !req.app.locals || !req.app.locals.prisma) {
      console.error('❌ Prisma no está disponible en req.app.locals');
      throw new ApiError("Errore di connessione al database. Il servizio non è disponibile.", 503);
    }
    
    const service = new MaquinasService(req.app.locals.prisma);
    const id = Number(req.params.id);
    
    // Obtener la máquina actual para eliminar fotos antiguas de Drive si es necesario
    let maquinaActual = null;
    try {
      maquinaActual = await service.findById(id);
      if (!maquinaActual) {
        throw new ApiError("Macchina non trovata", 404);
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error('❌ Error al buscar máquina:', error.message);
      // Si hay un error al obtener la máquina, verificar si es un error de conexión
      const isConnectionError = error.code === 'P1001' || 
                               error.code === 'P1002' || 
                               error.code === 'P1017' || 
                               error.code === 'P1000' ||
                               (error.cause && error.cause.code === 'E57P01') ||
                               (error.message && error.message.includes('terminating connection'));
      
      if (isConnectionError) {
        console.error('❌ Error de conexión a la base de datos:', error.code);
        return next(error); // Dejar que el errorHandler lo maneje
      }
      throw new ApiError("Errore nel recupero della macchina: " + error.message, 500);
    }
    
    const dataToSave = { ...req.body };
    
    // Verificar si hay fotos que subir o eliminar
    const hayFotosParaSubir = req.files && (req.files.foto1 || req.files.foto2);
    const hayFotosParaEliminar = (dataToSave.foto1 === null || dataToSave.foto1 === 'null' || dataToSave.foto2 === null || dataToSave.foto2 === 'null');
    const necesitaGoogleDrive = hayFotosParaSubir || hayFotosParaEliminar;
    
    const user = req.user;
    let machineFolderId = null;
    
    // Solo intentar trabajar con Google Drive si hay fotos que subir o eliminar
    if (necesitaGoogleDrive && user && user.id_usuario) {
      // Buscar en la base de datos para obtener tokens de Google
      const { UsuariosService } = await import("../services/usuarios.service.js");
      const usuariosService = new UsuariosService(req.app.locals.prisma);
      const usuarioCompleto = await usuariosService.findById(user.id_usuario);
      
      // Intentar obtener accessToken y refreshToken de múltiples fuentes
      let accessToken = req.session?.googleAccessToken || user.accessToken;
      let refreshToken = req.session?.googleRefreshToken || user.refreshToken;
      
      // Si el usuario completo tiene google_refresh_token, usarlo
      if (usuarioCompleto) {
        if (usuarioCompleto.google_id) {
          user.google_id = usuarioCompleto.google_id;
        }
        if (usuarioCompleto.google_refresh_token) {
          refreshToken = usuarioCompleto.google_refresh_token;
        }
      }
      
      // Si no hay access token pero hay refresh token, intentar refrescar
      if (!accessToken && refreshToken) {
        try {
          accessToken = await refreshGoogleAccessToken(refreshToken);
          req.session.googleAccessToken = accessToken;
        } catch (refreshError) {
          console.error('❌ Error al refrescar token Google:', refreshError.message);
        }
      }
      
      // Si tenemos access token, crear o encontrar carpeta
      if (accessToken) {
        if (!user.google_id) {
          throw new ApiError(
            'Per caricare foto e creare cartelle, devi effettuare il login con Google almeno una volta. ' +
            'Dopo il primo login, i token verranno salvati e potrai usare Google Drive senza dover riaccedere.',
            400
          );
        }
        
        try {
          const driveService = new GoogleDriveService(accessToken);
          const folderName = maquinaActual?.numero_telaio 
            ? `Maquina ${maquinaActual.numero_telaio}` 
            : `Maquina ${id}`;
          
          try {
            machineFolderId = await driveService.findOrCreateFolder(
              folderName,
              process.env.GOOGLE_DRIVE_FOLDER_ID
            );
          } catch (folderError) {
            console.error('❌ Error al crear carpeta en Google Drive:', folderError.message);
            throw new ApiError(
              `Errore nella creazione della cartella per la macchina: ${folderError.message}. ` +
              'Verifica i permessi di Google Drive. Potrebbe essere necessario effettuare nuovamente il login con Google.',
              500
            );
          }
        } catch (error) {
          if (error instanceof ApiError) {
            throw error;
          }
          console.error('❌ Error al trabajar con Google Drive:', error.message);
        }
      } else if (user && !user.google_id) {
        throw new ApiError(
          'Per caricare foto e creare cartelle, devi effettuare il login con Google almeno una volta. ' +
          'Dopo il primo login, i token verranno salvati e potrai usare Google Drive senza dover riaccedere.',
          400
        );
      } else if (!accessToken) {
        throw new ApiError(
          'Token di accesso non disponibile. Per favore, effettua nuovamente il login con Google per rinnovare i token.',
          401
        );
      }
    }
    
    // Si hay fotos, subirlas a la carpeta de la máquina (usar la carpeta ya creada)
    if (req.files && machineFolderId) {
      if (!user) {
        throw new ApiError("Devi essere autenticato per caricare le foto", 401);
      }

      // Obtener accessToken (ya lo tenemos de arriba)
      let accessToken = req.session?.googleAccessToken || user.accessToken;
      
      if (user.google_id && accessToken) {
        try {
          const driveService = new GoogleDriveService(accessToken);

          // Si se está actualizando foto1, eliminar la anterior de Drive si existe
          if (req.files.foto1 && req.files.foto1[0]) {
            // Eliminar foto anterior si existe y es una URL de Drive
            // Esto se hace de forma asíncrona para no bloquear la subida
            if (maquinaActual?.foto1 && maquinaActual.foto1.startsWith('http')) {
              (async () => {
                try {
                  // Extraer el fileId de la URL de Drive
                  const fileIdMatch = maquinaActual.foto1.match(/\/d\/([a-zA-Z0-9_-]+)/);
                  if (fileIdMatch && fileIdMatch[1]) {
                    await driveService.deleteFile(fileIdMatch[1]);
                  }
                } catch (error) {
                  // Continuar aunque falle la eliminación (no crítico)
                }
              })();
            }
            
            const file = req.files.foto1[0];
            const fileName = `maquina_${id}_foto1_${Date.now()}.${file.originalname.split('.').pop()}`;
            
            const result = await driveService.uploadFile(
              file.buffer,
              fileName,
              file.mimetype,
              machineFolderId // Usar la carpeta de la máquina
            );
            
            // SIEMPRE usar directImageUrl para mostrar imágenes correctamente
            dataToSave.foto1 = result.directImageUrl;
          }

          // Si se está actualizando foto2, eliminar la anterior de Drive si existe
          if (req.files.foto2 && req.files.foto2[0]) {
            // Eliminar foto anterior si existe y es una URL de Drive
            // Esto se hace de forma asíncrona para no bloquear la subida
            if (maquinaActual?.foto2 && maquinaActual.foto2.startsWith('http')) {
              (async () => {
                try {
                  // Extraer el fileId de la URL de Drive
                  const fileIdMatch = maquinaActual.foto2.match(/\/d\/([a-zA-Z0-9_-]+)/);
                  if (fileIdMatch && fileIdMatch[1]) {
                    await driveService.deleteFile(fileIdMatch[1]);
                  }
                } catch (error) {
                  // Continuar aunque falle la eliminación (no crítico)
                }
              })();
            }
            
            const file = req.files.foto2[0];
            const fileName = `maquina_${id}_foto2_${Date.now()}.${file.originalname.split('.').pop()}`;
            
            const result = await driveService.uploadFile(
              file.buffer,
              fileName,
              file.mimetype,
              machineFolderId // Usar la carpeta de la máquina
            );
            
            // SIEMPRE usar directImageUrl para mostrar imágenes correctamente
            dataToSave.foto2 = result.directImageUrl;
          }
        } catch (error) {
          console.error('❌ Errore nel caricamento delle foto su Google Drive:', error);
          
          // Si el error es de autenticación y hay refresh token, intentar refrescar
          if ((error.message?.includes('invalid_grant') || error.message?.includes('unauthorized') || error.response?.status === 401) && refreshToken) {
            try {
              accessToken = await refreshGoogleAccessToken(refreshToken);
              req.session.googleAccessToken = accessToken;
              
              const driveService = new GoogleDriveService(accessToken);
              
              if (req.files.foto1 && req.files.foto1[0]) {
                const file = req.files.foto1[0];
                const fileName = `maquina_${id}_foto1_${Date.now()}.${file.originalname.split('.').pop()}`;
                const result = await driveService.uploadFile(file.buffer, fileName, file.mimetype);
                dataToSave.foto1 = result.directImageUrl || result.webViewLink;
              }
              
              if (req.files.foto2 && req.files.foto2[0]) {
                const file = req.files.foto2[0];
                const fileName = `maquina_${id}_foto2_${Date.now()}.${file.originalname.split('.').pop()}`;
                const result = await driveService.uploadFile(file.buffer, fileName, file.mimetype);
                dataToSave.foto2 = result.directImageUrl || result.webViewLink;
              }
            } catch (retryError) {
              console.error('❌ Error al reintentar después de refrescar token:', retryError);
            }
          }
          
          console.error('❌ Errore nel caricamento su Google Drive. Impossibile salvare le foto.');
          throw new ApiError(
            "Errore nel caricamento delle foto su Google Drive. " +
            "Per favore, riprova più tardi o contatta l'amministratore se il problema persiste.",
            500
          );
        }
      } else {
        console.error('❌ Nessun token Google disponibile. Impossibile caricare le foto su Drive.');
        throw new ApiError(
          "Impossibile caricare le foto: Google Drive non è configurato. " +
          "Per favore, effettua il login con Google per abilitare il caricamento delle foto su Drive. " +
          "Se hai già effettuato il login, prova a chiudere la sessione e riaccedere.",
          400
        );
      }
    }

    // Si se envía null para eliminar una foto, también eliminar de Drive
    // Esto se hace de forma asíncrona y no bloquea la actualización si falla
    if (dataToSave.foto1 === null || dataToSave.foto1 === 'null') {
      if (maquinaActual?.foto1 && maquinaActual.foto1.startsWith('http')) {
        // Eliminar de Drive de forma asíncrona (no bloquea la actualización)
        (async () => {
          try {
            const user = req.user;
            const accessToken = req.session?.googleAccessToken || user?.accessToken;
            if (user?.google_id && accessToken) {
              const driveService = new GoogleDriveService(accessToken);
              const fileIdMatch = maquinaActual.foto1.match(/\/d\/([a-zA-Z0-9_-]+)/);
              if (fileIdMatch && fileIdMatch[1]) {
                await driveService.deleteFile(fileIdMatch[1]);
              }
            }
          } catch (error) {
                  // No lanzar error, solo registrar silenciosamente
          }
        })();
      }
      dataToSave.foto1 = null;
    }

    if (dataToSave.foto2 === null || dataToSave.foto2 === 'null') {
      if (maquinaActual?.foto2 && maquinaActual.foto2.startsWith('http')) {
        // Eliminar de Drive de forma asíncrona (no bloquea la actualización)
        (async () => {
          try {
            const user = req.user;
            const accessToken = req.session?.googleAccessToken || user?.accessToken;
            if (user?.google_id && accessToken) {
              const driveService = new GoogleDriveService(accessToken);
              const fileIdMatch = maquinaActual.foto2.match(/\/d\/([a-zA-Z0-9_-]+)/);
              if (fileIdMatch && fileIdMatch[1]) {
                await driveService.deleteFile(fileIdMatch[1]);
              }
            }
          } catch (error) {
                  // No lanzar error, solo registrar silenciosamente
          }
        })();
      }
      dataToSave.foto2 = null;
    }

    try {
      // Intentar actualizar con retry en caso de error de conexión
      let retries = 3;
      let updated = null;
      let lastError = null;
      
      while (retries > 0) {
        try {
          updated = await service.update(id, dataToSave);
          break;
        } catch (updateError) {
          lastError = updateError;
          // Si es un error de conexión y quedan reintentos, intentar reconectar
          const isConnectionError = updateError.code === 'P1001' || 
                                   updateError.code === 'P1002' || 
                                   updateError.code === 'P1017' || 
                                   updateError.code === 'P1000' ||
                                   (updateError.cause && updateError.cause.code === 'E57P01') ||
                                   (updateError.message && updateError.message.includes('terminating connection'));
          
          if (isConnectionError && retries > 1) {
            console.warn(`⚠️ Error de conexión a la base de datos al actualizar máquina. Reintentando... (${retries - 1} intentos restantes)`);
            try {
              await req.app.locals.prisma.$disconnect();
              await req.app.locals.prisma.$connect();
              await new Promise(resolve => setTimeout(resolve, 1000)); // Aumentar delay a 1 segundo
            } catch (reconnectError) {
              console.error('❌ Error al reconectar:', reconnectError.message);
            }
            retries--;
            continue;
          }
          throw updateError;
        }
      }
      
      if (!updated && lastError) {
        throw lastError;
      }
      
      res.json(updated);
    } catch (updateError) {
      console.error('❌ Error al actualizar en la base de datos:', {
        code: updateError.code,
        message: updateError.message,
        name: updateError.name
      });
      // Si hay un error de conexión a la base de datos al actualizar
      const isConnectionError = updateError.code === 'P1001' || 
                                updateError.code === 'P1002' || 
                                updateError.code === 'P1017' || 
                                updateError.code === 'P1000' ||
                                (updateError.cause && updateError.cause.code === 'E57P01') ||
                                (updateError.message && updateError.message.includes('terminating connection'));
      
      if (isConnectionError) {
        console.error('❌ Errore di connessione al database durante l\'aggiornamento:', {
          code: updateError.code,
          message: updateError.message,
          cause: updateError.cause
        });
        return next(updateError); // Dejar que el errorHandler lo maneje con 503
      }
      // Otros errores de Prisma
      if (updateError.code && updateError.code.startsWith('P')) {
        console.error('❌ Errore Prisma durante l\'aggiornamento:', updateError);
        return next(updateError);
      }
      throw updateError;
    }
  } catch (err) {
    console.error('❌ Errore generale in updateMaquina:', {
      message: err.message,
      code: err.code,
      name: err.name,
      stack: err.stack
    });
    next(err);
  }
};

export const updateMaquinasBatch = async (req, res, next) => {
  try {
    const service = new MaquinasService(req.app.locals.prisma);
    const { ids, data } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new ApiError("Debes proporcionar un array de IDs de máquinas", 400);
    }
    
    const result = await service.updateBatch(ids, data);
    res.json({
      message: `${result.count} máquina(s) actualizada(s)`,
      count: result.count
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Crea o verifica la carpeta de Google Drive para una máquina
 * Útil para máquinas existentes que no tienen carpeta
 */
export const createMachineFolder = async (req, res, next) => {
  try {
    const service = new MaquinasService(req.app.locals.prisma);
    const id = Number(req.params.id);
    
    // Obtener la máquina
    const maquina = await service.findById(id);
    if (!maquina) {
      throw new ApiError("Macchina non trovata", 404);
    }

    const user = req.user;
    if (!user || !user.google_id) {
      throw new ApiError("Devi essere autenticato con Google per creare cartelle", 401);
    }

    // Intentar obtener accessToken y refreshToken
    let accessToken = req.session?.googleAccessToken || user.accessToken;
    let refreshToken = req.session?.googleRefreshToken || user.refreshToken;
    
    // Si no hay refresh token, obtenerlo de la base de datos
    if (!refreshToken && user.id_usuario) {
      const { UsuariosService } = await import("../services/usuarios.service.js");
      const usuariosService = new UsuariosService(req.app.locals.prisma);
      const usuarioCompleto = await usuariosService.findById(user.id_usuario);
      if (usuarioCompleto?.google_refresh_token) {
        refreshToken = usuarioCompleto.google_refresh_token;
      }
    }
    
    // Si no hay access token pero hay refresh token, intentar refrescar
    if (!accessToken && refreshToken) {
      try {
        accessToken = await refreshGoogleAccessToken(refreshToken);
        req.session.googleAccessToken = accessToken;
      } catch (refreshError) {
        console.error('❌ Error al refrescar token:', refreshError);
        throw new ApiError("Token di accesso non disponibile. Effettua il login con Google.", 401);
      }
    }

    if (!accessToken) {
      throw new ApiError("Token di accesso non disponibile. Effettua il login con Google.", 401);
    }

    const driveService = new GoogleDriveService(accessToken);

    // Crear o encontrar carpeta para esta máquina
    const folderName = maquina.numero_telaio 
      ? `Maquina ${maquina.numero_telaio}` 
      : `Maquina ${id}`;
    
    const folderId = await driveService.findOrCreateFolder(
      folderName,
      process.env.GOOGLE_DRIVE_FOLDER_ID
    );

    res.json({
      message: "Cartella creata o trovata con successo",
      folderId: folderId,
      folderName: folderName,
      folderUrl: `https://drive.google.com/drive/folders/${folderId}`
    });
  } catch (err) {
    next(err);
  }
};