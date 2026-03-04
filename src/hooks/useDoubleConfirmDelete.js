import { useState } from 'react'
import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'

const MySwal = withReactContent(Swal)

/**
 * Hook personalizado para manejar eliminaciones con doble confirmación
 * @returns {Object} - { handleDelete: Function, isDeleting: boolean }
 */
const useDoubleConfirmDelete = () => {
  const [isDeleting, setIsDeleting] = useState(false)

  /**
   * Maneja el proceso de eliminación con doble confirmación
   * @param {Object} params - Parámetros de la eliminación
   * @param {string} params.entityName - Nombre de la entidad (ej: "orden de trabajo")
   * @param {string} params.entityId - ID de la entidad
   * @param {Object} params.entityData - Datos adicionales de la entidad a mostrar
   * @param {Function} params.checkCanDeleteFn - Función para verificar dependencias
   * @param {Function} params.deleteFn - Función para realizar la eliminación
   * @param {Function} params.onSuccess - Callback ejecutado después de eliminar exitosamente
   */
  const handleDelete = async ({
    entityName,
    entityId,
    entityData = {},
    checkCanDeleteFn,
    deleteFn,
    onSuccess
  }) => {
    try {
      // PASO 1: Primera confirmación
      const firstConfirm = await MySwal.fire({
        title: `¿Eliminar ${entityName}?`,
        html: `
          <div class="text-left">
            <p class="text-gray-700 mb-3">Está a punto de eliminar la siguiente ${entityName}:</p>
            <div class="bg-gray-50 rounded-lg p-4 mb-3">
              ${Object.entries(entityData).map(([key, value]) => `
                <div class="mb-2">
                  <span class="font-semibold text-gray-700">${key}:</span>
                  <span class="text-gray-600 ml-2">${value}</span>
                </div>
              `).join('')}
            </div>
            <p class="text-red-600 font-medium">⚠️ Esta acción cambiará el estado a "cancelado"</p>
          </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Sí, continuar',
        cancelButtonText: 'Cancelar'
      })

      if (!firstConfirm.isConfirmed) {
        return
      }

      // PASO 2: Verificar dependencias
      setIsDeleting(true)
      let dependencyCheck

      try {
        dependencyCheck = await checkCanDeleteFn(entityId)
      } catch (error) {
        console.error('Error al verificar dependencias:', error)
        setIsDeleting(false)

        MySwal.fire({
          title: 'Error',
          text: 'No se pudo verificar las dependencias. Por favor, intente nuevamente.',
          icon: 'error',
          confirmButtonColor: '#dc2626'
        })
        return
      }

      // Mostrar información de dependencias si existen
      if (dependencyCheck?.hasDependencies) {
        await MySwal.fire({
          title: 'Registros Relacionados',
          html: `
            <div class="text-left">
              <p class="text-gray-700 mb-3">${dependencyCheck.message}</p>
              <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p class="text-sm text-yellow-800">
                  <strong>Nota:</strong> La eliminación es lógica. Los registros relacionados
                  se mantendrán pero la ${entityName} quedará marcada como cancelada.
                </p>
              </div>
            </div>
          `,
          icon: 'info',
          confirmButtonColor: '#1e40af',
          confirmButtonText: 'Entendido'
        })
      }

      // PASO 3: Segunda confirmación con motivo obligatorio
      const secondConfirm = await MySwal.fire({
        title: '¿Está completamente seguro?',
        html: `
          <div class="text-left">
            <p class="text-gray-700 mb-3">Esta es la última confirmación antes de eliminar.</p>
            <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p class="text-sm text-red-800 font-medium">
                ⚠️ IMPORTANTE: Esta acción no se puede deshacer fácilmente.
              </p>
            </div>
            <label class="block text-left mb-2 font-medium text-gray-700">
              Motivo de la eliminación: *
            </label>
            <textarea
              id="deletion-reason"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              rows="3"
              placeholder="Explique por qué está eliminando esta ${entityName}..."
              required
            ></textarea>
            <p class="text-xs text-gray-500 mt-2">* Campo obligatorio para continuar</p>
          </div>
        `,
        icon: 'error',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Eliminar definitivamente',
        cancelButtonText: 'Cancelar',
        preConfirm: () => {
          const reason = document.getElementById('deletion-reason').value.trim()
          if (!reason) {
            Swal.showValidationMessage('Debe especificar un motivo para la eliminación')
            return false
          }
          if (reason.length < 10) {
            Swal.showValidationMessage('El motivo debe tener al menos 10 caracteres')
            return false
          }
          return { reason }
        }
      })

      if (!secondConfirm.isConfirmed) {
        setIsDeleting(false)
        return
      }

      // PASO 4: Ejecutar eliminación
      const reason = secondConfirm.value.reason
      await deleteFn(entityId, reason)

      // PASO 5: Mostrar éxito
      await MySwal.fire({
        title: '¡Eliminado!',
        text: `La ${entityName} ha sido eliminada exitosamente`,
        icon: 'success',
        confirmButtonColor: '#16a34a'
      })

      // Ejecutar callback de éxito
      if (onSuccess) {
        await onSuccess()
      }
    } catch (error) {
      console.error('Error en el proceso de eliminación:', error)

      let errorMessage = 'Ocurrió un error al intentar eliminar'

      if (error.response?.status === 403) {
        errorMessage = 'No tiene permisos para realizar esta acción. Solo administradores pueden eliminar.'
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      }

      MySwal.fire({
        title: 'Error',
        text: errorMessage,
        icon: 'error',
        confirmButtonColor: '#dc2626'
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return {
    handleDelete,
    isDeleting
  }
}

export default useDoubleConfirmDelete
