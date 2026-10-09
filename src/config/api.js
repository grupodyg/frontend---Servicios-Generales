// API Configuration for Backend Connection
export const API_BASE_URL = import.meta.env.VITE_API_URL;

if (!API_BASE_URL) {
  throw new Error('VITE_API_URL no está definido en las variables de entorno');
}

export const API_ENDPOINTS = {
  // ========================================
  // AUTHENTICATION
  // ========================================
  LOGIN: `${API_BASE_URL}/api/auth/login`,
  LOGOUT: `${API_BASE_URL}/api/auth/logout`,

  // ========================================
  // USERS & ROLES
  // ========================================
  USERS: `${API_BASE_URL}/api/users`,
  USER_BY_ID: (id) => `${API_BASE_URL}/api/users/${id}`,

  ROLES: `${API_BASE_URL}/api/roles`,
  ROLE_BY_ID: (id) => `${API_BASE_URL}/api/roles/${id}`,

  PERMISSIONS: `${API_BASE_URL}/api/permissions`,
  PERMISSION_BY_ID: (id) => `${API_BASE_URL}/api/permissions/${id}`,

  ROLES_PERMISSIONS: `${API_BASE_URL}/api/roles-permissions`,
  ROLE_PERMISSION_BY_ID: (id) => `${API_BASE_URL}/api/roles-permissions/${id}`,

  // ========================================
  // CLIENTS
  // ========================================
  CLIENTS: `${API_BASE_URL}/api/clients`,
  CLIENT_BY_ID: (id) => `${API_BASE_URL}/api/clients/${id}`,

  CLIENT_CONTACTS: `${API_BASE_URL}/api/client-contacts`,
  CLIENT_CONTACT_BY_ID: (id) => `${API_BASE_URL}/api/client-contacts/${id}`,

  // ========================================
  // TECHNICAL VISITS
  // ========================================
  TECHNICAL_VISITS: `${API_BASE_URL}/api/technical-visits`,
  TECHNICAL_VISIT_BY_ID: (id) => `${API_BASE_URL}/api/technical-visits/${id}`,
  TECHNICAL_VISIT_NEXT_ID: `${API_BASE_URL}/api/technical-visits/next-id`,
  TECHNICAL_VISIT_PHOTOS: (id) => `${API_BASE_URL}/api/technical-visits/${id}/photos`,
  TECHNICAL_VISIT_PHOTO: (id) => `${API_BASE_URL}/api/technical-visits/${id}/photo`,
  TECHNICAL_VISIT_PHOTO_DELETE: (visitId, filename) => `${API_BASE_URL}/api/technical-visits/${visitId}/photos/${filename}`,

  // ========================================
  // QUOTATIONS
  // ========================================
  QUOTATIONS: `${API_BASE_URL}/api/quotations`,
  QUOTATION_BY_ID: (id) => `${API_BASE_URL}/api/quotations/${id}`,

  QUOTATION_ITEMS: `${API_BASE_URL}/api/quotation-items`,
  QUOTATION_ITEM_BY_ID: (id) => `${API_BASE_URL}/api/quotation-items/${id}`,

  // ========================================
  // WORK ORDERS
  // ========================================
  WORK_ORDERS: `${API_BASE_URL}/api/work-orders`,
  WORK_ORDER_BY_ID: (id) => `${API_BASE_URL}/api/work-orders/${id}`,
  WORK_ORDER_NEXT_ID: `${API_BASE_URL}/api/work-orders/next-id`,
  WORK_ORDER_HISTORY: (id) => `${API_BASE_URL}/api/work-orders/${id}/history`,

  ORDER_PHOTOS: `${API_BASE_URL}/api/order-photos`,
  ORDER_PHOTO_BY_ID: (id) => `${API_BASE_URL}/api/order-photos/${id}`,

  // ========================================
  // DAILY REPORTS
  // ========================================
  DAILY_REPORTS: `${API_BASE_URL}/api/daily-reports`,
  DAILY_REPORT_BY_ID: (id) => `${API_BASE_URL}/api/daily-reports/${id}`,
  DAILY_REPORTS_STATISTICS: `${API_BASE_URL}/api/daily-reports/statistics`,

  // ========================================
  // FINAL REPORTS
  // ========================================
  FINAL_REPORTS: `${API_BASE_URL}/api/final-reports`,
  FINAL_REPORT_BY_ID: (id) => `${API_BASE_URL}/api/final-reports/${id}`,

  // ========================================
  // MATERIALS & INVENTORY
  // ========================================
  MATERIALS: `${API_BASE_URL}/api/materials`,
  MATERIAL_BY_ID: (id) => `${API_BASE_URL}/api/materials/${id}`,

  MATERIAL_CATEGORIES: `${API_BASE_URL}/api/material-categories`,
  MATERIAL_CATEGORY_BY_ID: (id) => `${API_BASE_URL}/api/material-categories/${id}`,

  MATERIAL_REQUESTS: `${API_BASE_URL}/api/material-requests`,
  MATERIAL_REQUEST_BY_ID: (id) => `${API_BASE_URL}/api/material-requests/${id}`,

  // ========================================
  // TOOLS
  // ========================================
  TOOLS: `${API_BASE_URL}/api/tools`,
  TOOL_BY_ID: (id) => `${API_BASE_URL}/api/tools/${id}`,

  TOOL_CATEGORIES: `${API_BASE_URL}/api/tool-categories`,
  TOOL_CATEGORY_BY_ID: (id) => `${API_BASE_URL}/api/tool-categories/${id}`,

  TOOL_REQUESTS: `${API_BASE_URL}/api/tool-requests`,
  TOOL_REQUEST_BY_ID: (id) => `${API_BASE_URL}/api/tool-requests/${id}`,

  // ========================================
  // INSTALLATIONS
  // ========================================
  INSTALLATIONS: `${API_BASE_URL}/api/installations`,
  INSTALLATION_BY_ID: (id) => `${API_BASE_URL}/api/installations/${id}`,

  // ========================================
  // NOTIFICATIONS
  // ========================================
  NOTIFICATIONS: `${API_BASE_URL}/api/notifications`,
  NOTIFICATION_BY_ID: (id) => `${API_BASE_URL}/api/notifications/${id}`,

  // ========================================
  // COMMUNICATIONS
  // ========================================
  COMMUNICATIONS: `${API_BASE_URL}/api/communications`,
  COMMUNICATION_BY_ID: (id) => `${API_BASE_URL}/api/communications/${id}`,

  // ========================================
  // HR - EMPLOYEE PERMITS
  // ========================================
  EMPLOYEE_PERMITS: `${API_BASE_URL}/api/employee-permits`,
  EMPLOYEE_PERMIT_BY_ID: (id) => `${API_BASE_URL}/api/employee-permits/${id}`,

  PERMIT_ATTACHMENTS: `${API_BASE_URL}/api/permit-attachments`,
  PERMIT_ATTACHMENT_BY_ID: (id) => `${API_BASE_URL}/api/permit-attachments/${id}`,
  PERMIT_ATTACHMENT_UPLOAD: `${API_BASE_URL}/api/permit-attachments/upload`,

  // ========================================
  // HR - PAYROLL SLIPS
  // ========================================
  PAYROLL_SLIPS: `${API_BASE_URL}/api/payroll-slips`,
  PAYROLL_SLIP_BY_ID: (id) => `${API_BASE_URL}/api/payroll-slips/${id}`,
  PAYROLL_SLIP_UPLOAD: `${API_BASE_URL}/api/payroll-slips/upload`,

  // ========================================
  // CONFIGURATION
  // ========================================
  SERVICE_TYPES: `${API_BASE_URL}/api/service-types`,
  SERVICE_TYPE_BY_ID: (id) => `${API_BASE_URL}/api/service-types/${id}`,

  SPECIALTY_RATES: `${API_BASE_URL}/api/specialty-rates`,
  SPECIALTY_RATE_BY_ID: (id) => `${API_BASE_URL}/api/specialty-rates/${id}`,
  SPECIALTY_RATE_BY_NAME: (name) => `${API_BASE_URL}/api/specialty-rates/by-name/${encodeURIComponent(name)}`,

  PAYMENT_CONDITIONS: `${API_BASE_URL}/api/payment-conditions`,
  PAYMENT_CONDITION_BY_ID: (id) => `${API_BASE_URL}/api/payment-conditions/${id}`,

  // ========================================
  // DATABASE BACKUPS
  // ========================================
  BACKUPS: `${API_BASE_URL}/api/backups`,
  BACKUP_DOWNLOAD: (filename) => `${API_BASE_URL}/api/backups/download/${filename}`,
  BACKUP_DELETE: (filename) => `${API_BASE_URL}/api/backups/${filename}`,

  // ========================================
  // APP SETTINGS (BRANDING)
  // ========================================
  APP_SETTINGS_PUBLIC: `${API_BASE_URL}/api/app-settings/public`,
  APP_SETTINGS: `${API_BASE_URL}/api/app-settings`,
  APP_SETTINGS_LOGO: `${API_BASE_URL}/api/app-settings/logo`,
};

// Helper function to get auth token
export const getAuthToken = () => {
  const authData = localStorage.getItem('auth-storage');
  if (authData) {
    try {
      const parsed = JSON.parse(authData);
      return parsed.state?.token || null;
    } catch (error) {
      return null;
    }
  }
  return null;
};

// Helper function to create headers with auth
export const getAuthHeaders = () => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

// ========================================
// ERRORES DE LA API
// ========================================

/**
 * Error de una llamada al backend. `message` siempre contiene una explicación pensada
 * para el usuario (por qué falló y cómo corregirlo), así que `error.message` se puede
 * mostrar directamente. Para mostrarlo con formato usar notificationService.mostrarError().
 *
 * tipo: 'validacion' | 'conflicto' | 'no_encontrado' | 'permiso' | 'sesion'
 *       | 'interno' | 'no_disponible' | 'red'
 */
export class ApiError extends Error {
  constructor({ message, titulo = null, status = 0, tipo = 'interno', referencia = null, datos = null, tieneExplicacion = false }) {
    super(message)
    this.name = 'ApiError'
    this.titulo = titulo
    this.status = status
    this.tipo = tipo
    this.referencia = referencia
    this.datos = datos
    // true cuando el backend ya explicó el motivo con detalle (campo `message`)
    this.tieneExplicacion = tieneExplicacion
  }
}

// Tipo de error por código HTTP cuando el backend no lo indica
const tipoPorStatus = (status) => {
  if (status === 400 || status === 413 || status === 422) return 'validacion'
  if (status === 401) return 'sesion'
  if (status === 403) return 'permiso'
  if (status === 404) return 'no_encontrado'
  if (status === 409) return 'conflicto'
  if (status === 502 || status === 503 || status === 504) return 'no_disponible'
  if (status >= 500) return 'interno'
  return 'validacion'
}

// Explicación por defecto cuando la respuesta no trae ningún mensaje (proxy caído, HTML, etc.)
const mensajePorStatus = (status) => {
  if (status === 400) return 'El servidor rechazó los datos enviados. Revisa los campos del formulario.'
  if (status === 403) return 'No tienes permisos para realizar esta acción. Si la necesitas, pide al administrador del sistema que revise el rol de tu usuario.'
  if (status === 404) return 'El registro o la operación solicitada no existe. Es posible que otro usuario lo haya eliminado: recarga la página para ver la información actualizada.'
  if (status === 409) return 'La operación entra en conflicto con información ya registrada. Recarga la página y revisa los datos.'
  if (status === 413) return 'La información enviada es demasiado grande para el servidor. Si estás adjuntando archivos, súbelos en varias tandas.'
  if (status === 502 || status === 503 || status === 504) {
    return `El servidor no respondió (código ${status}). Puede estar reiniciándose o temporalmente fuera de servicio. Espera unos minutos y vuelve a intentarlo; si persiste, avisa al administrador del sistema.`
  }
  if (status >= 500) {
    return `Ocurrió un fallo inesperado en el servidor (código ${status}). No es un problema de los datos que ingresaste. Vuelve a intentarlo en unos minutos; si persiste, avisa al administrador del sistema.`
  }
  return `El servidor respondió con un error inesperado (código ${status}).`
}

const textoNoVacio = (valor) => (typeof valor === 'string' && valor.trim() ? valor.trim() : null)

/**
 * Construye un ApiError a partir de una respuesta HTTP no exitosa.
 * Acepta las formas de error del backend: { error, message, tipo, referencia }, { mensaje } o { details }.
 */
export const crearErrorDesdeRespuesta = async (response) => {
  const datos = await response.json().catch(() => ({}))
  const status = response.status
  const titulo = textoNoVacio(datos.error)
  const explicacion = textoNoVacio(datos.message) || textoNoVacio(datos.details)
  const mensaje = explicacion || titulo || textoNoVacio(datos.mensaje) || mensajePorStatus(status)

  return new ApiError({
    message: mensaje,
    titulo,
    status,
    tipo: datos.tipo || tipoPorStatus(status),
    referencia: datos.referencia || null,
    datos,
    tieneExplicacion: Boolean(explicacion)
  })
}

// fetch lanza TypeError cuando no hay conexión, el servidor no responde o CORS lo bloquea
const crearErrorDeRed = (error) => new ApiError({
  message: 'No se pudo conectar con el servidor. Comprueba tu conexión a internet y vuelve a intentarlo. Si tu conexión funciona, el servidor puede estar temporalmente fuera de servicio: espera unos minutos y, si persiste, avisa al administrador del sistema.',
  titulo: 'Sin conexión con el servidor',
  status: 0,
  tipo: 'red',
  datos: { detalleTecnico: error?.message }
})

const cerrarSesionExpirada = () => {
  localStorage.removeItem('auth-storage')
  if (window.location.pathname !== '/' && window.location.pathname !== '/login') {
    window.location.href = '/'
  }
}

/**
 * fetch con manejo homogéneo de errores. Devuelve la Response si fue exitosa;
 * en cualquier otro caso lanza un ApiError con una explicación para el usuario.
 * Úsalo directamente solo cuando la respuesta no es JSON (descargas de archivos).
 */
export const fetchConManejoErrores = async (url, options = {}) => {
  let response
  try {
    response = await fetch(url, options)
  } catch (error) {
    throw crearErrorDeRed(error)
  }

  if (response.ok) return response

  const apiError = await crearErrorDesdeRespuesta(response)
  console.error('🔴 API Error Response:', response.status, apiError.datos)

  // 401: en el login son credenciales incorrectas; en el resto, sesión expirada / token inválido
  if (response.status === 401) {
    if (url.includes('/auth/login')) throw apiError
    cerrarSesionExpirada()
    throw new ApiError({
      message: 'Tu sesión expiró o ya no es válida. Vuelve a iniciar sesión para continuar; los cambios que no se guardaron deberán ingresarse de nuevo.',
      titulo: 'Sesión expirada',
      status: 401,
      tipo: 'sesion',
      datos: apiError.datos
    })
  }

  // 403: sin permisos, pero la sesión sigue siendo válida (NO hacer logout)
  throw apiError
}

// Lee el JSON de una respuesta exitosa
const leerJson = async (response) => {
  const texto = await response.text()
  if (!texto) return null
  try {
    return JSON.parse(texto)
  } catch {
    throw new ApiError({
      message: 'El servidor respondió con datos que la aplicación no puede leer. Recarga la página e inténtalo de nuevo; si persiste, avisa al administrador del sistema.',
      titulo: 'Respuesta no válida del servidor',
      status: response.status,
      tipo: 'interno'
    })
  }
}

// API Request Helper with authentication
export const apiRequest = async (url, options = {}) => {
  const response = await fetchConManejoErrores(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
  })
  return leerJson(response)
}

// Cabeceras para FormData: sin 'Content-Type' (fetch lo establece con el boundary)
const getUploadHeaders = (extra = {}) => {
  const token = getAuthToken()
  return {
    ...(token && { Authorization: `Bearer ${token}` }),
    ...extra,
  }
}

const enviarFormData = async (method, url, formData, options = {}) => {
  const response = await fetchConManejoErrores(url, {
    method,
    body: formData,
    ...options,
    headers: getUploadHeaders(options.headers),
  })
  return leerJson(response)
}

// HTTP Methods helpers
export const api = {
  get: (url, options = {}) => apiRequest(url, { method: 'GET', ...options }),

  post: (url, data, options = {}) =>
    apiRequest(url, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    }),

  put: (url, data, options = {}) =>
    apiRequest(url, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options,
    }),

  patch: (url, data, options = {}) =>
    apiRequest(url, {
      method: 'PATCH',
      body: JSON.stringify(data),
      ...options,
    }),

  delete: (url, options = {}) =>
    apiRequest(url, { method: 'DELETE', ...options }),

  // Upload con FormData (para archivos)
  upload: (url, formData, options = {}) => enviarFormData('POST', url, formData, options),

  uploadPut: (url, formData, options = {}) => enviarFormData('PUT', url, formData, options),
};

/**
 * Construye la URL completa para un archivo/foto del servidor
 * @param {string} path - Ruta relativa (ej: /uploads/technical_visits/foto.jpg)
 * @returns {string} URL completa del archivo
 */
export const getFileUrl = (path) => {
  if (!path) return '';
  // Si ya es una URL completa (blob: o https:// o http://), devolverla tal cual
  if (path.startsWith('blob:') || path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  // Construir URL completa con la base del backend
  const baseUrl = API_BASE_URL.replace(/\/api\/?$/, ''); // Quitar /api del final
  return `${baseUrl}${path}`;
};

export default {
  API_ENDPOINTS,
  getAuthToken,
  getAuthHeaders,
  apiRequest,
  api,
  getFileUrl,
  ApiError,
  fetchConManejoErrores,
};
