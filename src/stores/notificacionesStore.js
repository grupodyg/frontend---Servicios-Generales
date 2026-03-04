import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api, API_ENDPOINTS } from '../config/api'
import { parseISODate } from '../utils/dateUtils'

const transformBackendToFrontend = (backendNotification) => {
  if (!backendNotification) return null
  return {
    id: backendNotification.id,
    usuarioId: backendNotification.user_id,
    tipo: backendNotification.notification_type,
    titulo: backendNotification.title,
    mensaje: backendNotification.message,
    data: backendNotification.data || {},
    leida: backendNotification.read || false,
    fechaCreacion: backendNotification.date_time_registration
  }
}

const transformFrontendToBackend = (frontendNotification) => {
  if (!frontendNotification) return null
  return {
    user_id: frontendNotification.usuarioId,
    notification_type: frontendNotification.tipo || null,
    title: frontendNotification.titulo,
    message: frontendNotification.mensaje,
    data: frontendNotification.data || null,
    read: frontendNotification.leida || false
  }
}

const useNotificacionesStore = create(
  persist(
    (set, get) => ({
      notificaciones: [],
      isLoading: false,

      fetchNotificaciones: async (filters = {}) => {
        set({ isLoading: true })
        try {
          const params = new URLSearchParams()
          if (filters.user_id) params.append('user_id', filters.user_id)
          if (filters.read !== undefined) params.append('read', filters.read)
          if (filters.notification_type) params.append('notification_type', filters.notification_type)

          const url = `${API_ENDPOINTS.NOTIFICATIONS}${params.toString() ? '?' + params.toString() : ''}`
          const backendNotificaciones = await api.get(url)
          const notificaciones = backendNotificaciones.map(transformBackendToFrontend)

          set({ notificaciones, isLoading: false })
          return notificaciones
        } catch (error) {
          set({ isLoading: false })
          console.error('Error fetching notificaciones:', error)
          throw error
        }
      },

      createNotificacion: async (notificacionData) => {
        set({ isLoading: true })
        try {
          const backendData = transformFrontendToBackend(notificacionData)
          const response = await api.post(API_ENDPOINTS.NOTIFICATIONS, backendData)
          // El backend devuelve { mensaje, data }, extraemos el data
          const createdNotificacion = transformBackendToFrontend(response.data || response)

          await get().fetchNotificaciones()

          set({ isLoading: false })
          return createdNotificacion
        } catch (error) {
          set({ isLoading: false })
          console.error('Error creating notificacion:', error)
          throw error
        }
      },

      marcarComoLeida: async (id) => {
        set({ isLoading: true })
        try {
          await api.put(`${API_ENDPOINTS.NOTIFICATION_BY_ID(id)}/read`)
          await get().fetchNotificaciones()
          set({ isLoading: false })
        } catch (error) {
          set({ isLoading: false })
          console.error('Error marking notificacion as read:', error)
          throw error
        }
      },

      marcarTodasComoLeidas: async (userId) => {
        set({ isLoading: true })
        try {
          await api.put(`${API_ENDPOINTS.NOTIFICATIONS}/user/${userId}/read-all`)
          await get().fetchNotificaciones()
          set({ isLoading: false })
        } catch (error) {
          set({ isLoading: false })
          console.error('Error marking all notificaciones as read:', error)
          throw error
        }
      },

      deleteNotificacion: async (id) => {
        set({ isLoading: true })
        try {
          await api.delete(API_ENDPOINTS.NOTIFICATION_BY_ID(id))
          await get().fetchNotificaciones()
          set({ isLoading: false })
        } catch (error) {
          set({ isLoading: false })
          console.error('Error deleting notificacion:', error)
          throw error
        }
      },

      getNotificacionesNoLeidas: () => {
        return get().notificaciones.filter(n => !n.leida)
      },

      obtenerNotificacionesPorUsuario: (userId) => {
        // Filtrar notificaciones del usuario específico
        return get().notificaciones.filter(n => {
          // Si userId es 'admin', mostrar todas las notificaciones de admin
          if (userId === 'admin') {
            return n.usuarioId === 'admin' || n.usuarioId === 1
          }
          // Si no, filtrar por el ID específico del usuario
          return n.usuarioId === userId
        }).sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion))
      },

      contarNoLeidas: (userId = null) => {
        if (userId) {
          // Contar solo las no leídas del usuario específico
          return get().notificaciones.filter(n => {
            const esDelUsuario = userId === 'admin'
              ? (n.usuarioId === 'admin' || n.usuarioId === 1)
              : n.usuarioId === userId
            return !n.leida && esDelUsuario
          }).length
        }
        // Si no se especifica userId, contar todas las no leídas
        return get().notificaciones.filter(n => !n.leida).length
      },

      // Alias para compatibilidad
      eliminarNotificacion: async (id) => {
        return get().deleteNotificacion(id)
      },

      // Limpiar notificaciones antiguas (más de 30 días)
      limpiarAntiguas: async () => {
        const notificaciones = get().notificaciones
        const ahora = new Date()
        const treintaDias = 30 * 24 * 60 * 60 * 1000

        const antiguas = notificaciones.filter(n => {
          const fechaCreacion = new Date(n.fechaCreacion)
          return (ahora - fechaCreacion) > treintaDias
        })

        // Eliminar las notificaciones antiguas
        for (const notif of antiguas) {
          try {
            await get().deleteNotificacion(notif.id)
          } catch (error) {
            console.warn('Error eliminando notificación antigua:', notif.id)
          }
        }
      },

      // Notificar asignación de técnico a una orden de trabajo
      notificarAsignacionTecnico: async (tecnicoId, ordenId, detalles = {}) => {
        try {
          const notificacionData = {
            usuarioId: tecnicoId,
            tipo: 'asignacion_orden',
            titulo: `Nueva orden asignada: ${ordenId}`,
            mensaje: `Se te ha asignado la orden de trabajo ${ordenId}. ${detalles.cliente ? `Cliente: ${detalles.cliente}.` : ''} ${detalles.tipoServicio ? `Servicio: ${detalles.tipoServicio}.` : ''}`,
            data: {
              ordenId,
              ...detalles
            }
          }
          return await get().createNotificacion(notificacionData)
        } catch (error) {
          // No bloquear el flujo si falla la notificación
          console.warn('⚠️ No se pudo enviar notificación al técnico:', error.message)
          return null
        }
      }
    }),
    {
      name: 'notificaciones-storage',
      partialize: (state) => ({ notificaciones: state.notificaciones })
    }
  )
)

export default useNotificacionesStore
