/**
 * Constantes centralizadas para el módulo de Visitas Técnicas
 *
 * IMPORTANTE: Este archivo centraliza TODOS los estados y valores relacionados
 * con visitas técnicas para evitar inconsistencias en el código.
 */

// ============================================
// ESTADOS DE VISITAS TÉCNICAS
// ============================================

export const VISITA_ESTADOS = {
  PENDING: 'pendiente',         // Pendiente (creada pero no asignada)
  ASSIGNED: 'asignada',         // Asignada a técnico
  IN_PROGRESS: 'en_proceso',    // En progreso (técnico trabajando)
  COMPLETED: 'completada',      // Completada (esperando aprobación)
  APPROVED: 'aprobada',         // Aprobada por admin
  REJECTED: 'rechazada',        // Rechazada por admin
  CANCELLED: 'cancelada'        // Cancelada
}

// Labels en español para mostrar en UI
export const VISITA_ESTADOS_LABELS = {
  [VISITA_ESTADOS.PENDING]: 'Pendiente',
  [VISITA_ESTADOS.ASSIGNED]: 'Asignada',
  [VISITA_ESTADOS.IN_PROGRESS]: 'En Progreso',
  [VISITA_ESTADOS.COMPLETED]: 'Completada',
  [VISITA_ESTADOS.APPROVED]: 'Aprobada',
  [VISITA_ESTADOS.REJECTED]: 'Rechazada',
  [VISITA_ESTADOS.CANCELLED]: 'Cancelada'
}

// Colores para cada estado (Tailwind classes)
// Mapeo DUAL: soporta estados en INGLÉS (backend) y ESPAÑOL (frontend)
export const VISITA_ESTADOS_COLORS = {
  // ====================================
  // Estados EN INGLÉS (desde backend/BD)
  // ====================================
  'pending': 'bg-amber-100 text-amber-800',        // Pendiente - Amarillo (requiere atención)
  'assigned': 'bg-blue-100 text-blue-800',         // Asignada - Azul (en coordinación)
  'in_progress': 'bg-orange-100 text-orange-800',  // En Progreso - Naranja (trabajo activo)
  'completed': 'bg-purple-100 text-purple-800',    // Completada - Morado (esperando revisión)
  'approved': 'bg-green-100 text-green-800',       // Aprobada - Verde (éxito/finalizado)
  'rejected': 'bg-red-100 text-red-800',           // Rechazada - Rojo (requiere corrección)
  'cancelled': 'bg-gray-400 text-gray-800',        // Cancelada - Gris oscuro (descartado/inactivo)

  // ====================================
  // Estados EN ESPAÑOL (constantes frontend)
  // ====================================
  [VISITA_ESTADOS.PENDING]: 'bg-amber-100 text-amber-800',
  [VISITA_ESTADOS.ASSIGNED]: 'bg-blue-100 text-blue-800',
  [VISITA_ESTADOS.IN_PROGRESS]: 'bg-orange-100 text-orange-800',
  [VISITA_ESTADOS.COMPLETED]: 'bg-purple-100 text-purple-800',
  [VISITA_ESTADOS.APPROVED]: 'bg-green-100 text-green-800',
  [VISITA_ESTADOS.REJECTED]: 'bg-red-100 text-red-800',
  [VISITA_ESTADOS.CANCELLED]: 'bg-gray-400 text-gray-800'
}

// ============================================
// TIPOS DE APROBACIÓN
// ============================================

export const APROBACION_TIPOS = {
  ACEPTADA: 'aceptada',
  RECHAZADA: 'rechazada'
}

// ============================================
// VALIDACIONES DE PERMISOS POR ESTADO
// ============================================

// Estados en los que un técnico puede editar la visita
export const ESTADOS_EDITABLE_TECNICO = [
  VISITA_ESTADOS.PENDING,
  VISITA_ESTADOS.ASSIGNED,
  VISITA_ESTADOS.IN_PROGRESS
]

// Estados en los que un técnico puede editar si fue rechazada
export const ESTADOS_EDITABLE_SI_RECHAZADO = [
  VISITA_ESTADOS.COMPLETED
]

// Estados en los que se puede completar una visita
export const ESTADOS_COMPLETABLES = [
  VISITA_ESTADOS.PENDING,
  VISITA_ESTADOS.ASSIGNED,
  VISITA_ESTADOS.IN_PROGRESS
]

// Estados en los que un técnico puede firmar
export const ESTADOS_FIRMABLES = [
  VISITA_ESTADOS.PENDING,
  VISITA_ESTADOS.ASSIGNED,
  VISITA_ESTADOS.IN_PROGRESS
]

// Estados en los que admin puede aprobar/rechazar
export const ESTADOS_APROBABLES = [
  VISITA_ESTADOS.COMPLETED
]

// ============================================
// TIPOS DE SERVICIO
// ============================================

export const TIPOS_SERVICIO = {
  INSTALACION: 'instalacion',
  MANTENIMIENTO: 'mantenimiento',
  REPARACION: 'reparacion',
  INSPECCION: 'inspeccion',
  ACTUALIZACION: 'actualizacion',
  OTRO: 'otro'
}

export const TIPOS_SERVICIO_LABELS = {
  [TIPOS_SERVICIO.INSTALACION]: 'Instalación',
  [TIPOS_SERVICIO.MANTENIMIENTO]: 'Mantenimiento',
  [TIPOS_SERVICIO.REPARACION]: 'Reparación',
  [TIPOS_SERVICIO.INSPECCION]: 'Inspección',
  [TIPOS_SERVICIO.ACTUALIZACION]: 'Actualización',
  [TIPOS_SERVICIO.OTRO]: 'Otro'
}

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================

/**
 * Obtiene el label en español para un estado
 */
export const getEstadoLabel = (estado) => {
  return VISITA_ESTADOS_LABELS[estado] || estado
}

/**
 * Obtiene las clases de color para un estado
 * Soporta estados en INGLÉS y ESPAÑOL
 */
export const getEstadoColor = (estado) => {
  if (!estado) {
    console.warn('⚠️ getEstadoColor: estado vacío o undefined')
    return 'bg-gray-100 text-gray-800'
  }

  const color = VISITA_ESTADOS_COLORS[estado]

  if (!color) {
    console.warn(`⚠️ getEstadoColor: Estado desconocido "${estado}". Usando color por defecto.`)
    return 'bg-gray-100 text-gray-800'
  }

  return color
}

/**
 * Verifica si un estado es válido (español)
 */
export const isEstadoValido = (estado) => {
  return Object.values(VISITA_ESTADOS).includes(estado)
}

/**
 * Verifica si un estado del backend es válido (inglés)
 */
export const isEstadoValidoBackend = (status) => {
  const estadosBackendValidos = ['pending', 'assigned', 'in_progress', 'completed', 'approved', 'rejected', 'cancelled']
  return estadosBackendValidos.includes(status)
}

/**
 * Verifica si un estado existe en el mapeo de colores
 */
export const tieneColorDefinido = (estado) => {
  return !!VISITA_ESTADOS_COLORS[estado]
}

/**
 * Convierte estado del backend (español) a estado estándar (inglés)
 * NOTA: Esta función es temporal durante la migración
 */
export const normalizarEstado = (estadoBackend) => {
  const mapeoEstados = {
    'pendiente': VISITA_ESTADOS.PENDING,
    'asignada': VISITA_ESTADOS.ASSIGNED,
    'en_proceso': VISITA_ESTADOS.IN_PROGRESS,
    'completada': VISITA_ESTADOS.COMPLETED,
    'aprobada': VISITA_ESTADOS.APPROVED,
    'rechazada': VISITA_ESTADOS.REJECTED,
    'cancelada': VISITA_ESTADOS.CANCELLED
  }

  return mapeoEstados[estadoBackend] || estadoBackend
}

/**
 * Convierte estado estándar (inglés) a formato backend (español)
 * NOTA: Esta función es temporal durante la migración
 */
export const estadoABackend = (estadoFrontend) => {
  const mapeoEstados = {
    [VISITA_ESTADOS.PENDING]: 'pendiente',
    [VISITA_ESTADOS.ASSIGNED]: 'asignada',
    [VISITA_ESTADOS.IN_PROGRESS]: 'en_proceso',
    [VISITA_ESTADOS.COMPLETED]: 'completada',
    [VISITA_ESTADOS.APPROVED]: 'aprobada',
    [VISITA_ESTADOS.REJECTED]: 'rechazada',
    [VISITA_ESTADOS.CANCELLED]: 'cancelada'
  }

  return mapeoEstados[estadoFrontend] || estadoFrontend
}

/**
 * Convierte estado del backend (inglés) a estado frontend (español)
 * Esta función corrige la inconsistencia de idioma entre Backend y Frontend
 *
 * Backend envía: 'completed', 'pending', etc. (inglés)
 * Frontend necesita: 'completada', 'pendiente', etc. (español)
 */
export const normalizarEstadoBackendAFrontend = (statusBackend) => {
  if (!statusBackend) {
    console.warn('⚠️ normalizarEstadoBackendAFrontend: statusBackend vacío')
    return 'pendiente' // Fallback seguro
  }

  const mapeoBackendAFrontend = {
    'pending': 'pendiente',
    'pendiente': 'pendiente', // Ya está en español
    'assigned': 'asignada',
    'asignada': 'asignada', // Ya está en español
    'in_progress': 'en_proceso',
    'en_proceso': 'en_proceso', // Ya está en español
    'completed': 'completada',
    'completada': 'completada', // Ya está en español
    'approved': 'aprobada',
    'aprobada': 'aprobada', // Ya está en español
    'rejected': 'rechazada',
    'rechazada': 'rechazada', // Ya está en español
    'cancelled': 'cancelada',
    'cancelada': 'cancelada' // Ya está en español
  }

  const estadoNormalizado = mapeoBackendAFrontend[statusBackend]

  if (!estadoNormalizado) {
    console.warn(`⚠️ normalizarEstadoBackendAFrontend: Estado backend desconocido "${statusBackend}". No se pudo normalizar.`)
    return statusBackend // Devolver original si no se puede normalizar
  }

  return estadoNormalizado
}

/**
 * Convierte estado frontend (español) a estado backend (inglés)
 * Función inversa a normalizarEstadoBackendAFrontend
 */
export const normalizarEstadoFrontendABackend = (estadoFrontend) => {
  if (!estadoFrontend) {
    console.warn('⚠️ normalizarEstadoFrontendABackend: estadoFrontend vacío')
    return 'pending' // Fallback seguro
  }

  const mapeoFrontendABackend = {
    'pendiente': 'pending',
    'asignada': 'assigned',
    'en_proceso': 'in_progress',
    'completada': 'completed',
    'aprobada': 'approved',
    'rechazada': 'rejected',
    'cancelada': 'cancelled'
  }

  const estadoNormalizado = mapeoFrontendABackend[estadoFrontend]

  if (!estadoNormalizado) {
    console.warn(`⚠️ normalizarEstadoFrontendABackend: Estado frontend desconocido "${estadoFrontend}". No se pudo normalizar.`)
    return estadoFrontend // Devolver original si no se puede normalizar
  }

  return estadoNormalizado
}

// ============================================
// ESPECIALIDADES DE TÉCNICOS
// ============================================

// Colores para especialidades de técnicos (Tailwind classes)
export const ESPECIALIDADES_COLORS = {
  'Supervisión': 'bg-purple-100 text-purple-800',
  'Electricidad': 'bg-yellow-100 text-yellow-800',
  'Electrónica': 'bg-blue-100 text-blue-800',
  'Redes': 'bg-indigo-100 text-indigo-800',
  'Telecomunicaciones': 'bg-cyan-100 text-cyan-800',
  'Instalaciones': 'bg-green-100 text-green-800',
  'Mantenimiento': 'bg-orange-100 text-orange-800',
  'Soporte Técnico': 'bg-teal-100 text-teal-800',
  'Instrumentación': 'bg-pink-100 text-pink-800'
}

/**
 * Obtiene las clases de color para una especialidad
 * Si la especialidad no está en el mapeo, devuelve un color por defecto
 */
export const getEspecialidadColor = (especialidad) => {
  if (!especialidad) return 'bg-gray-100 text-gray-800'

  // Buscar coincidencia exacta
  if (ESPECIALIDADES_COLORS[especialidad]) {
    return ESPECIALIDADES_COLORS[especialidad]
  }

  // Buscar coincidencia parcial (case insensitive)
  const especialidadLower = especialidad.toLowerCase()
  for (const [key, value] of Object.entries(ESPECIALIDADES_COLORS)) {
    if (key.toLowerCase().includes(especialidadLower) ||
        especialidadLower.includes(key.toLowerCase())) {
      return value
    }
  }

  // Color por defecto si no hay coincidencia
  return 'bg-gray-100 text-gray-800'
}

export default {
  VISITA_ESTADOS,
  VISITA_ESTADOS_LABELS,
  VISITA_ESTADOS_COLORS,
  APROBACION_TIPOS,
  ESTADOS_EDITABLE_TECNICO,
  ESTADOS_EDITABLE_SI_RECHAZADO,
  ESTADOS_COMPLETABLES,
  ESTADOS_FIRMABLES,
  ESTADOS_APROBABLES,
  TIPOS_SERVICIO,
  TIPOS_SERVICIO_LABELS,
  ESPECIALIDADES_COLORS,
  getEstadoLabel,
  getEstadoColor,
  getEspecialidadColor,
  isEstadoValido,
  isEstadoValidoBackend,
  tieneColorDefinido,
  normalizarEstado,
  estadoABackend,
  normalizarEstadoBackendAFrontend,
  normalizarEstadoFrontendABackend
}
