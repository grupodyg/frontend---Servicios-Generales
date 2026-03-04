/**
 * Validaciones para transiciones de estado de Visitas Técnicas
 *
 * Implementa una máquina de estados que define qué transiciones son válidas
 * según las reglas de negocio del sistema.
 */

import { VISITA_ESTADOS } from '../constants/visitasTecnicasConstants'

// ============================================
// MÁQUINA DE ESTADOS
// ============================================

/**
 * Define las transiciones permitidas para cada estado
 *
 * Reglas de negocio:
 * - PENDING → ASSIGNED: Cuando se asignan técnicos
 * - PENDING → IN_PROGRESS: Técnico comienza a trabajar directamente
 * - PENDING → COMPLETED: Técnico completa directamente (si tiene todos los datos)
 * - PENDING → CANCELLED: Se puede cancelar antes de asignar
 * - ASSIGNED → IN_PROGRESS: Técnico comienza a trabajar
 * - ASSIGNED → COMPLETED: Técnico completa directamente
 * - ASSIGNED → CANCELLED: Se puede cancelar después de asignar
 * - IN_PROGRESS → COMPLETED: Técnico termina el trabajo
 * - IN_PROGRESS → CANCELLED: Se puede cancelar durante el trabajo
 * - COMPLETED → APPROVED: Admin aprueba el trabajo
 * - COMPLETED → REJECTED: Admin rechaza el trabajo
 * - REJECTED → ASSIGNED: Se reasigna para correcciones
 * - APPROVED: Estado final (no se puede cambiar)
 * - CANCELLED: Estado final (no se puede cambiar)
 */
export const TRANSICIONES_PERMITIDAS = {
  // Estados usando constantes (ahora en español)
  [VISITA_ESTADOS.PENDING]: [
    VISITA_ESTADOS.ASSIGNED,
    VISITA_ESTADOS.IN_PROGRESS,
    VISITA_ESTADOS.COMPLETED,  // Permitir completar directamente si el técnico tiene todos los datos
    VISITA_ESTADOS.CANCELLED
  ],
  [VISITA_ESTADOS.ASSIGNED]: [
    VISITA_ESTADOS.IN_PROGRESS,
    VISITA_ESTADOS.COMPLETED,
    VISITA_ESTADOS.CANCELLED
  ],
  [VISITA_ESTADOS.IN_PROGRESS]: [
    VISITA_ESTADOS.COMPLETED,
    VISITA_ESTADOS.CANCELLED
  ],
  [VISITA_ESTADOS.COMPLETED]: [
    VISITA_ESTADOS.APPROVED,
    VISITA_ESTADOS.REJECTED
  ],
  [VISITA_ESTADOS.APPROVED]: [
    // Estado final - no permite transiciones
  ],
  [VISITA_ESTADOS.REJECTED]: [
    VISITA_ESTADOS.ASSIGNED  // Permite reasignar para correcciones
  ],
  [VISITA_ESTADOS.CANCELLED]: [
    // Estado final - no permite transiciones
  ]
}

// ============================================
// FUNCIONES DE VALIDACIÓN
// ============================================

/**
 * Valida si una transición de estado es permitida
 *
 * @param {string} estadoActual - Estado actual de la visita
 * @param {string} estadoNuevo - Estado al que se quiere transicionar
 * @returns {boolean} true si la transición es válida, false en caso contrario
 */
export const validarTransicion = (estadoActual, estadoNuevo) => {
  // Si no cambia el estado, es válido
  if (estadoActual === estadoNuevo) {
    return true
  }

  // Verificar si el estado actual está en la máquina de estados
  if (!TRANSICIONES_PERMITIDAS[estadoActual]) {
    console.warn(`Estado actual desconocido: ${estadoActual}`)
    return false
  }

  // Verificar si la transición está permitida
  const transicionPermitida = TRANSICIONES_PERMITIDAS[estadoActual].includes(estadoNuevo)

  if (!transicionPermitida) {
    console.warn(
      `Transición no permitida: ${estadoActual} → ${estadoNuevo}. ` +
      `Transiciones válidas desde ${estadoActual}: ${TRANSICIONES_PERMITIDAS[estadoActual].join(', ')}`
    )
  }

  return transicionPermitida
}

/**
 * Obtiene las transiciones permitidas desde un estado dado
 *
 * @param {string} estadoActual - Estado actual de la visita
 * @returns {string[]} Array con los estados a los que se puede transicionar
 */
export const obtenerTransicionesPermitidas = (estadoActual) => {
  return TRANSICIONES_PERMITIDAS[estadoActual] || []
}

/**
 * Verifica si un estado es un estado final (no permite más transiciones)
 *
 * @param {string} estado - Estado a verificar
 * @returns {boolean} true si es un estado final
 */
export const esEstadoFinal = (estado) => {
  const transiciones = TRANSICIONES_PERMITIDAS[estado] || []
  return transiciones.length === 0
}

/**
 * Valida si se puede aprobar una visita técnica
 *
 * @param {string} estadoActual - Estado actual de la visita
 * @returns {boolean} true si se puede aprobar
 */
export const puedeAprobar = (estadoActual) => {
  return estadoActual === VISITA_ESTADOS.COMPLETED
}

/**
 * Valida si se puede rechazar una visita técnica
 *
 * @param {string} estadoActual - Estado actual de la visita
 * @returns {boolean} true si se puede rechazar
 */
export const puedeRechazar = (estadoActual) => {
  return estadoActual === VISITA_ESTADOS.COMPLETED
}

/**
 * Valida si se puede cancelar una visita técnica
 *
 * @param {string} estadoActual - Estado actual de la visita
 * @returns {boolean} true si se puede cancelar
 */
export const puedeCancelar = (estadoActual) => {
  return [
    VISITA_ESTADOS.PENDING,
    VISITA_ESTADOS.ASSIGNED,
    VISITA_ESTADOS.IN_PROGRESS
  ].includes(estadoActual)
}

/**
 * Valida si se puede completar una visita técnica
 *
 * @param {string} estadoActual - Estado actual de la visita
 * @returns {boolean} true si se puede completar
 */
export const puedeCompletar = (estadoActual) => {
  return [
    VISITA_ESTADOS.PENDING,
    VISITA_ESTADOS.ASSIGNED,
    VISITA_ESTADOS.IN_PROGRESS
  ].includes(estadoActual)
}

/**
 * Valida si se puede editar una visita técnica
 *
 * @param {string} estadoActual - Estado actual de la visita
 * @param {string} rol - Rol del usuario (técnico, admin, supervisor)
 * @returns {boolean} true si se puede editar
 */
export const puedeEditar = (estadoActual, rol) => {
  // Estados finales no se pueden editar
  if (esEstadoFinal(estadoActual)) {
    return false
  }

  // Admin y supervisor pueden editar cualquier estado no final
  if (rol === 'admin' || rol === 'supervisor') {
    return true
  }

  // Técnico puede editar solo en estados específicos
  if (rol === 'técnico' || rol === 'tecnico') {
    return [
      VISITA_ESTADOS.PENDING,
      VISITA_ESTADOS.ASSIGNED,
      VISITA_ESTADOS.IN_PROGRESS
    ].includes(estadoActual)
  }

  return false
}

// ============================================
// MENSAJES DE ERROR
// ============================================

/**
 * Genera un mensaje de error descriptivo para una transición inválida
 *
 * @param {string} estadoActual - Estado actual de la visita
 * @param {string} estadoNuevo - Estado al que se intentó transicionar
 * @returns {string} Mensaje de error
 */
export const generarMensajeErrorTransicion = (estadoActual, estadoNuevo) => {
  if (esEstadoFinal(estadoActual)) {
    return `No se puede cambiar el estado de una visita ${estadoActual}. Es un estado final.`
  }

  const transicionesValidas = obtenerTransicionesPermitidas(estadoActual)

  if (transicionesValidas.length === 0) {
    return `El estado ${estadoActual} no permite ninguna transición.`
  }

  return `No se puede cambiar de ${estadoActual} a ${estadoNuevo}. ` +
         `Transiciones válidas: ${transicionesValidas.join(', ')}`
}

// ============================================
// VALIDACIONES DE NEGOCIO
// ============================================

/**
 * Valida reglas de negocio antes de cambiar estado
 *
 * @param {Object} visita - Objeto de la visita técnica
 * @param {string} estadoNuevo - Estado al que se quiere cambiar
 * @returns {Object} { valido: boolean, mensaje: string }
 */
export const validarReglaDeNegocio = (visita, estadoNuevo) => {
  // Regla: No se puede asignar sin técnicos
  if (estadoNuevo === VISITA_ESTADOS.ASSIGNED) {
    const tieneTecnicos = visita.tecnicosAsignados && visita.tecnicosAsignados.length > 0
    if (!tieneTecnicos) {
      return {
        valido: false,
        mensaje: 'No se puede asignar la visita sin técnicos. Debe asignar al menos un técnico.'
      }
    }
  }

  // Regla: No se puede completar sin datos requeridos
  if (estadoNuevo === VISITA_ESTADOS.COMPLETED) {
    if (!visita.nombreProyecto) {
      return {
        valido: false,
        mensaje: 'No se puede completar la visita sin el nombre del proyecto.'
      }
    }
    if (!visita.firmaTecnico) {
      return {
        valido: false,
        mensaje: 'No se puede completar la visita sin la firma del técnico.'
      }
    }
  }

  // NOTA: Las validaciones de transición de estado (como "solo se puede aprobar si está completada")
  // ya están manejadas por validarTransicion() y TRANSICIONES_PERMITIDAS.
  // Esta función se enfoca en validar DATOS requeridos, no transiciones.

  return { valido: true, mensaje: '' }
}

export default {
  TRANSICIONES_PERMITIDAS,
  validarTransicion,
  obtenerTransicionesPermitidas,
  esEstadoFinal,
  puedeAprobar,
  puedeRechazar,
  puedeCancelar,
  puedeCompletar,
  puedeEditar,
  generarMensajeErrorTransicion,
  validarReglaDeNegocio
}
