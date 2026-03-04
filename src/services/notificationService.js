import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'

const MySwal = withReactContent(Swal)

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