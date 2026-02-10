export const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    const ipMatch = hostname.match(/^(\d+\.\d+\.\d+\.\d+)$/);
    if (ipMatch && ipMatch[1]) {
      return `http://${ipMatch[1]}:3000`;
    }
    
    if (hostname && /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      return `http://${hostname}:3000`;
    }
    
    if (window.location.host) {
      const currentHost = window.location.host.split(':')[0];
      const ipMatch2 = currentHost.match(/^(\d+\.\d+\.\d+\.\d+)$/);
      if (ipMatch2 && ipMatch2[1]) {
        return `http://${ipMatch2[1]}:3000`;
      }
    }
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return import.meta.env.VITE_API_URL || 'http://localhost:3000';
    }
    
    // En producción, usar el mismo origen (frontend y backend en el mismo dominio)
    if (hostname.includes('vercel.app') || hostname.includes('netlify.app') || hostname.includes('onrender.com') || hostname.includes('railway.app') || hostname.includes('up.railway.app') || hostname === 'regismac.site' || hostname.endsWith('.regismac.site')) {
      return window.location.origin;
    }
    
    if (hostname.includes('tudominio.com')) {
      return 'https://api.tudominio.com';
    }
    
    if (import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL;
    }
    
    // En producción, por defecto usar el mismo origen
    if (window.location.protocol === 'https:') {
      return window.location.origin;
    }
  }
  
  // Fallback: en desarrollo localhost, en producción mismo origen
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    return window.location.origin;
  }
  
  return 'http://localhost:3000';
};

const API_BASE_URL = getApiBaseUrl();
let isRedirecting = false;

function handleSessionExpired(sessionReplaced = false) {
  if (isRedirecting) return;

  const currentPath = window.location.pathname;
  if (currentPath === '/login' || currentPath === '/registro') {
    return;
  }

  isRedirecting = true;
  sessionStorage.setItem('sessionExpired', 'true');
  if (sessionReplaced) {
    sessionStorage.setItem('sessionReplaced', 'true');
  }
  window.location.href = '/login?sessionExpired=true' + (sessionReplaced ? '&sessionReplaced=true' : '');

  setTimeout(() => {
    isRedirecting = false;
  }, 2000);
}

function fetchWithTimeout(url, options = {}, timeout = 15000) {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout: la richiesta ha impiegato troppo tempo')), timeout)
    )
  ]);
}

async function fetchAPI(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    credentials: 'include',
    headers: {
      ...options.headers,
    },
    ...options,
  };

    if (!(config.body instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json';
    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }
  }

  try {
    // Timeout más largo para endpoints del sensor que pueden tardar más
    const timeout = endpoint.includes('/sensor/') ? 20000 : 15000;
    const response = await fetchWithTimeout(url, config, timeout);
    
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = {};
    }
    
    if (!response.ok) {
      let errorMessage = data.message || data.error || `Errore ${response.status}: ${response.statusText}`;
      
      if (response.status === 404) {
        if (errorMessage.includes('Ruta no encontrada') || errorMessage.includes('no existe')) {
          errorMessage = `Endpoint API non trovato: ${endpoint}. Verifica che l'endpoint sia corretto.`;
          console.error('🔴 Error 404:', {
            endpoint,
            url,
            method: config.method || 'GET',
            serverResponse: data
          });
        } else {
          errorMessage = 'Risorsa non trovata';
        }
      }
      
      else if (response.status === 401) {
        // No redirigir solo en rutas de login/registro/Google; /api/auth/me con 401 = sesión perdida
        const isLoginOrRegister = endpoint.includes('/usuarios/login') || endpoint.includes('/usuarios/registro') ||
          endpoint === '/api/auth/google' || endpoint.includes('/api/auth/google/callback');
        const sessionReplaced = data.code === 'session_replaced';
        const isAuthError = errorMessage.toLowerCase().includes('autenticat') ||
                           errorMessage.toLowerCase().includes('sessione') ||
                           errorMessage.toLowerCase().includes('sostituita') ||
                           errorMessage.toLowerCase().includes('token') ||
                           errorMessage.toLowerCase().includes('unauthorized');

        if (sessionReplaced || (data.message && data.message.includes('altro dispositivo'))) {
          handleSessionExpired(true);
          errorMessage = data.message || 'Hai effettuato l\'accesso da un altro dispositivo o browser. Effettua nuovamente il login.';
        } else if (!isLoginOrRegister) {
          // 401 en cualquier otra ruta (incl. /api/auth/me) = sesión perdida → redirigir a login
          handleSessionExpired(false);
          errorMessage = errorMessage || 'Sessione scaduta. Effettua nuovamente il login.';
        } else {
          errorMessage = 'Non autenticato. Effettua il login.';
        }
      } else if (errorMessage.includes('conexión') || errorMessage.includes('connessione') || errorMessage.includes('database') || errorMessage.includes('PostgreSQL') || errorMessage.includes('postgresql')) {
        errorMessage = 'Errore di connessione al database PostgreSQL. Verifica che il database sia disponibile e che la configurazione sia corretta.';
      } else if (errorMessage.includes('autenticado') || errorMessage.includes('autenticato')) {
        const isAuthError = errorMessage.toLowerCase().includes('autenticat') ||
                           errorMessage.toLowerCase().includes('sessione') ||
                           errorMessage.toLowerCase().includes('token');
        const isLoginOrRegisterReq = endpoint.includes('/usuarios/login') || endpoint.includes('/usuarios/registro') ||
          endpoint === '/api/auth/google' || endpoint.includes('/api/auth/google/callback');
        if (isAuthError && !isLoginOrRegisterReq) handleSessionExpired();
        errorMessage = 'Devi essere autenticato per eseguire questa operazione.';
      } else if (errorMessage.includes('No autenticado')) {
        const isLoginOrRegisterReq = endpoint.includes('/usuarios/login') || endpoint.includes('/usuarios/registro') ||
          endpoint === '/api/auth/google' || endpoint.includes('/api/auth/google/callback');
        if (!isLoginOrRegisterReq) handleSessionExpired();
        errorMessage = 'Non autenticato. Effettua il login.';
      } else if (response.status === 429) {
        errorMessage = data.message || data.error || 'Hai superato il limite di tentativi. Riprova tra 15 minuti.';
      } else if (response.status === 503) {
        errorMessage = 'Il servizio non è disponibile. Verifica che il server sia in esecuzione.';
      } else if (response.status === 500) {
        errorMessage = errorMessage || 'Errore interno del server. Riprova più tardi.';
      }
      
      const error = new Error(errorMessage);
      error.status = response.status;
      throw error;
    }
    
    return data;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      const backendUrl = API_BASE_URL;
      throw new Error(`Impossibile connettersi al server. Assicurati che il backend sia in esecuzione su ${backendUrl}`);
    }
    if (error.message && error.message.includes('Timeout')) {
      const backendUrl = API_BASE_URL;
      // No mostrar error de timeout en cada polling, solo loguear
      const isSensorEndpoint = endpoint.includes('/sensor/');
      if (!isSensorEndpoint) {
        throw new Error(`Timeout: Il server non risponde entro 15 secondi. Verifica che il backend sia in esecuzione su ${backendUrl}`);
      }
      // Para endpoints del sensor, solo loguear silenciosamente
      console.warn(`[Polling] Timeout en ${endpoint}, reintentando...`);
      throw error; // Re-lanzar para que el componente maneje el error silenciosamente
    }
    console.error('Errore API:', error);
    throw error;
  }
}

// API de Máquinas
export const maquinasAPI = {
  getAll: () => fetchAPI('/api/maquinas'),
  getById: (id) => fetchAPI(`/api/maquinas/${id}`),
  create: (data, files = {}) => {
    const formData = new FormData();
    
    // Agregar campos de texto
    Object.keys(data).forEach(key => {
      if (key !== 'foto1' && key !== 'foto2') {
        formData.append(key, data[key]);
      }
    });
    
    // Agregar archivos
    if (files.foto1) formData.append('foto1', files.foto1);
    if (files.foto2) formData.append('foto2', files.foto2);
    
    return fetchAPI('/api/maquinas', { 
      method: 'POST', 
      body: formData
    });
  },
  update: (id, data, files = {}) => {
    const formData = new FormData();
    
    // Agregar campos de texto
    Object.keys(data).forEach(key => {
      if (key !== 'foto1' && key !== 'foto2') {
        formData.append(key, data[key]);
      }
    });
    
    // Agregar archivos
    if (files.foto1) formData.append('foto1', files.foto1);
    if (files.foto2) formData.append('foto2', files.foto2);
    
    return fetchAPI(`/api/maquinas/${id}`, { 
      method: 'PUT', 
      body: formData
    });
  },
  updateBatch: (ids, data) => {
    return fetchAPI('/api/maquinas/batch', {
      method: 'POST',
      body: { ids, data }
    });
  },
};

// API de Autenticación
export const authAPI = {
  loginGoogle: () => {
    window.location.href = `${API_BASE_URL}/api/auth/google`;
  },
  login: (email, password) => fetchAPI('/api/usuarios/login', { 
    method: 'POST', 
    body: { email, password } 
  }),
  logout: () => fetchAPI('/api/auth/logout', { method: 'POST' }),
  getCurrentUser: () => fetchAPI('/api/auth/me'),
};

// API de Usuarios
export const usuariosAPI = {
  registro: (data) => fetchAPI('/api/usuarios/registro', { 
    method: 'POST', 
    body: data 
  }),
  establecerPassword: (password) => fetchAPI('/api/usuarios/establecer-password', {
    method: 'POST',
    body: { password }
  }),
  resetPassword: (email, newPassword) => fetchAPI('/api/usuarios/reset-password', {
    method: 'POST',
    body: { email, newPassword }
  }),
  getAll: () => fetchAPI('/api/usuarios'),
  getPendientes: () => fetchAPI('/api/usuarios/pendientes'),
  aprobar: (id) => fetchAPI(`/api/usuarios/${id}/aprobar`, { method: 'POST' }),
  rechazar: (id) => fetchAPI(`/api/usuarios/${id}/rechazar`, { method: 'POST' }),
  updateRol: (id, rol) => fetchAPI(`/api/usuarios/${id}/rol`, { method: 'PUT', body: { rol } }),
  delete: (id) => fetchAPI(`/api/usuarios/${id}`, { method: 'DELETE' }),
};

// API de Técnicos
export const tecnicosAPI = {
  getAll: () => fetchAPI('/api/tecnicos'),
  getById: (id) => fetchAPI(`/api/tecnicos/${id}`),
  create: (data) => fetchAPI('/api/tecnicos', { method: 'POST', body: data }),
  update: (id, data) => fetchAPI(`/api/tecnicos/${id}`, { method: 'PUT', body: data }),
  delete: (id) => fetchAPI(`/api/tecnicos/${id}`, { method: 'DELETE' }),
};

// API de Tests
export const testsAPI = {
  getAll: () => fetchAPI('/api/tests'),
  getById: (id) => fetchAPI(`/api/tests/${id}`),
  getByMaquina: (maquinaId) => fetchAPI(`/api/tests/maquina/${maquinaId}`),
  create: (data) => fetchAPI('/api/tests', { method: 'POST', body: data }),
  update: (id, data) => fetchAPI(`/api/tests/${id}`, { method: 'PUT', body: data }),
  delete: (id) => fetchAPI(`/api/tests/${id}`, { method: 'DELETE' }),
};

// API de Materiali
export const materialiAPI = {
  getAll: () => fetchAPI('/api/materiali'),
  getById: (id) => fetchAPI(`/api/materiali/${id}`),
  create: (data) => fetchAPI('/api/materiali', { method: 'POST', body: data }),
  update: (id, data) => fetchAPI(`/api/materiali/${id}`, { method: 'PUT', body: data }),
  updateStock: (id, data) => fetchAPI(`/api/materiali/${id}/stock`, { method: 'PATCH', body: data }),
  delete: (id) => fetchAPI(`/api/materiali/${id}`, { method: 'DELETE' }),
};

// API de Ordini Materiali
export const ordiniMaterialiAPI = {
  getAll: (stato) => {
    const url = stato ? `/api/ordini-materiali?stato=${stato}` : '/api/ordini-materiali';
    return fetchAPI(url);
  },
  getById: (id) => fetchAPI(`/api/ordini-materiali/${id}`),
  getByMateriale: (materialeId) => fetchAPI(`/api/ordini-materiali/materiale/${materialeId}`),
  create: (data) => fetchAPI('/api/ordini-materiali', { method: 'POST', body: data }),
  createBulk: (items, commonData) => fetchAPI('/api/ordini-materiali/bulk', {
    method: 'POST',
    body: { items, ...commonData }
  }),
  update: (id, data) => fetchAPI(`/api/ordini-materiali/${id}`, { method: 'PUT', body: data }),
  delete: (id) => fetchAPI(`/api/ordini-materiali/${id}`, { method: 'DELETE' }),
  resendEmail: (id) => fetchAPI(`/api/ordini-materiali/${id}/resend-email`, { method: 'POST' }),
  cancelAll: (filters = {}) => {
    const queryParams = new URLSearchParams();
    if (filters.stato) queryParams.append('stato', filters.stato);
    if (filters.fornitore) queryParams.append('fornitore', filters.fornitore);
    const url = `/api/ordini-materiali/cancel-all${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return fetchAPI(url, { method: 'POST' });
  },
  deleteAll: (filters = {}) => {
    const queryParams = new URLSearchParams();
    if (filters.stato) queryParams.append('stato', filters.stato);
    if (filters.fornitore) queryParams.append('fornitore', filters.fornitore);
    const url = `/api/ordini-materiali/delete-all${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return fetchAPI(url, { method: 'DELETE' });
  },
};

// API de Lotti
export const lottiAPI = {
  getAll: () => fetchAPI('/api/lotti'),
  getById: (id) => fetchAPI(`/api/lotti/${id}`),
  create: (data) => fetchAPI('/api/lotti', { method: 'POST', body: data }),
  update: (id, data) => fetchAPI(`/api/lotti/${id}`, { method: 'PUT', body: data }),
  delete: (id) => fetchAPI(`/api/lotti/${id}`, { method: 'DELETE' }),
  asignarPorRango: (id, numeroTelaioDa, numeroTelaioA) => 
    fetchAPI(`/api/lotti/${id}/asignar-rango`, { 
      method: 'POST', 
      body: { numero_telaio_da: numeroTelaioDa, numero_telaio_a: numeroTelaioA } 
    }),
  getMaquinasDisponiblesEnRango: (numeroTelaioDa, numeroTelaioA) => 
    fetchAPI(`/api/lotti/disponibles?numero_telaio_da=${numeroTelaioDa}&numero_telaio_a=${numeroTelaioA}`),
  quitarMaquina: (idLotto, idMaquina) => 
    fetchAPI(`/api/lotti/${idLotto}/quitar-maquina`, { 
      method: 'POST', 
      body: { id_maquina: idMaquina } 
    }),
};

// API de Health Check (para mantener la app activa en Render)
export const healthAPI = {
  ping: () => fetchAPI('/api/health'),
};

// API de Sensor ESP32
export const sensorAPI = {
  recibirDatos: (temperatura, humedad) => fetchAPI('/api/sensor/datos', {
    method: 'POST',
    body: { temperatura, humedad }
  }),
  obtenerEstado: () => fetchAPI('/api/sensor/estado'),
  iniciarTest: () => fetchAPI('/api/sensor/iniciar', {
    method: 'POST',
    body: {} // El backend toma automáticamente la temperatura del sensor
  }),
  finalizarTest: () => fetchAPI('/api/sensor/finalizar', {
    method: 'POST'
  }),
  cancelarTest: () => fetchAPI('/api/sensor/cancelar', {
    method: 'POST'
  }),
};
