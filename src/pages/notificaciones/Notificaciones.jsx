import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import useNotificacionesStore from '../../stores/notificacionesStore'
import useAuthStore from '../../stores/authStore'
import notificationService from '../../services/notificationService'
import { getCurrentDate } from '../../utils/dateUtils'

const Notificaciones = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { 
    obtenerNotificacionesPorUsuario, 
    marcarComoLeida,
    marcarTodasComoLeidas,
    eliminarNotificacion,
    limpiarAntiguas 
  } = useNotificacionesStore()
  
  const [notificaciones, setNotificaciones] = useState([])
  const [filtro, setFiltro] = useState('todas')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      const userId = user.role === 'admin' ? 'admin' : user.id
      const userNotifications = obtenerNotificacionesPorUsuario(userId)
      
      // Aplicar filtros
      const filtered = filtro === 'no_leidas' 
        ? userNotifications.filter(n => !n.leida)
        : userNotifications
      
      setNotificaciones(filtered)
      setLoading(false)
      
      // Limpiar notificaciones antiguas al cargar
      limpiarAntiguas()
    }
  }, [user, obtenerNotificacionesPorUsuario, filtro, limpiarAntiguas])

  const handleNotificationClick = (notificacion) => {
    if (!notificacion.leida) {
      marcarComoLeida(notificacion.id)
    }
    
    // Navegar según el tipo de notificación
    if (notificacion.datos?.ordenId) {
      navigate(`/ordenes/${notificacion.datos.ordenId}`)
    }
  }

  const handleDeleteNotification = async (e, id) => {
    e.stopPropagation()
    const result = await notificationService.confirm(
      '¿Eliminar notificación?',
      '¿Estás seguro de eliminar esta notificación?',
      'Eliminar',
      'Cancelar'
    )
    
    if (result.isConfirmed) {
      eliminarNotificacion(id)
      await notificationService.success('Notificación eliminada', '', 1000)
    }
  }

  const handleMarkAllAsRead = async () => {
    const userId = user.role === 'admin' ? 'admin' : user.id
    const userNotifications = obtenerNotificacionesPorUsuario(userId)
    userNotifications.forEach(notif => marcarComoLeida(notif.id))
    await notificationService.success('Todas las notificaciones marcadas como leídas', '', 1000)
  }

  const getNotificationIcon = (tipo) => {
    switch(tipo) {
      case 'asignacion_tecnico':
        return { icon: '👷', color: 'bg-blue-100 text-blue-600' }
      case 'pendiente_aprobacion':
        return { icon: '⏳', color: 'bg-yellow-100 text-yellow-600' }
      case 'orden_aprobada':
        return { icon: '✅', color: 'bg-green-100 text-green-600' }
      case 'orden_rechazada':
        return { icon: '❌', color: 'bg-red-100 text-red-600' }
      default:
        return { icon: '📬', color: 'bg-gray-100 text-gray-600' }
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
    if (minutes < 60) return `Hace ${minutes} minutos`
    if (hours < 24) return `Hace ${hours} horas`
    if (days < 7) return `Hace ${days} días`
    
    return date.toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'short', 
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
    })
  }

  const unreadCount = notificaciones.filter(n => !n.leida).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Cargando notificaciones...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Notificaciones</h1>
          <p className="text-sm text-gray-600">Gestiona todas tus notificaciones en un solo lugar</p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="btn-secondary self-start sm:self-auto"
          >
            Marcar todas como leídas
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="card">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFiltro('todas')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-medium transition-colors ${
              filtro === 'todas'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Todas ({notificaciones.length})
          </button>
          <button
            onClick={() => setFiltro('no_leidas')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-medium transition-colors ${
              filtro === 'no_leidas'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            No leídas ({unreadCount})
          </button>
        </div>
      </div>

      {/* Lista de notificaciones */}
      <div className="space-y-4">
        {notificaciones.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-500">
              {filtro === 'no_leidas' 
                ? 'No tienes notificaciones sin leer' 
                : 'No tienes notificaciones'}
            </p>
          </div>
        ) : (
          notificaciones.map((notificacion, index) => {
            const { icon, color } = getNotificationIcon(notificacion.tipo)
            
            return (
              <motion.div
                key={notificacion.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleNotificationClick(notificacion)}
                className={`card hover:shadow-md transition-all cursor-pointer ${
                  !notificacion.leida ? 'border-l-4 border-l-blue-500 bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start space-x-3 sm:space-x-4">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center ${color} flex-shrink-0`}>
                    <span className="text-xl sm:text-2xl">{icon}</span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-base font-medium text-gray-900">
                          {notificacion.titulo}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {notificacion.mensaje}
                        </p>
                        
                        {notificacion.datos?.accionRequerida && (
                          <div className="mt-3 space-y-1">
                            <p className="text-xs font-medium text-amber-800 uppercase">
                              Acciones requeridas:
                            </p>
                            {notificacion.datos.acciones?.map((accion, idx) => (
                              <p key={idx} className="text-sm text-amber-700 flex items-start">
                                <span className="mr-2">•</span>
                                {accion}
                              </p>
                            ))}
                          </div>
                        )}
                        
                        {notificacion.datos?.motivo && (
                          <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
                            <p className="text-sm text-red-800">
                              <strong>Motivo:</strong> {notificacion.datos.motivo}
                            </p>
                          </div>
                        )}
                        
                        <p className="text-xs text-gray-400 mt-3">
                          {formatTime(notificacion.timestamp)}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        {!notificacion.leida && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full" />
                        )}
                        <button
                          onClick={(e) => handleDeleteNotification(e, notificacion.id)}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default Notificaciones