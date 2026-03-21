import { useEffect, useRef } from 'react'
import useNotificacionesStore from '../stores/notificacionesStore'
import useAuthStore from '../stores/authStore'

const useRealtimeNotifications = (intervalo = 30000) => {
  const { user } = useAuthStore()
  const { fetchNotificaciones, getNotificacionesNoLeidas } = useNotificacionesStore()
  const intervalRef = useRef(null)

  useEffect(() => {
    if (!user) return

    // Cargar notificaciones iniciales
    const loadNotifications = async () => {
      try {
        await fetchNotificaciones({ user_id: user.id })
      } catch (error) {
        console.error('Error loading notifications:', error)
      }
    }

    loadNotifications()

    // Polling solo para actualizar el badge de la campana (sin popups)
    intervalRef.current = setInterval(() => {
      fetchNotificaciones({ user_id: user.id }).catch(() => {})
    }, intervalo)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, intervalo])

  return {
    notificacionesNoLeidas: user ? getNotificacionesNoLeidas().length : 0
  }
}

export default useRealtimeNotifications
