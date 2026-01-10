import { google } from 'googleapis';

/**
 * Refresca un access token de Google usando el refresh token
 * @param {string} refreshToken - El refresh token de Google
 * @returns {Promise<string>} - El nuevo access token
 */
export async function refreshGoogleAccessToken(refreshToken) {
  if (!refreshToken) {
    throw new Error('Refresh token no disponible');
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.FRONTEND_URL || 'http://localhost:5173'
  );

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  try {
    const { credentials } = await oauth2Client.refreshAccessToken();
    return credentials.access_token;
  } catch (error) {
    console.error('❌ Error al refrescar el token de Google:', error);
    throw new Error(`Error al refrescar el token: ${error.message}`);
  }
}

