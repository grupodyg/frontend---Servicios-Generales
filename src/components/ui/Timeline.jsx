import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const Timeline = ({ events = [], className = "" }) => {
  const getEventIcon = (type) => {
    const icons = {
      created: '📝',
      assigned: '👤',
      started: '▶️',
      progress: '⚙️',
      paused: '⏸️',
      completed: '✅',
      cancelled: '❌',
      emergency: '🚨',
      report: '📊',
      material: '📦',
      photo: '📷',
      note: '📋'
    }
    return icons[type] || '📌'
  }

  const getEventColor = (type) => {
    const colors = {
      created: 'bg-blue-100 text-blue-800 border-blue-200',
      assigned: 'bg-purple-100 text-purple-800 border-purple-200',
      started: 'bg-green-100 text-green-800 border-green-200',
      progress: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      paused: 'bg-gray-100 text-gray-800 border-gray-200',
      completed: 'bg-green-100 text-green-800 border-green-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
      emergency: 'bg-red-100 text-red-800 border-red-200',
      report: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      material: 'bg-orange-100 text-orange-800 border-orange-200',
      photo: 'bg-pink-100 text-pink-800 border-pink-200',
      note: 'bg-gray-100 text-gray-800 border-gray-200'
    }
    return colors[type] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const formatEventDate = (dateString) => {
    try {
      return format(new Date(dateString), "d 'de' MMMM, HH:mm", { locale: es })
    } catch {
      return dateString
    }
  }

  if (!events || events.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="text-gray-400 text-4xl mb-2">⏰</div>
        <p className="text-gray-500">No hay eventos en el historial</p>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {events.map((event, index) => (
        <motion.div
          key={event.id || index}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="relative flex items-start space-x-4"
        >
          {/* Timeline Line */}
          {index < events.length - 1 && (
            <div className="absolute left-6 top-12 w-0.5 h-full bg-gray-200" />
          )}

          {/* Event Icon */}
          <div className={`
            flex-shrink-0 w-12 h-12 rounded-full border-2 flex items-center justify-center text-lg z-10
            ${getEventColor(event.type)}
          `}>
            {getEventIcon(event.type)}
          </div>

          {/* Event Content */}
          <div className="flex-1 min-w-0">
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              {/* Event Header */}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">
                    {event.title}
                  </h4>
                  <p className="text-xs text-gray-500">
                    {formatEventDate(event.timestamp)}
                  </p>
                </div>
                
                {event.priority && (
                  <span className={`
                    px-2 py-1 text-xs font-medium rounded-full
                    ${event.priority === 'alta' ? 'bg-red-100 text-red-800' :
                      event.priority === 'media' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'}
                  `}>
                    {event.priority}
                  </span>
                )}
              </div>

              {/* Event Description */}
              {event.description && (
                <p className="text-sm text-gray-700 mb-3">
                  {event.description}
                </p>
              )}

              {/* Event User */}
              {event.user && (
                <div className="flex items-center space-x-2 mb-3">
                  <div className="w-6 h-6 bg-corporate-blue rounded-full flex items-center justify-center text-white text-xs">
                    {event.user.charAt(0)}
                  </div>
                  <span className="text-xs text-gray-600">{event.user}</span>
                  {event.role && (
                    <span className="text-xs text-gray-500">({event.role})</span>
                  )}
                </div>
              )}

              {/* Event Metadata */}
              {(event.progress !== undefined || event.duration || event.location) && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 pt-3 border-t border-gray-100">
                  {event.progress !== undefined && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Progreso</p>
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-corporate-blue h-2 rounded-full transition-all duration-300"
                            style={{ width: `${event.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600">{event.progress}%</span>
                      </div>
                    </div>
                  )}

                  {event.duration && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Duración</p>
                      <p className="text-xs text-gray-900">{event.duration}</p>
                    </div>
                  )}

                  {event.location && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Ubicación</p>
                      <p className="text-xs text-gray-900">{event.location}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Event Attachments */}
              {event.attachments && event.attachments.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-2">Adjuntos</p>
                  <div className="flex flex-wrap gap-2">
                    {event.attachments.map((attachment, idx) => (
                      <div
                        key={idx}
                        className="flex items-center space-x-1 bg-gray-50 rounded px-2 py-1"
                      >
                        <span className="text-xs">
                          {attachment.type === 'photo' ? '📷' :
                           attachment.type === 'document' ? '📄' : '📎'}
                        </span>
                        <span className="text-xs text-gray-600 truncate max-w-20">
                          {attachment.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Event Notes */}
              {event.notes && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">Notas</p>
                  <p className="text-xs text-gray-700 bg-gray-50 rounded p-2">
                    {event.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      ))}

      {/* Timeline End Marker */}
      <div className="flex items-center space-x-4 opacity-50">
        <div className="w-12 h-12 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center">
          <span className="text-gray-400">🏁</span>
        </div>
        <div className="text-sm text-gray-400">
          Inicio del historial
        </div>
      </div>
    </div>
  )
}

export default Timeline