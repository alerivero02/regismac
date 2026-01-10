/**
 * Script para generar secrets seguros para producción
 */

import crypto from 'crypto';

console.log('🔐 Generando secrets seguros para producción...\n');

const sessionSecret = crypto.randomBytes(32).toString('hex');
const jwtSecret = crypto.randomBytes(32).toString('hex');

console.log('📋 Copia estos valores y agrégalos como variables de entorno en Vercel:\n');
console.log('='.repeat(60));
console.log('SESSION_SECRET=' + sessionSecret);
console.log('JWT_SECRET=' + jwtSecret);
console.log('='.repeat(60));
console.log('\n💡 Ve a Vercel → Settings → Environment Variables');
console.log('   y agrega estas variables para Production, Preview y Development.\n');
