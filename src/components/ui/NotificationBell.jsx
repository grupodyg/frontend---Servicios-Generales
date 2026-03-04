import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useNotificacionesStore from '../../stores/notificacionesStore'
import useAuthStore from '../../stores/authStore'
import { getCurrentDate } from '../../utils/dateUtils'

const NotificationBell = () => {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuthStore()
  const {
    fetchNotificaciones,
    obtenerNotificacionesPorUsuario,
    contarNoLeidas,
    marcarComoLeida,
    marcarTodasComoLeidas,
    notificaciones: allNotificaciones
  } = useNotificacionesStore()

  const [showDropdown, setShowDropdown] = useState(false)
  const [notificaciones, setNotificaciones] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  // Cargar notificaciones desde API al montar
  useEffect(() => {
    // CRITICAL: Only fetch if authenticated
    if (!isAuthenticated || !user) {
      return
    }

    // Cargar notificaciones del usuario
    const userId = user.id
    fetchNotificaciones({ user_id: userId }).catch(err => console.error('Error loading notifications:', err))
  }, [user, isAuthenticated, fetchNotificaciones])

  // Actualizar lista local cuando cambian las notificaciones en el store
  useEffect(() => {
    if (user) {
      const userId = user.role === 'admin' ? 'admin' : user.id
      const userNotifications = obtenerNotificacionesPorUsuario(userId)
      setNotificaciones(userNotifications.slice(0, 5)) // Mostrar solo las 5 más recientes
      setUnreadCount(contarNoLeidas(userId))
    }
  }, [user, obtenerNotificacionesPorUsuario, contarNoLeidas, allNotificaciones])

  const handleNotificationClick = (notificacion) => {
    marcarComoLeida(notificacion.id)
    setShowDropdown(false)
    
    // Navegar según el tipo de notificación
    if (notificacion.datos?.ordenId) {
      navigate(`/ordenes/${notificacion.datos.ordenId}`)
    }
  }

  const handleMarkAllAsRead = () => {
    if (user) {
      const userId = user.role === 'admin' ? 'admin' : user.id
      const userNotifications = obtenerNotificacionesPorUsuario(userId)
      userNotifications.forEach(notif => marcarComoLeida(notif.id))
      setUnreadCount(0)
    }
  }

  const getNotificationIcon = (tipo) => {
    switch(tipo) {
      case 'asignacion_tecnico':
        return '👷'
      case 'pendiente_aprobacion':
        return '⏳'
      case 'orden_aprobada':
        return '✅'
      case 'orden_rechazada':
        return '❌'
      default:
        return '📬'
    }
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    const now = getCurrentDate()
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Justo ahora'
    if (minutes < 60) return `Hace ${minutes} min`
    if (hours < 24) return `Hace ${hours}h`
    if (days < 7) return `Hace ${days}d`
    return date.toLocaleDateString()
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" 
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Notificaciones</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Marcar todas como leídas
                  </button>
                )}
              </div>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {notificaciones.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p>No tienes notificaciones</p>
                </div>
              ) : (
                notificaciones.map((notificacion) => (
                  <div
                    key={notificacion.id}
                    onClick={() => handleNotificationClick(notificacion)}
                    className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                      !notificacion.leida ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <span className="text-2xl">
                        {getNotificationIcon(notificacion.tipo)}
                      </span>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900">
                          {notificacion.titulo}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {notificacion.mensaje}
                        </p>
                        {notificacion.datos?.accionRequerida && (
                          <div className="mt-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                              Acción requerida
                            </span>
                          </div>
                        )}
                        <p className="text-xs text-gray-400 mt-2">
                          {formatTime(notificacion.timestamp)}
                        </p>
                      </div>
                      {!notificacion.leida && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {notificaciones.length > 0 && (
              <div className="p-3 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowDropdown(false)
                    navigate('/notificaciones')
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium w-full text-center"
                >
                  Ver todas las notificaciones
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default NotificationBell