/**
 * Utilidades para inputs numéricos controlados
 * SINGLE SOURCE OF TRUTH para el manejo de campos type="number"
 *
 * PROBLEMA QUE RESUELVEN:
 * El patrón `parseInt(e.target.value) || 1` reinyecta un valor por defecto
 * en cuanto el campo queda vacío (parseInt('') === NaN, y NaN || 1 === 1),
 * por lo que el usuario nunca puede borrar el contenido para escribir otra
 * cifra: el input se rellena solo mientras escribe.
 *
 * REGLA: mientras se edita, el campo PUEDE quedar vacío ('').
 * La conversión a número se hace al guardar o al calcular, no al teclear.
 *
 * @module numberInputUtils
 * @author SGS DG System
 * @version 1.0.0
 */

/**
 * Indica si un valor de input numérico está vacío (aún sin escribir)
 * @param {string|number|null|undefined} valor - Valor del campo
 * @returns {boolean} true si el campo está vacío
 */
export const esValorVacio = (valor) =>
  valor === '' || valor === null || valor === undefined || Number.isNaN(valor)

/**
 * Normaliza lo que el usuario escribe en un input de cantidades enteras
 * Permite dejar el campo vacío en lugar de forzar un valor por defecto
 * @param {string} valor - e.target.value del input
 * @returns {number|string} Entero escrito, o '' si el campo quedó vacío
 *
 * @example
 * parseEnteroInput('')   // '' (el usuario borró el campo, se respeta)
 * parseEnteroInput('25') // 25
 */
export const parseEnteroInput = (valor) => {
  if (valor === '' || valor === null || valor === undefined) return ''
  const numero = parseInt(valor, 10)
  return Number.isNaN(numero) ? '' : numero
}

/**
 * Igual que parseEnteroInput pero admite decimales (precios, días, horas)
 * @param {string} valor - e.target.value del input
 * @returns {number|string} Número escrito, o '' si el campo quedó vacío
 *
 * @example
 * parseDecimalInput('')     // ''
 * parseDecimalInput('12.5') // 12.5
 */
export const parseDecimalInput = (valor) => {
  if (valor === '' || valor === null || valor === undefined) return ''
  const numero = parseFloat(valor)
  return Number.isNaN(numero) ? '' : numero
}

/**
 * Convierte a número para cálculos o envío al backend
 * Un campo vacío no debe viajar como '' ni como NaN
 * @param {string|number} valor - Valor del estado
 * @param {number} [porDefecto=0] - Valor a usar si está vacío o es inválido
 * @returns {number} Número seguro para operar o persistir
 *
 * @example
 * aNumero('', 1)   // 1
 * aNumero('12.5')  // 12.5
 */
export const aNumero = (valor, porDefecto = 0) => {
  if (valor === '' || valor === null || valor === undefined) return porDefecto
  const numero = typeof valor === 'number' ? valor : parseFloat(valor)
  return Number.isNaN(numero) ? porDefecto : numero
}

/**
 * Ajusta un valor a un rango [min, max] al terminar de editar (onBlur)
 * NO debe usarse en onChange: acotar mientras se teclea impide escribir
 * cifras de varios dígitos (al escribir "1" de "15" se corregiría a min)
 * @param {string|number} valor - Valor del estado
 * @param {number} min - Límite inferior
 * @param {number} max - Límite superior
 * @returns {number} Valor acotado dentro del rango
 */
export const acotarRango = (valor, min, max) => {
  const numero = aNumero(valor, min)
  return Math.min(Math.max(numero, min), max)
}
