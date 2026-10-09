import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'
import { describirError } from '../utils/errorUtils'

const MySwal = withReactContent(Swal)

// Los mensajes del servidor pueden incluir datos ingresados por usuarios: escapar siempre
const escaparHtml = (texto) => String(texto ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

const COLORS = {
  primary: '#1e40af',
  success: '#059669',
  error: '#dc2626',
  warning: '#f59e0b',
  info: '#3b82f6',
  secondary: '#6b7280'
}

class NotificationService {
  // Notificación básica de éxito
  success(title, text, timer = null) {
    return MySwal.fire({
      title,
      text,
      icon: 'success',
      confirmButtonColor: COLORS.primary,
      ...(timer && { timer, showConfirmButton: false })
    })
  }

  // Notificación de error
  error(title, text) {
    return MySwal.fire({
      title,
      text,
      icon: 'error',
      confirmButtonColor: COLORS.primary
    })
  }

  /**
   * Muestra un error explicando qué falló, por qué y qué puede hacer el usuario.
   * Úsalo en TODOS los catch que informan un error al usuario.
   *
   * - Errores 4xx: título = lo que se intentaba hacer; cuerpo = motivo del servidor.
   * - Errores 5xx: título "Error interno del servidor" + código de referencia.
   * - Sin conexión, sesión expirada y fallos de la propia aplicación tienen su propio título.
   *
   * @param {unknown} error    Error capturado
   * @param {string}  contexto Qué se intentaba hacer, ej: 'No se pudo actualizar la orden'
   */
  mostrarError(error, contexto) {
    const d = describirError(error, contexto)

    const partes = []
    if (d.contexto) {
      partes.push(`<p style="font-weight:600;color:#1f2937;margin:0 0 8px">${escaparHtml(d.contexto)}</p>`)
    }
    partes.push(`<p style="color:#374151;margin:0">${escaparHtml(d.mensaje)}</p>`)
    if (d.sugerencia) {
      partes.push(
        `<div style="margin-top:12px;padding:10px 12px;border-radius:8px;background:#eff6ff;border:1px solid #bfdbfe;color:#1e3a8a;font-size:14px">` +
        `<strong>¿Qué puedes hacer?</strong> ${escaparHtml(d.sugerencia)}</div>`
      )
    }
    const pie = []
    if (d.referencia) pie.push(`Código de referencia: <strong>${escaparHtml(d.referencia)}</strong>`)
    if (d.esInterno && d.status) pie.push(`Código HTTP ${escaparHtml(d.status)}`)
    if (d.detalleTecnico) pie.push(`Detalle técnico: ${escaparHtml(d.detalleTecnico)}`)
    if (pie.length) {
      partes.push(`<p style="margin:12px 0 0;font-size:12px;color:#6b7280">${pie.join(' · ')}</p>`)
    }

    return MySwal.fire({
      title: d.titulo,
      html: `<div style="text-align:left">${partes.join('')}</div>`,
      icon: d.esInterno ? 'error' : 'warning',
      confirmButtonColor: COLORS.primary,
      confirmButtonText: 'Entendido'
    })
  }

  // Notificación de advertencia
  warning(title, text) {
    return MySwal.fire({
      title,
      text,
      icon: 'warning',
      confirmButtonColor: COLORS.primary
    })
  }

  // Notificación de información
  info(title, text) {
    return MySwal.fire({
      title,
      text,
      icon: 'info',
      confirmButtonColor: COLORS.primary
    })
  }

  // Notificación de confirmación
  confirm(title, text, confirmText = 'Confirmar', cancelText = 'Cancelar') {
    return MySwal.fire({
      title,
      text,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: COLORS.success,
      cancelButtonColor: COLORS.secondary,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText
    })
  }

  // Notificación con HTML personalizado
  html(title, htmlContent, icon = 'info') {
    return MySwal.fire({
      title,
      html: htmlContent,
      icon,
      confirmButtonColor: COLORS.primary
    })
  }

  // Notificación de asignación de técnico
  tecnicoAsignado(nombreTecnico, ordenId, tipoServicio) {
    return MySwal.fire({
      title: '¡Nueva Orden Asignada!',
      html: `
        <div class="text-left space-y-3">
          <p class="text-lg font-medium text-gray-800">
            Hola <span class="text-blue-600">${nombreTecnico}</span>,
          </p>
          <p class="text-gray-600">
            Se te ha asignado la orden <span class="font-mono bg-gray-100 px-2 py-1 rounded">#${ordenId}</span>
          </p>
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <h4 class="font-semibold text-blue-800 mb-2">Tipo de Servicio:</h4>
            <p class="text-blue-700">${tipoServicio}</p>
          </div>
          <div class="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 class="font-semibold text-amber-800 mb-2">⚠️ Acción Requerida:</h4>
            <ul class="text-sm text-amber-700 list-disc list-inside space-y-1">
              <li>Revisar los detalles de la orden</li>
              <li>Crear lista de materiales estimada</li>
              <li>Establecer tiempo estimado de ejecución</li>
            </ul>
          </div>
        </div>
      `,
      icon: 'info',
      confirmButtonColor: COLORS.primary,
      confirmButtonText: 'Entendido',
      width: '500px'
    })
  }

  // Notificación de orden pendiente de aprobación
  ordenPendienteAprobacion(ordenId, supervisor = false) {
    const role = supervisor ? 'Supervisor' : 'Administrador'
    return MySwal.fire({
      title: 'Nueva Orden Pendiente de Aprobación',
      html: `
        <div class="text-left space-y-3">
          <p class="text-gray-600">
            La orden <span class="font-mono bg-gray-100 px-2 py-1 rounded">#${ordenId}</span> 
            requiere aprobación del ${role}.
          </p>
          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p class="text-sm text-yellow-800">
              El técnico ha completado la estimación de materiales y tiempo.
            </p>
          </div>
        </div>
      `,
      icon: 'warning',
      confirmButtonColor: COLORS.primary,
      confirmButtonText: 'Ver Detalles'
    })
  }

  // Notificación de orden aprobada
  ordenAprobada(ordenId) {
    return MySwal.fire({
      title: '¡Orden Aprobada!',
      html: `
        <div class="text-left space-y-3">
          <p class="text-gray-600">
            La orden <span class="font-mono bg-gray-100 px-2 py-1 rounded">#${ordenId}</span> 
            ha sido aprobada exitosamente.
          </p>
          <div class="bg-green-50 border border-green-200 rounded-lg p-3">
            <p class="text-sm text-green-800">
              ✓ Se ha generado la orden de trabajo<br>
              ✓ El técnico ha sido notificado<br>
              ✓ Los materiales han sido reservados
            </p>
          </div>
        </div>
      `,
      icon: 'success',
      confirmButtonColor: COLORS.primary,
      timer: 3000
    })
  }

  // Notificación de orden rechazada
  ordenRechazada(ordenId, motivo) {
    return MySwal.fire({
      title: 'Orden Rechazada',
      html: `
        <div class="text-left space-y-3">
          <p class="text-gray-600">
            La orden <span class="font-mono bg-gray-100 px-2 py-1 rounded">#${ordenId}</span> 
            ha sido rechazada.
          </p>
          <div class="bg-red-50 border border-red-200 rounded-lg p-3">
            <h4 class="font-semibold text-red-800 mb-1">Motivo:</h4>
            <p class="text-sm text-red-700">${motivo}</p>
          </div>
        </div>
      `,
      icon: 'error',
      confirmButtonColor: COLORS.primary
    })
  }
}

export const notificationService = new NotificationService()
export default notificationService