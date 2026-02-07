import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

function configureGoogleStrategy() {
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    try {
      const base = (process.env.BACKEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
      const callbackURL = `${base}/api/auth/google/callback`;
      
      const googleStrategy = new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: callbackURL,
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            // Necesitamos el prisma del request, así que guardamos los datos del perfil
            const googleUser = {
              google_id: profile.id,
              email: profile.emails[0].value,
              nombre: profile.displayName.split(' ')[0] || profile.displayName,
              apellido: profile.displayName.split(' ').slice(1).join(' ') || null,
              foto: profile.photos[0].value,
              accessToken,
              refreshToken,
            };
            return done(null, googleUser);
          } catch (error) {
            console.error('❌ Error en Google OAuth callback:', error.message);
            return done(error, null);
          }
        }
      );

      const originalGetAuthorizeUrl = googleStrategy._oauth2.getAuthorizeUrl.bind(googleStrategy._oauth2);
      googleStrategy._oauth2.getAuthorizeUrl = function(params = {}) {
        params.access_type = params.access_type || 'offline';
        params.prompt = params.prompt || 'consent';
        return originalGetAuthorizeUrl(params);
      };

      passport.use('google', googleStrategy);
      console.log('✅ Estrategia de Google OAuth configurada correctamente');
    } catch (error) {
      console.error('❌ Error al configurar estrategia de Google:', error);
    }
  } else {
    console.warn('⚠️  Google OAuth no configurado: faltan GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET');
  }
}

// Configurar la estrategia al cargar el módulo
// En servidorless, las variables de entorno pueden no estar disponibles inmediatamente
// Por eso intentamos configurar, pero no fallamos si no están disponibles
try {
  configureGoogleStrategy();
} catch (error) {
  console.error('❌ Error al inicializar Google OAuth strategy:', error);
  // No lanzar error, permitir que la app se cargue sin Google OAuth
}

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  // Devolver el objeto del usuario de la sesión
  done(null, user);
});

export default passport;

