import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useVisitasTecnicasStore from '../../stores/visitasTecnicasStore'
import useAuthStore from '../../stores/authStore'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { openInBestMapApp } from '../../utils/mapUtils'
import { VISITA_ESTADOS, getEstadoLabel, getEstadoColor } from '../../constants/visitasTecnicasConstants'
import { getCurrentDate } from '../../utils/dateUtils'

const MisVisitasTecnicas = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { 
    visitas, 
    fetchVisitas, 
    isLoading 
  } = useVisitasTecnicasStore()
  
  const [filtroEstado, setFiltroEstado] = useState('todos')

  useEffect(() => {
    // El backend ahora filtra automáticamente por rol
    // No necesitamos pasar role ni name como parámetros
    fetchVisitas({})
  }, [fetchVisitas])

  // Re-fetch cuando el componente gana foco (el usuario regresa a esta vista)
  useEffect(() => {
    const handleFocus = () => {
      console.log('🔄 Vista de lista enfocada, refrescando visitas...')
      fetchVisitas({})
    }

    window.addEventListener('focus', handleFocus)

    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [fetchVisitas])

  // Filtrar visitas solo por estado (el backend ya filtró por técnico)
  // Si el usuario es técnico, el backend ya envió solo sus visitas
  // Si es admin, recibe todas las visitas
  const misVisitas = visitas.filter(visita => {
    if (filtroEstado === 'todos') return true
    return visita.estado === filtroEstado
  })

  const getEstadoBadge = (estado) => {
    // Usar los valores estandarizados del sistema
    const colorClasses = getEstadoColor(estado)
    const label = getEstadoLabel(estado)

    // Iconos por estado
    const iconos = {
      [VISITA_ESTADOS.PENDING]: '🕐',
      [VISITA_ESTADOS.ASSIGNED]: '👤',
      [VISITA_ESTADOS.IN_PROGRESS]: '⚙️',
      [VISITA_ESTADOS.COMPLETED]: '✅',
      [VISITA_ESTADOS.APPROVED]: '✅',
      [VISITA_ESTADOS.REJECTED]: '❌',
      [VISITA_ESTADOS.CANCELLED]: '❌'
    }

    return {
      color: colorClasses,
      icon: iconos[estado] || '📋',
      label: label
    }
  }

  const getPrioridadVisita = (fechaVisita) => {
    const hoy = getCurrentDate()
    const fecha = new Date(fechaVisita)
    const diffDias = Math.ceil((fecha - hoy) / (1000 * 60 * 60 * 24))
    
    if (diffDias < 0) return { color: 'text-red-600', label: 'Vencida' }
    if (diffDias === 0) return { color: 'text-orange-600', label: 'Hoy' }
    if (diffDias === 1) return { color: 'text-yellow-600', label: 'Mañana' }
    return { color: 'text-gray-600', label: `En ${diffDias} días` }
  }

  const handleIniciarVisita = (visita) => {
    navigate(`/visitas-tecnicas/${visita.id}`)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis Visitas Técnicas</h1>
          <p className="text-gray-600">
            Visitas asignadas a {user?.name}
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Filtrar:</span>
            <select
              className="input-field"
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
            >
              <option value="todos">Todos los estados</option>
              <option value={VISITA_ESTADOS.PENDING}>Pendientes</option>
              <option value={VISITA_ESTADOS.IN_PROGRESS}>En Progreso</option>
              <option value={VISITA_ESTADOS.COMPLETED}>Completadas</option>
              <option value={VISITA_ESTADOS.APPROVED}>Aprobadas</option>
              <option value={VISITA_ESTADOS.REJECTED}>Rechazadas</option>
              <option value={VISITA_ESTADOS.CANCELLED}>Canceladas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 text-yellow-800">
              <span className="text-xl">🕐</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pendientes</p>
              <p className="text-2xl font-semibold text-gray-900">
                {misVisitas.filter(v => [VISITA_ESTADOS.PENDING, VISITA_ESTADOS.ASSIGNED, VISITA_ESTADOS.IN_PROGRESS].includes(v.estado)).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-800">
              <span className="text-xl">✅</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Completadas</p>
              <p className="text-2xl font-semibold text-gray-900">
                {misVisitas.filter(v => v.estado === VISITA_ESTADOS.COMPLETED).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-800">
              <span className="text-xl">📋</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total</p>
              <p className="text-2xl font-semibold text-gray-900">
                {misVisitas.length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-orange-100 text-orange-800">
              <span className="text-xl">📅</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Esta semana</p>
              <p className="text-2xl font-semibold text-gray-900">
                {misVisitas.filter(v => {
                  const fechaVisita = new Date(v.fechaVisita)
                  const hoy = getCurrentDate()
                  const finSemana = new Date(hoy)
                  finSemana.setDate(hoy.getDate() + 7)
                  return fechaVisita >= hoy && fechaVisita <= finSemana
                }).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de visitas */}
      {misVisitas.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500 mb-4">No tienes visitas técnicas asignadas</p>
        </div>
      ) : (
        <div className="space-y-4">
          {misVisitas.map((visita) => {
            const estadoBadge = getEstadoBadge(visita.estado)
            const prioridad = getPrioridadVisita(visita.fechaVisita)
            
            return (
              <div
                key={visita.id}
                className="card hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleIniciarVisita(visita)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {visita.id}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${estadoBadge.color}`}>
                        {estadoBadge.icon} {estadoBadge.label}
                      </span>
                      <span className={`text-sm font-medium ${prioridad.color}`}>
                        {prioridad.label}
                      </span>
                    </div>
                    
                    <p className="text-gray-900 font-medium mb-1">{visita.cliente}</p>
                    <p className="text-gray-600 text-sm mb-2">{visita.direccion}</p>
                    <p className="text-gray-700 text-sm mb-3">{visita.descripcionServicio}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Fecha y hora:</span>
                        <p className="font-medium">
                          {format(new Date(visita.fechaVisita), 'dd/MM/yyyy', { locale: es })} - {visita.horaVisita}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Contacto:</span>
                        <p className="font-medium">{visita.contacto}</p>
                        <p className="text-xs text-gray-500">{visita.telefono}</p>
                      </div>
                    </div>
                    
                    {visita.observaciones && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">
                          <strong>Observaciones:</strong> {visita.observaciones}
                        </p>
                      </div>
                    )}
                    
                    {visita.coordenadasGPS && visita.coordenadasGPS.latitud && visita.coordenadasGPS.longitud && (
                      <div className="mt-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            const lat = visita.coordenadasGPS.latitud
                            const lng = visita.coordenadasGPS.longitud
                            openInBestMapApp(lat, lng, `${visita.cliente} - ${visita.nombreProyecto || 'Visita técnica'}`)
                          }}
                          className="text-blue-600 hover:text-blue-800 underline text-sm flex items-center"
                        >
                          📍 Ver ubicación en mapa ({visita.coordenadasGPS.latitud.toFixed(4)}, {visita.coordenadasGPS.longitud.toFixed(4)})
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-end space-y-2 ml-4">
                    {[VISITA_ESTADOS.PENDING, VISITA_ESTADOS.ASSIGNED].includes(visita.estado) ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleIniciarVisita(visita)
                        }}
                        className="btn-primary"
                      >
                        Iniciar Visita
                      </button>
                    ) : visita.estado === VISITA_ESTADOS.COMPLETED ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleIniciarVisita(visita)
                        }}
                        className="btn-secondary"
                      >
                        Ver Detalles
                      </button>
                    ) : null}
                    
                    {visita.fechaCompletada && (
                      <p className="text-xs text-gray-500">
                        Completada: {format(new Date(visita.fechaCompletada), 'dd/MM/yyyy HH:mm', { locale: es })}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default MisVisitasTecnicas