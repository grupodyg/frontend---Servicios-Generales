/**
 * Traduce cualquier error (de la API o de la propia aplicación) a la información que
 * se le muestra al usuario: qué falló, por qué y qué puede hacer.
 *
 * Función pura (sin dependencias de UI) para poder reutilizarla y probarla.
 * Para mostrar el resultado usar notificationService.mostrarError(error, contexto).
 */

const TITULO_ERROR_SERVIDOR = 'Error interno del servidor'
const TITULO_ERROR_APLICACION = 'Error interno de la aplicación'

// Errores de programación de JavaScript: nunca son culpa de los datos del usuario
const ERRORES_DE_PROGRAMACION = ['TypeError', 'ReferenceError', 'SyntaxError', 'RangeError', 'URIError', 'EvalError']

// Qué puede hacer el usuario cuando el servidor solo envió un motivo corto (sin explicación)
const SUGERENCIA_POR_TIPO = {
  validacion: 'Revisa los datos ingresados en el formulario, corrige el campo indicado y vuelve a intentarlo.',
  conflicto: 'Revisa los datos: entran en conflicto con información ya registrada. Recarga la página para ver el estado actual.',
  no_encontrado: 'Es posible que otro usuario lo haya eliminado o modificado. Recarga la página para ver la información actualizada.',
  permiso: 'Si necesitas realizar esta acción, pide al administrador del sistema que revise el rol asignado a tu usuario.'
}

const asegurarPunto = (texto) => {
  const limpio = (texto || '').trim()
  if (!limpio) return ''
  return /[.!?…]$/.test(limpio) ? limpio : `${limpio}.`
}

/**
 * @param {unknown} error    Error capturado (ApiError, Error o cualquier valor)
 * @param {string}  contexto Lo que se intentaba hacer, ej: 'No se pudo actualizar la orden'
 * @returns {{ titulo: string, contexto: string|null, mensaje: string, sugerencia: string|null,
 *             detalleTecnico: string|null, referencia: string|null, status: number|null, esInterno: boolean }}
 */
export const describirError = (error, contexto = 'No se pudo completar la operación') => {
  const ctx = asegurarPunto(contexto)
  const base = { contexto: null, sugerencia: null, detalleTecnico: null, referencia: null, status: null, esInterno: false }

  // ---------- Errores de la API ----------
  if (error?.name === 'ApiError') {
    const { tipo, status, referencia } = error

    if (tipo === 'red') {
      return { ...base, titulo: 'Sin conexión con el servidor', contexto: ctx, mensaje: error.message, status }
    }

    if (tipo === 'sesion') {
      return { ...base, titulo: error.titulo || 'Sesión expirada', mensaje: error.message, status }
    }

    if (tipo === 'no_disponible') {
      return { ...base, titulo: 'Servidor no disponible', contexto: ctx, mensaje: error.message, referencia, status, esInterno: true }
    }

    if (tipo === 'interno' || status >= 500) {
      return {
        ...base,
        titulo: TITULO_ERROR_SERVIDOR,
        contexto: ctx,
        mensaje: error.message,
        referencia,
        status,
        detalleTecnico: error.datos?.detalleTecnico || null,
        esInterno: true
      }
    }

    // 4xx: el título es lo que se intentaba hacer y el cuerpo, el motivo que dio el servidor
    return {
      ...base,
      titulo: contexto,
      mensaje: asegurarPunto(error.message),
      sugerencia: error.tieneExplicacion ? null : (SUGERENCIA_POR_TIPO[tipo] || null),
      status
    }
  }

  // ---------- Errores de la propia aplicación ----------
  const nombre = error?.name
  const mensajeOriginal = typeof error === 'string' ? error : error?.message

  if (!mensajeOriginal || ERRORES_DE_PROGRAMACION.includes(nombre)) {
    return {
      ...base,
      titulo: TITULO_ERROR_APLICACION,
      contexto: ctx,
      mensaje: 'Se produjo un fallo inesperado en la aplicación. No es un problema de los datos que ingresaste.',
      sugerencia: 'Recarga la página (Ctrl+F5) e inténtalo de nuevo. Si el problema continúa, avisa al administrador del sistema indicando qué estabas haciendo.',
      detalleTecnico: mensajeOriginal ? `${nombre}: ${mensajeOriginal}` : null,
      esInterno: true
    }
  }

  // Error lanzado a propósito por la aplicación con un motivo legible (validaciones, etc.)
  return { ...base, titulo: contexto, mensaje: asegurarPunto(mensajeOriginal) }
}

/**
 * Versión en texto plano (para alert() o mensajes en línea).
 */
export const describirErrorEnTexto = (error, contexto) => {
  const d = describirError(error, contexto)
  return [
    d.contexto && d.titulo !== d.contexto ? d.contexto : null,
    d.mensaje,
    d.sugerencia,
    d.referencia ? `Código de referencia: ${d.referencia}` : null
  ].filter(Boolean).join(' ')
}
