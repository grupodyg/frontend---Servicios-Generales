/**
 * Accesos rápidos de inicio de sesión SOLO para desarrollo local.
 *
 * - Por defecto se muestran las cuentas locales de abajo (una por rol).
 * - VITE_DEV_QUICK_PASSWORD (en el .env local) es la contraseña que el botón escribe y envía.
 *   Si no está definida, el botón solo rellena el correo y deja el cursor en la contraseña.
 * - Opcionalmente, VITE_DEV_QUICK_ACCESS sobreescribe la lista (JSON con label, email y password
 *   por cuenta). Las contraseñas nunca van en el código fuente.
 * - Nunca llegan a producción: Vite sustituye `import.meta.env.DEV` por `false` en `vite build`
 *   y elimina como código muerto todo lo que queda detrás de esa comprobación, aunque las
 *   variables existan en el entorno de despliegue.
 *
 * Ejemplo para el .env local:
 *   VITE_DEV_QUICK_PASSWORD=la-clave-local
 *   VITE_DEV_QUICK_ACCESS='[{"label":"Administrador","email":"admin@ejemplo.com","password":""}]'
 */

const DEFAULT_DEV_QUICK_ACCESS = [
  { label: 'Administrador', email: 'admin@diggroup.com' },
  { label: 'Supervisor', email: 'supervisor@diggroup.com' },
  { label: 'Técnico', email: 'pedro.ramirez@diggroup.com' }
]

const esAccesoValido = (u) => u && typeof u.email === 'string' && u.email.trim() !== ''

// Cada cuenta usa su propia password si la tiene; si no, la común de VITE_DEV_QUICK_PASSWORD
const conPasswordComun = (lista, passwordComun) =>
  lista.map(u => ({ ...u, password: u.password || passwordComun || '' }))

export const getDevQuickAccessUsers = () => {
  // Comprobación inline a propósito: así el minificador puede descartar el resto de la función
  if (!import.meta.env.DEV) return []

  const passwordComun = import.meta.env.VITE_DEV_QUICK_PASSWORD || ''
  const raw = import.meta.env.VITE_DEV_QUICK_ACCESS
  if (!raw) return conPasswordComun(DEFAULT_DEV_QUICK_ACCESS, passwordComun)

  try {
    const parsed = JSON.parse(raw)
    const lista = Array.isArray(parsed) ? parsed.filter(esAccesoValido) : []
    return conPasswordComun(lista.length > 0 ? lista : DEFAULT_DEV_QUICK_ACCESS, passwordComun)
  } catch (error) {
    console.warn('VITE_DEV_QUICK_ACCESS no es un JSON válido; se usan los accesos rápidos por defecto.', error)
    return conPasswordComun(DEFAULT_DEV_QUICK_ACCESS, passwordComun)
  }
}
