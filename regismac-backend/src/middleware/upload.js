import multer from 'multer';

const storage = multer.memoryStorage();

// Validar magic numbers para asegurar que es realmente una imagen
const isValidImage = (buffer) => {
  // JPEG: FF D8 FF
  // PNG: 89 50 4E 47
  // GIF: 47 49 46 38
  // WebP: 52 49 46 46 ... 57 45 42 50
  if (!buffer || buffer.length < 4) return false;
  
  const header = buffer.slice(0, 4);
  const jpeg = header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF;
  const png = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47;
  const gif = header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x38;
  
  // WebP requiere más bytes
  if (buffer.length >= 12) {
    const webp = buffer.slice(0, 4).toString() === 'RIFF' && 
                  buffer.slice(8, 12).toString() === 'WEBP';
    return jpeg || png || gif || webp;
  }
  
  return jpeg || png || gif;
};

const fileFilter = (req, file, cb) => {
  // Validar MIME type
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (!allowedMimes.includes(file.mimetype)) {
    return cb(new Error('Solo sono consentiti file immagine (JPEG, PNG, GIF, WebP)'), false);
  }
  
  // La validación del magic number se hará después de recibir el archivo
  cb(null, true);
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 2, // Máximo 2 archivos
  },
  fileFilter: fileFilter,
});

// Middleware adicional para validar magic numbers
export const validateImageFile = (req, res, next) => {
  try {
    console.log('🔵 validateImageFile - Files:', req.files ? Object.keys(req.files) : 'ninguno');
    
    if (!req.files) {
      console.log('✅ validateImageFile - No hay archivos, continuando...');
      return next();
    }
    
    const files = Object.values(req.files).flat();
    console.log('🔵 validateImageFile - Archivos a validar:', files.length);
    
    for (const file of files) {
      if (file.buffer && !isValidImage(file.buffer)) {
        console.error('❌ validateImageFile - Archivo no válido:', file.originalname);
        return res.status(400).json({ 
          error: 'Il file caricato non è un\'immagine valida. Solo JPEG, PNG, GIF e WebP sono consentiti.' 
        });
      }
    }
    
    console.log('✅ validateImageFile - Validación exitosa');
    next();
  } catch (error) {
    console.error('❌ Error en validateImageFile:', error);
    return res.status(500).json({ 
      error: 'Errore nella validazione del file',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export default upload;

