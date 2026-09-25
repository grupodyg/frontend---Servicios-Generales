/**
 * Utilidades del flujo de firmas del informe final.
 *
 * La configuración de firmas vive en la orden de trabajo (orden.configFirmas) con la forma
 *   { tecnico: boolean, supervisor: boolean, administrador: boolean }
 * donde true = obligatoria y false = opcional. Las firmas se recogen en el orden
 * técnico → supervisor → administrador, saltando las opcionales.
 *
 * Este módulo es la única fuente de verdad del frontend para calcular qué firma toca
 * y qué estado le corresponde al informe. El backend tiene la misma lógica en
 * utils/signatureFlow.js y la aplica cuando el administrador cambia la configuración.
 */

export const TIPOS_FIRMA = ['tecnico', 'supervisor', 'administrador']

export const CONFIG_FIRMAS_DEFAULT = Object.freeze({
  tecnico: true,
  supervisor: true,
  administrador: true
})

export const ETIQUETAS_FIRMA = Object.freeze({
  tecnico: 'Técnico',
  supervisor: 'Supervisor',
  administrador: 'Administrador'
})

export const ESTADO_PENDIENTE_POR_TIPO = Object.freeze({
  tecnico: 'pendiente_firma_tecnico',
  supervisor: 'pendiente_firma_supervisor',
  administrador: 'pendiente_firma_administrador'
})

export const ESTADO_COMPLETADO = 'completado'

/** Rol del usuario autenticado → tipo de firma que le corresponde (null si no firma). */
export const TIPO_FIRMA_POR_ROL = Object.freeze({
  tecnico: 'tecnico',
  supervisor: 'supervisor',
  admin: 'administrador'
})

const parseJson = (value) => {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch (e) {
    return null
  }
}

/**
 * Devuelve siempre un objeto con las tres claves. Cualquier valor que no sea
 * exactamente `false` se interpreta como obligatoria (true), así las órdenes
 * antiguas sin configuración conservan el flujo completo.
 */
export const normalizarConfigFirmas = (config) => {
  const parsed = parseJson(config)
  const source = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  return TIPOS_FIRMA.reduce((acc, tipo) => {
    acc[tipo] = source[tipo] !== false
    return acc
  }, {})
}

export const esFirmaObligatoria = (config, tipo) => normalizarConfigFirmas(config)[tipo]

/** Primera firma obligatoria sin registrar, o null si no queda ninguna. */
export const getFirmaPendiente = (config, firmas) => {
  const configNormalizada = normalizarConfigFirmas(config)
  const firmasRegistradas = parseJson(firmas) || {}
  return TIPOS_FIRMA.find(tipo => configNormalizada[tipo] && !firmasRegistradas[tipo]) || null
}

/** Estado del informe final que corresponde a la configuración y las firmas registradas. */
export const calcularEstadoFirmas = (config, firmas) => {
  const pendiente = getFirmaPendiente(config, firmas)
  return pendiente ? ESTADO_PENDIENTE_POR_TIPO[pendiente] : ESTADO_COMPLETADO
}

/**
 * Firma obligatoria anterior a `tipo` que todavía no se ha registrado, o null.
 * Sirve para explicar en la UI por qué una firma aún no puede darse.
 */
export const getFirmaObligatoriaPreviaPendiente = (config, firmas, tipo) => {
  const configNormalizada = normalizarConfigFirmas(config)
  const firmasRegistradas = parseJson(firmas) || {}
  const indice = TIPOS_FIRMA.indexOf(tipo)
  if (indice <= 0) return null
  return TIPOS_FIRMA.slice(0, indice).find(t => configNormalizada[t] && !firmasRegistradas[t]) || null
}

/** Resumen legible, p. ej. "Técnico y Administrador (Supervisor opcional)". */
export const describirConfigFirmas = (config) => {
  const configNormalizada = normalizarConfigFirmas(config)
  const obligatorias = TIPOS_FIRMA.filter(t => configNormalizada[t]).map(t => ETIQUETAS_FIRMA[t])
  const opcionales = TIPOS_FIRMA.filter(t => !configNormalizada[t]).map(t => ETIQUETAS_FIRMA[t])

  if (obligatorias.length === 0) return 'Ninguna firma obligatoria'

  const listaObligatorias = obligatorias.length === 1
    ? obligatorias[0]
    : `${obligatorias.slice(0, -1).join(', ')} y ${obligatorias[obligatorias.length - 1]}`

  return opcionales.length > 0
    ? `${listaObligatorias} (${opcionales.join(', ')} opcional)`
    : listaObligatorias
}
