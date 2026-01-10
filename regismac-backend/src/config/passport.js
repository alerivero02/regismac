import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  const callbackURL = `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/auth/google/callback`;
  
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
}

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  // Devolver el objeto del usuario de la sesión
  done(null, user);
});

export default passport;

