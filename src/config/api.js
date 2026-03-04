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

// API Request Helper with authentication
export const apiRequest = async (url, options = {}) => {
  const headers = {
    ...getAuthHeaders(),
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle 401 Unauthorized y 403 Forbidden (token expirado)
    if (response.status === 401 || response.status === 403) {
      // ✅ CRITICAL FIX: Read the actual error from backend before throwing generic message
      const errorData = await response.json().catch(() => ({}));
      const backendErrorMessage = errorData.error || errorData.mensaje || null;

      // Check if this is a login request (should NOT clear storage for login failures)
      const isLoginRequest = url.includes('/auth/login');

      if (!isLoginRequest) {
        // For non-login requests with 401/403: clear auth and redirect
        localStorage.removeItem('auth-storage');
        if (window.location.pathname !== '/' && window.location.pathname !== '/login') {
          window.location.href = '/';
        }
        throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
      } else {
        // For login requests: throw the actual backend error
        throw new Error(backendErrorMessage || 'Credenciales inválidas');
      }
    }

    // Handle other errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('🔴 API Error Response:', errorData);
      const errorMessage = errorData.details || errorData.error || errorData.mensaje || `Error: ${response.status}`;
      throw new Error(errorMessage);
    }

    // Return JSON response
    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
};

// HTTP Methods helpers
export const api = {
  get: async (url, options = {}) => {
    const result = await apiRequest(url, { method: 'GET', ...options })
    return result
  },

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
  upload: async (url, formData, options = {}) => {
    const token = getAuthToken();
    const headers = {
      // NO incluir 'Content-Type' - fetch lo establece automáticamente con boundary
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
      ...options,
    });

    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem('auth-storage');
      if (window.location.pathname !== '/' && window.location.pathname !== '/login') {
        window.location.href = '/';
      }
      throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || errorData.mensaje || `Error: ${response.status}`;
      throw new Error(errorMessage);
    }

    return await response.json();
  },
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
};
