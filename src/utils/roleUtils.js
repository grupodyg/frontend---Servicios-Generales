/**
 * Utilidades para manejo de roles del sistema
 * SINGLE SOURCE OF TRUTH para validación de roles
 *
 * IMPORTANTE: Los valores de ROLES deben coincidir EXACTAMENTE
 * con los valores en la tabla 'roles' de la base de datos
 *
 * @module roleUtils
 * @author SGS DG System
 * @version 2.0.0
 */

/**
 * Constantes de roles del sistema
 * Estos valores son normalizados por el backend al hacer login
 * El backend convierte los nombres de la BD a estos valores estándar
 */
export const ROLES = {
  ADMIN: 'admin',
  SUPERVISOR: 'supervisor',
  TECNICO: 'tecnico',
  RRHH: 'rrhh'
}

/**
 * Verifica si el usuario tiene alguno de los roles especificados
 * @param {Object} user - Objeto usuario del store de autenticación
 * @param {...string} roles - Lista de roles a verificar
 * @returns {boolean} true si el usuario tiene alguno de los roles especificados
 *
 * @example
 * hasRole(user, ROLES.ADMIN, ROLES.SUPERVISOR) // true si es admin o supervisor
 */
export const hasRole = (user, ...roles) => {
  if (!user || !user.role) return false
  return roles.includes(user.role)
}

/**
 * Verifica si el usuario es Administrador
 * @param {Object} user - Objeto usuario del store
 * @returns {boolean}
 *
 * @example
 * if (isAdmin(user)) {
 *   // Código para administradores
 * }
 */
export const isAdmin = (user) => {
  return hasRole(user, ROLES.ADMIN)
}

/**
 * Verifica si el usuario es Supervisor
 * @param {Object} user - Objeto usuario del store
 * @returns {boolean}
 */
export const isSupervisor = (user) => {
  return hasRole(user, ROLES.SUPERVISOR)
}

/**
 * Verifica si el usuario es Técnico
 * @param {Object} user - Objeto usuario del store
 * @returns {boolean}
 */
export const isTecnico = (user) => {
  return hasRole(user, ROLES.TECNICO)
}

/**
 * Verifica si el usuario es RRHH
 * @param {Object} user - Objeto usuario del store
 * @returns {boolean}
 */
export const isRRHH = (user) => {
  return hasRole(user, ROLES.RRHH)
}

/**
 * Verifica si el usuario es Administrador O Supervisor
 * Útil para funcionalidades que requieren permisos administrativos
 * @param {Object} user - Objeto usuario del store
 * @returns {boolean}
 *
 * @example
 * {isAdminOrSupervisor(user) && (
 *   <button>Editar</button>
 * )}
 */
export const isAdminOrSupervisor = (user) => {
  return hasRole(user, ROLES.ADMIN, ROLES.SUPERVISOR)
}

/**
 * Obtiene el nombre legible del rol para mostrar en la UI
 * @param {string} role - Rol del sistema (valor de la base de datos)
 * @returns {string} Nombre formateado para mostrar al usuario
 *
 * @example
 * getRoleDisplayName('admin') // 'Administrador'
 * getRoleDisplayName('tecnico') // 'Técnico'
 */
export const getRoleDisplayName = (role) => {
  const roleNames = {
    [ROLES.ADMIN]: 'Administrador',
    [ROLES.SUPERVISOR]: 'Supervisor',
    [ROLES.TECNICO]: 'Técnico',
    [ROLES.RRHH]: 'RRHH'
  }
  return roleNames[role] || role
}

/**
 * Verifica si el usuario tiene permisos de administración
 * (Administrador o RRHH)
 * @param {Object} user - Objeto usuario del store
 * @returns {boolean}
 */
export const hasAdminPermissions = (user) => {
  return hasRole(user, ROLES.ADMIN, ROLES.RRHH)
}
