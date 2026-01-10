import { google } from 'googleapis';
import { Readable } from 'stream';

class GoogleDriveService {
  constructor(accessToken) {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.FRONTEND_URL || 'http://localhost:5173'
    );
    
    if (accessToken) {
      this.oauth2Client.setCredentials({ access_token: accessToken });
    }
  }

  async uploadFile(fileBuffer, fileName, mimeType, targetFolderId = null) {
    try {
      const drive = google.drive({ version: 'v3', auth: this.oauth2Client });
      
      // Usar el folderId proporcionado o el de la variable de entorno
      let folderId = targetFolderId || process.env.GOOGLE_DRIVE_FOLDER_ID || null;
      
      // Si folderId es una URL, extraer solo el ID
      if (folderId && folderId.includes('/folders/')) {
        const match = folderId.match(/\/folders\/([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
          folderId = match[1];
        }
      }
      
      // Si folderId tiene parámetros de URL, limpiarlos
      if (folderId && folderId.includes('?')) {
        folderId = folderId.split('?')[0];
      }
      
      const fileMetadata = {
        name: fileName,
        ...(folderId && { parents: [folderId] }),
      };

      // Convertir el buffer a un stream que Google Drive API pueda usar
      // La API de Google Drive requiere un stream, no un buffer directo
      // Usar Readable.from() que es la forma moderna y correcta
      const bufferStream = Readable.from(fileBuffer);
      
      const media = {
        mimeType: mimeType,
        body: bufferStream,
      };

      const response = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, webViewLink, webContentLink, name',
      });

      // Hacer el archivo público para que se pueda acceder
      try {
        await drive.permissions.create({
          fileId: response.data.id,
          requestBody: {
            role: 'reader',
            type: 'anyone',
          },
          fields: 'id',
        });
        
        // Esperar un momento para que los permisos se propaguen
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // También hacer el archivo compartible públicamente
        await drive.files.update({
          fileId: response.data.id,
          requestBody: {
            shared: true,
          },
          fields: 'id, shared',
        });
      } catch (permError) {
        console.error('⚠️ Error al configurar permisos públicos:', permError);
        console.error('   Detalles:', {
          message: permError.message,
          code: permError.code,
          status: permError.response?.status,
          data: permError.response?.data
        });
        // Continuar aunque falle la configuración de permisos
      }

      // Generar múltiples URLs para compatibilidad
      // La URL uc?export=view funciona mejor para imágenes públicas
      const directImageUrl = `https://drive.google.com/uc?export=view&id=${response.data.id}`;
      // También generar una URL alternativa usando thumbnailLink si está disponible
      const thumbnailUrl = `https://drive.google.com/thumbnail?id=${response.data.id}&sz=w1000`;

      return {
        fileId: response.data.id,
        webViewLink: response.data.webViewLink,
        webContentLink: response.data.webContentLink,
        directImageUrl: directImageUrl, // URL directa para mostrar imágenes (formato uc?export=view)
        thumbnailUrl: thumbnailUrl, // URL alternativa usando thumbnail
      };
    } catch (error) {
      console.error('❌ Error uploading to Google Drive:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      
      // Proporcionar mensajes de error más específicos
      let errorMessage = `Error al subir archivo a Google Drive: ${error.message}`;
      
      if (error.response?.status === 401) {
        errorMessage = 'Token de acceso inválido o expirado. Por favor, cierra sesión y vuelve a iniciar sesión.';
      } else if (error.response?.status === 403) {
        // Verificar si el error es sobre la API no habilitada
        if (error.message?.includes('has not been used') || error.message?.includes('is disabled')) {
          errorMessage = 'La API de Google Drive no está habilitada en tu proyecto de Google Cloud Console. ' +
            'Por favor, habilítala visitando: https://console.developers.google.com/apis/library/drive.googleapis.com ' +
            'y luego espera unos minutos antes de intentar nuevamente.';
        } else {
          errorMessage = 'No tienes permisos para subir archivos a Google Drive. Verifica los permisos de la aplicación.';
        }
      } else if (error.response?.status === 404) {
        errorMessage = 'La carpeta especificada no existe en Google Drive. Verifica GOOGLE_DRIVE_FOLDER_ID.';
      }
      
      throw new Error(errorMessage);
    }
  }

  async deleteFile(fileId) {
    try {
      const drive = google.drive({ version: 'v3', auth: this.oauth2Client });
      await drive.files.delete({ fileId });
      return true;
    } catch (error) {
      console.error('Error deleting from Google Drive:', error);
      throw new Error(`Error al eliminar archivo de Google Drive: ${error.message}`);
    }
  }

  /**
   * Crea una carpeta en Google Drive
   * @param {string} folderName - Nombre de la carpeta
   * @param {string} parentFolderId - ID de la carpeta padre (opcional)
   * @returns {Promise<string>} - ID de la carpeta creada
   */
  async createFolder(folderName, parentFolderId = null) {
    try {
      const drive = google.drive({ version: 'v3', auth: this.oauth2Client });
      
      // Extraer el ID de la carpeta padre si viene como URL
      let parentId = parentFolderId;
      if (parentId && parentId.includes('/folders/')) {
        const match = parentId.match(/\/folders\/([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
          parentId = match[1];
        }
      }
      if (parentId && parentId.includes('?')) {
        parentId = parentId.split('?')[0];
      }
      
      const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        ...(parentId && { parents: [parentId] }),
      };

      const response = await drive.files.create({
        requestBody: fileMetadata,
        fields: 'id, name, webViewLink',
      });


      return response.data.id;
    } catch (error) {
      console.error('❌ Error creating folder in Google Drive:', error);
      throw new Error(`Error al crear carpeta en Google Drive: ${error.message}`);
    }
  }

  /**
   * Busca o crea una carpeta por nombre
   * @param {string} folderName - Nombre de la carpeta
   * @param {string} parentFolderId - ID de la carpeta padre (opcional)
   * @returns {Promise<string>} - ID de la carpeta
   */
  async findOrCreateFolder(folderName, parentFolderId = null) {
    try {
      const drive = google.drive({ version: 'v3', auth: this.oauth2Client });
      
      // Extraer el ID de la carpeta padre si viene como URL
      let parentId = parentFolderId;
      if (parentId && parentId.includes('/folders/')) {
        const match = parentId.match(/\/folders\/([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
          parentId = match[1];
        }
      }
      if (parentId && parentId.includes('?')) {
        parentId = parentId.split('?')[0];
      }

      // Buscar la carpeta (escapar comillas simples en el nombre)
      const escapedFolderName = folderName.replace(/'/g, "\\'");
      let query = `name='${escapedFolderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      if (parentId) {
        query += ` and '${parentId}' in parents`;
      }

      const response = await drive.files.list({
        q: query,
        fields: 'files(id, name)',
        spaces: 'drive',
      });

      // Si existe, retornar su ID
      if (response.data.files && response.data.files.length > 0) {
        return response.data.files[0].id;
      }

      // Si no existe, crearla
      return await this.createFolder(folderName, parentId);
    } catch (error) {
      console.error('❌ Error finding or creating folder:', error);
      throw new Error(`Error al buscar o crear carpeta: ${error.message}`);
    }
  }
}

export default GoogleDriveService;

