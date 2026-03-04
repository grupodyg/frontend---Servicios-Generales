/**
 * Utilidades centralizadas para manejo de fechas en el Frontend
 * Timezone: America/Lima (UTC-5)
 *
 * IMPORTANTE: Este archivo centraliza todo el manejo de fechas para garantizar
 * consistencia entre desarrollo local y produccion (Railway)
 *
 * REGLA DE ORO: Siempre usar estas funciones para fechas, NUNCA usar new Date() directamente
 * para obtener fechas formateadas.
 *
 * Usa date-fns para formateo avanzado + Intl API nativa para zona horaria
 */

import { format, parseISO, differenceInDays, addDays as addDaysFns, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

// Configuracion global - ZONA HORARIA DE PERU
export const TIMEZONE = 'America/Lima';
export const TIMEZONE_OFFSET = '-05:00';
export const LOCALE = 'es-PE';
export const DATE_FNS_LOCALE = es;

/**
 * Obtiene la fecha/hora actual en zona horaria de Lima
 * Usa Intl API nativa del navegador para conversion de zona horaria
 * @returns {Date} Fecha actual en America/Lima
 */
export const getCurrentDate = () => {
  // Usar Intl API nativa para obtener fecha en zona horaria de Lima
  const now = new Date();
  return new Date(now.toLocaleString('en-US', { timeZone: TIMEZONE }));
};

/**
 * Obtiene el timestamp actual en formato ISO con zona horaria de Lima
 * Para guardar en base de datos, usar este formato
 * @returns {string} Timestamp ISO con offset (ej: "2025-01-17T14:30:00.000-05:00")
 */
export const getCurrentTimestamp = () => {
  const now = new Date();

  // Obtener componentes de fecha/hora en timezone de Lima
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(now);

  // Construir ISO string con offset de Lima
  const get = (type) => parts.find(p => p.type === type)?.value || '00';
  const year = get('year');
  const month = get('month');
  const day = get('day');
  const hour = get('hour');
  const minute = get('minute');
  const second = get('second');

  // Obtener milisegundos
  const ms = now.getMilliseconds().toString().padStart(3, '0');

  return `${year}-${month}-${day}T${hour}:${minute}:${second}.${ms}${TIMEZONE_OFFSET}`;
};

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD (para inputs type="date")
 * USA LA FECHA LOCAL DE LIMA, NO UTC
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
export const getToday = () => {
  const now = new Date();
  // Usar Intl para formatear en zona horaria de Lima (en-CA da formato YYYY-MM-DD)
  return now.toLocaleDateString('en-CA', { timeZone: TIMEZONE });
};

/**
 * Obtiene la hora actual en formato HH:mm (en zona horaria de Lima)
 * @returns {string} Hora en formato HH:mm
 */
export const getCurrentTime = () => {
  const now = new Date();
  return now.toLocaleTimeString('en-GB', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

/**
 * Obtiene el ano actual
 * @returns {number} Ano actual
 */
export const getCurrentYear = () => {
  return new Date().getFullYear();
};

/**
 * Obtiene el mes actual (1-12)
 * @returns {number} Mes actual
 */
export const getCurrentMonth = () => {
  return new Date().getMonth() + 1;
};

/**
 * Formatea una fecha en formato dd/MM/yyyy
 * @param {Date|string} date - Fecha a formatear
 * @param {string} formatStr - Formato opcional (default: 'dd/MM/yyyy')
 * @returns {string} Fecha formateada o cadena vacia
 */
export const formatDate = (date, formatStr = 'dd/MM/yyyy') => {
  if (!date) return '';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(d)) return '';
    return format(d, formatStr, { locale: es });
  } catch {
    return '';
  }
};

/**
 * Formatea una fecha con hora en formato dd/MM/yyyy HH:mm
 * @param {Date|string} date - Fecha a formatear
 * @returns {string} Fecha y hora formateada
 */
export const formatDateTime = (date) => {
  return formatDate(date, 'dd/MM/yyyy HH:mm');
};

/**
 * Formatea solo la hora en formato HH:mm
 * @param {Date|string} date - Fecha/hora a formatear
 * @returns {string} Hora formateada
 */
export const formatTime = (date) => {
  return formatDate(date, 'HH:mm');
};

/**
 * Formatea una fecha para mostrar en el UI con formato largo
 * @param {Date|string} date - Fecha a formatear
 * @returns {string} Fecha formateada (ej: "17 de enero de 2025")
 */
export const formatDateLong = (date) => {
  return formatDate(date, "d 'de' MMMM 'de' yyyy");
};

/**
 * Formatea una fecha con dia de la semana
 * @param {Date|string} date - Fecha a formatear
 * @returns {string} Fecha formateada (ej: "viernes, 17 de enero")
 */
export const formatDateWithDay = (date) => {
  return formatDate(date, "EEEE, d 'de' MMMM");
};

/**
 * Formatea una fecha para mostrar solo dia y mes
 * @param {Date|string} date - Fecha a formatear
 * @returns {string} Fecha formateada (ej: "17/01")
 */
export const formatDayMonth = (date) => {
  return formatDate(date, 'dd/MM');
};

/**
 * Formatea una fecha para mostrar mes abreviado
 * @param {Date|string} date - Fecha a formatear
 * @returns {string} Fecha formateada (ej: "17 ene")
 */
export const formatDayMonthShort = (date) => {
  return formatDate(date, 'dd MMM');
};

/**
 * Parsea un string ISO a Date
 * @param {string} isoString - String ISO
 * @returns {Date|null} Objeto Date o null
 */
export const parseISODate = (isoString) => {
  if (!isoString) return null;
  try {
    const d = parseISO(isoString);
    return isValid(d) ? d : null;
  } catch {
    return null;
  }
};

/**
 * Convierte una fecha a string ISO
 * @param {Date|string} date - Fecha a convertir
 * @returns {string} String ISO
 */
export const toISOString = (date) => {
  if (!date) return '';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(d)) return '';
    return d.toISOString();
  } catch {
    return '';
  }
};

/**
 * Obtiene solo la parte de fecha de un ISO string (YYYY-MM-DD)
 * @param {Date|string} date - Fecha
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
export const toDateOnly = (date) => {
  if (!date) return '';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(d)) return '';
    return d.toISOString().split('T')[0];
  } catch {
    return '';
  }
};

/**
 * Verifica si una fecha es valida
 * @param {any} date - Valor a verificar
 * @returns {boolean} true si es fecha valida
 */
export const isValidDate = (date) => {
  if (!date) return false;
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return isValid(d);
  } catch {
    return false;
  }
};

/**
 * Calcula la diferencia en dias entre dos fechas
 * @param {Date|string} date1 - Primera fecha
 * @param {Date|string} date2 - Segunda fecha
 * @returns {number} Diferencia en dias
 */
export const diffDays = (date1, date2) => {
  try {
    const d1 = typeof date1 === 'string' ? parseISO(date1) : date1;
    const d2 = typeof date2 === 'string' ? parseISO(date2) : date2;
    return differenceInDays(d2, d1);
  } catch {
    return 0;
  }
};

/**
 * Agrega dias a una fecha
 * @param {Date|string} date - Fecha base
 * @param {number} days - Dias a agregar
 * @returns {Date} Nueva fecha
 */
export const addDays = (date, days) => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return addDaysFns(d, days);
};

/**
 * Formatea tiempo relativo (ej: "hace 2 horas", "ayer")
 * @param {Date|string} date - Fecha a comparar
 * @returns {string} Tiempo relativo
 */
export const formatRelativeTime = (date) => {
  if (!date) return '';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(d)) return '';

    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDaysNum = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'ahora';
    if (diffMins < 60) return `hace ${diffMins} min`;
    if (diffHours < 24) return `hace ${diffHours}h`;
    if (diffDaysNum === 1) return 'ayer';
    if (diffDaysNum < 7) return `hace ${diffDaysNum} dias`;

    return formatDate(d);
  } catch {
    return '';
  }
};

/**
 * Formatea fecha para mostrar en tablas (corto)
 * @param {Date|string} date - Fecha a formatear
 * @returns {string} Fecha formateada
 */
export const formatTableDate = (date) => {
  return formatDate(date, 'dd/MM/yyyy');
};

/**
 * Formatea fecha y hora para mostrar en tablas
 * @param {Date|string} date - Fecha a formatear
 * @returns {string} Fecha y hora formateada
 */
export const formatTableDateTime = (date) => {
  return formatDate(date, 'dd/MM/yyyy HH:mm');
};

/**
 * Compara si dos fechas son el mismo dia
 * @param {Date|string} date1 - Primera fecha
 * @param {Date|string} date2 - Segunda fecha
 * @returns {boolean} true si son el mismo dia
 */
export const isSameDay = (date1, date2) => {
  try {
    const d1 = typeof date1 === 'string' ? parseISO(date1) : date1;
    const d2 = typeof date2 === 'string' ? parseISO(date2) : date2;
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  } catch {
    return false;
  }
};

/**
 * Verifica si una fecha es hoy
 * @param {Date|string} date - Fecha a verificar
 * @returns {boolean} true si es hoy
 */
export const isToday = (date) => {
  return isSameDay(date, new Date());
};

/**
 * Verifica si una fecha ya paso (es anterior a hoy)
 * @param {Date|string} date - Fecha a verificar
 * @returns {boolean} true si ya paso
 */
export const isPast = (date) => {
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d < today;
  } catch {
    return false;
  }
};

/**
 * Verifica si una fecha es futura
 * @param {Date|string} date - Fecha a verificar
 * @returns {boolean} true si es futura
 */
export const isFuture = (date) => {
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return d > today;
  } catch {
    return false;
  }
};

// Objeto con todos los metodos para importar de una vez
const dateUtils = {
  TIMEZONE,
  TIMEZONE_OFFSET,
  LOCALE,
  DATE_FNS_LOCALE,
  getCurrentDate,
  getCurrentTimestamp,
  getCurrentTime,
  getToday,
  getCurrentYear,
  getCurrentMonth,
  formatDate,
  formatDateTime,
  formatTime,
  formatDateLong,
  formatDateWithDay,
  formatDayMonth,
  formatDayMonthShort,
  parseISODate,
  toISOString,
  toDateOnly,
  isValidDate,
  diffDays,
  addDays,
  formatRelativeTime,
  formatTableDate,
  formatTableDateTime,
  isSameDay,
  isToday,
  isPast,
  isFuture
};

export default dateUtils;
