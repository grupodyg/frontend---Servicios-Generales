import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useVisitasTecnicasStore from '../../stores/visitasTecnicasStore'
import useAuthStore from '../../stores/authStore'
import useDoubleConfirmDelete from '../../hooks/useDoubleConfirmDelete'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { openInBestMapApp } from '../../utils/mapUtils'
import { VISITA_ESTADOS, getEstadoLabel, getEstadoColor, getEspecialidadColor } from '../../constants/visitasTecnicasConstants'
import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'

const MySwal = withReactContent(Swal)

const VisitasTecnicas = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const {
    visitas,
    fetchVisitas,
    updateVisitaTecnica,
    checkCanDeleteVisita,
    deleteVisitaTecnica,
    filtros,
    setFiltros,
    isLoading
  } = useVisitasTecnicasStore()
  const { handleDelete, isDeleting } = useDoubleConfirmDelete()

  const [showFiltros, setShowFiltros] = useState(false)
  const [ordenamiento, setOrdenamiento] = useState({ columna: 'id', direccion: 'desc' })

  // Función para cambiar ordenamiento
  const handleOrdenar = (columna) => {
    setOrdenamiento(prev => ({
      columna,
      direccion: prev.columna === columna && prev.direccion === 'desc' ? 'asc' : 'desc'
    }))
  }

  // Icono de ordenamiento para cabeceras
  const SortIcon = ({ columna }) => {
    if (ordenamiento.columna !== columna) {
      return <span className="text-gray-300 ml-1">↕</span>
    }
    return <span className="text-blue-600 ml-1">{ordenamiento.direccion === 'asc' ? '↑' : '↓'}</span>
  }

  useEffect(() => {
    fetchVisitas({}, user?.role, user?.name)
  }, [fetchVisitas, user])

  const getEstadoBadge = (estado) => {
    const color = getEstadoColor(estado)

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
      color: color,
      icon: iconos[estado] || '📋',
      label: getEstadoLabel(estado)
    }
  }

  const handleEliminarVisita = async (visita) => {
    await handleDelete({
      entityName: 'visita técnica',
      entityId: visita.id,
      entityData: {
        'ID': visita.id,
        'Cliente': visita.cliente,
        'Servicio': visita.tipoServicio,
        'Fecha Visita': visita.fechaVisita || 'Sin fecha',
        'Estado': getEstadoLabel(visita.estado)
      },
      checkCanDeleteFn: checkCanDeleteVisita,
      deleteFn: deleteVisitaTecnica,
      onSuccess: () => fetchVisitas({}, user?.role, user?.name)
    })
  }

  const handleViewDetails = (visita) => {
    navigate(`/visitas-tecnicas/${visita.id}`)
  }

  const handleCreateNew = () => {
    navigate('/visitas-tecnicas/nueva')
  }

  const visitasFiltradas = visitas.filter(visita => {
    if (filtros.estado !== 'todos' && visita.estado !== filtros.estado) return false
    if (filtros.tecnico !== 'todos' && visita.tecnicoAsignado !== filtros.tecnico) return false
    if (filtros.busqueda && !visita.cliente.toLowerCase().includes(filtros.busqueda.toLowerCase()) &&
        !visita.id.toLowerCase().includes(filtros.busqueda.toLowerCase())) return false

    const fechaVisita = new Date(visita.fechaVisita)
    if (filtros.fechaInicio && fechaVisita < new Date(filtros.fechaInicio)) return false
    if (filtros.fechaFin && fechaVisita > new Date(filtros.fechaFin)) return false

    return true
  })

  // Ordenar visitas
  const visitasOrdenadas = [...visitasFiltradas].sort((a, b) => {
    const { columna, direccion } = ordenamiento
    let valorA, valorB

    switch (columna) {
      case 'id':
        // Extraer número del ID (ej: "VT-001" -> 1)
        const numA = parseInt(a.id.replace(/\D/g, '')) || 0
        const numB = parseInt(b.id.replace(/\D/g, '')) || 0
        valorA = numA
        valorB = numB
        break
      case 'solpe':
        valorA = a.solpe || ''
        valorB = b.solpe || ''
        break
      case 'cliente':
        valorA = a.cliente?.toLowerCase() || ''
        valorB = b.cliente?.toLowerCase() || ''
        break
      case 'servicio':
        valorA = a.tipoServicio?.toLowerCase() || ''
        valorB = b.tipoServicio?.toLowerCase() || ''
        break
      case 'tecnico':
        valorA = a.tecnicosAsignados?.[0]?.nombre?.toLowerCase() || ''
        valorB = b.tecnicosAsignados?.[0]?.nombre?.toLowerCase() || ''
        break
      case 'fecha':
        valorA = new Date(a.fechaVisita).getTime()
        valorB = new Date(b.fechaVisita).getTime()
        break
      case 'estado':
        valorA = a.estado?.toLowerCase() || ''
        valorB = b.estado?.toLowerCase() || ''
        break
      default:
        return 0
    }

    if (valorA < valorB) return direccion === 'asc' ? -1 : 1
    if (valorA > valorB) return direccion === 'asc' ? 1 : -1
    return 0
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Visitas Técnicas</h1>
          <p className="text-sm sm:text-base text-gray-600">
            Gestiona las visitas técnicas
          </p>
        </div>

        <button
          onClick={handleCreateNew}
          className="btn-primary w-full sm:w-auto"
        >
          + Nueva Visita
        </button>
      </div>

      {/* Filtros */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">Filtros</h2>
          <div className="flex items-center gap-3">
            {showFiltros && (
              <button
                onClick={() => setFiltros({
                  estado: 'todos',
                  tecnico: 'todos',
                  busqueda: '',
                  fechaInicio: '',
                  fechaFin: ''
                })}
                className="text-gray-600 hover:text-gray-800 text-sm font-medium flex items-center gap-1"
              >
                🔄 Limpiar filtros
              </button>
            )}
            <button
              onClick={() => setShowFiltros(!showFiltros)}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              {showFiltros ? 'Ocultar' : 'Mostrar'} filtros
            </button>
          </div>
        </div>
        
        {showFiltros && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <select
                className="input-field"
                value={filtros.estado}
                onChange={(e) => setFiltros({ estado: e.target.value })}
              >
                <option value="todos">Todos los estados</option>
                <option value={VISITA_ESTADOS.PENDING}>Pendiente</option>
                <option value={VISITA_ESTADOS.ASSIGNED}>Asignada</option>
                <option value={VISITA_ESTADOS.IN_PROGRESS}>En Progreso</option>
                <option value={VISITA_ESTADOS.COMPLETED}>Completada</option>
                <option value={VISITA_ESTADOS.APPROVED}>Aprobada</option>
                <option value={VISITA_ESTADOS.REJECTED}>Rechazada</option>
                <option value={VISITA_ESTADOS.CANCELLED}>Cancelada</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buscar
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="ID, cliente..."
                value={filtros.busqueda}
                onChange={(e) => setFiltros({ busqueda: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha desde
              </label>
              <input
                type="date"
                className="input-field"
                value={filtros.fechaInicio || ''}
                onChange={(e) => setFiltros({ fechaInicio: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha hasta
              </label>
              <input
                type="date"
                className="input-field"
                value={filtros.fechaFin || ''}
                onChange={(e) => setFiltros({ fechaFin: e.target.value })}
              />
            </div>
          </div>
        )}
      </div>

      {/* Tabla de visitas */}
      <div className="card">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : visitasOrdenadas.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No hay visitas técnicas registradas</p>
              <button
                onClick={handleCreateNew}
                className="btn-primary"
              >
                Crear primera visita
              </button>
            </div>
          ) : (
            <>
              {/* Vista tabla - solo desktop */}
              <table className="hidden md:table min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleOrdenar('id')}
                    >
                      ID / Proyecto <SortIcon columna="id" />
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleOrdenar('solpe')}
                    >
                      SOLPE <SortIcon columna="solpe" />
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleOrdenar('cliente')}
                    >
                      Cliente / Contacto <SortIcon columna="cliente" />
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleOrdenar('servicio')}
                    >
                      Servicio <SortIcon columna="servicio" />
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleOrdenar('tecnico')}
                    >
                      Técnico(s) <SortIcon columna="tecnico" />
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleOrdenar('fecha')}
                    >
                      Fecha <SortIcon columna="fecha" />
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleOrdenar('estado')}
                    >
                      Estado <SortIcon columna="estado" />
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {visitasOrdenadas.map((visita) => {
                    const estadoBadge = getEstadoBadge(visita.estado)

                    return (
                      <tr key={visita.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="text-sm font-semibold text-gray-900">
                            {visita.id}
                          </div>
                          {visita.nombreProyecto && (
                            <div className="text-xs text-gray-500 mt-0.5 truncate max-w-[140px]" title={visita.nombreProyecto}>
                              {visita.nombreProyecto}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">
                            {visita.solpe || '-'}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">{visita.cliente}</div>
                          {visita.contacto && (
                            <div className="text-xs text-gray-500 mt-0.5">{visita.contacto}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900 max-w-[180px] truncate" title={visita.tipoServicio}>
                            {visita.tipoServicio}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {visita.tecnicosAsignados && visita.tecnicosAsignados.length > 0 ? (
                            <div className="space-y-1">
                              {visita.tecnicosAsignados.map((tecnico, index) => (
                                <div key={index} className="flex items-center gap-1.5">
                                  <span className="text-sm font-medium text-gray-900 truncate max-w-[120px]" title={tecnico.nombre || 'Sin nombre'}>
                                    {tecnico.nombre || 'Sin nombre'}
                                  </span>
                                  {tecnico.especialidad && (
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap ${getEspecialidadColor(tecnico.especialidad)}`}>
                                      {tecnico.especialidad}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400 italic">Sin asignar</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {format(new Date(visita.fechaVisita), 'dd/MM/yyyy', { locale: es })}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${estadoBadge.color}`}>
                            {estadoBadge.icon} {estadoBadge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleViewDetails(visita)}
                              className="text-corporate-blue hover:text-blue-700 bg-blue-50 hover:bg-blue-100 p-2 rounded transition-colors"
                              title="Ver detalles"
                            >
                              👁️
                            </button>

                            {visita.coordenadasGPS?.latitud && visita.coordenadasGPS?.longitud && (
                              <button
                                onClick={() => {
                                  const lat = visita.coordenadasGPS.latitud
                                  const lng = visita.coordenadasGPS.longitud
                                  openInBestMapApp(lat, lng, `${visita.cliente} - ${visita.nombreProyecto || 'Visita técnica'}`)
                                }}
                                className="text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 p-2 rounded transition-colors"
                                title="Ver en mapa"
                              >
                                📍
                              </button>
                            )}

                            {user?.role === 'admin' && (
                              <button
                                onClick={() => handleEliminarVisita(visita)}
                                className="text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded transition-colors"
                                title="Eliminar visita"
                                disabled={isDeleting || isLoading}
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Vista tarjetas - solo movil */}
              <div className="md:hidden space-y-3">
                {visitasOrdenadas.map((visita) => {
                  const estadoBadge = getEstadoBadge(visita.estado)

                  return (
                    <div
                      key={visita.id}
                      className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleViewDetails(visita)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">{visita.id}</span>
                          {visita.solpe && (
                            <span className="text-xs text-gray-500">SOLPE: {visita.solpe}</span>
                          )}
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${estadoBadge.color}`}>
                          {estadoBadge.icon} {estadoBadge.label}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900">{visita.cliente}</p>
                      {visita.contacto && (
                        <p className="text-xs text-gray-500">{visita.contacto}</p>
                      )}
                      <p className="text-xs text-gray-600 mt-1 truncate">{visita.tipoServicio}</p>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                        <span className="text-xs text-gray-500">
                          {format(new Date(visita.fechaVisita), 'dd/MM/yyyy', { locale: es })}
                        </span>
                        <div className="flex items-center gap-1">
                          {visita.tecnicosAsignados && visita.tecnicosAsignados.length > 0 ? (
                            <span className="text-xs text-gray-600">
                              {visita.tecnicosAsignados.map(t => t.nombre || 'Sin nombre').join(', ')}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Sin asignar</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 mt-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleViewDetails(visita)}
                          className="text-corporate-blue hover:text-blue-700 bg-blue-50 hover:bg-blue-100 p-1.5 rounded transition-colors text-xs"
                          title="Ver detalles"
                        >
                          👁️
                        </button>
                        {visita.coordenadasGPS?.latitud && visita.coordenadasGPS?.longitud && (
                          <button
                            onClick={() => {
                              const lat = visita.coordenadasGPS.latitud
                              const lng = visita.coordenadasGPS.longitud
                              openInBestMapApp(lat, lng, `${visita.cliente} - ${visita.nombreProyecto || 'Visita técnica'}`)
                            }}
                            className="text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 p-1.5 rounded transition-colors text-xs"
                            title="Ver en mapa"
                          >
                            📍
                          </button>
                        )}
                        {user?.role === 'admin' && (
                          <button
                            onClick={() => handleEliminarVisita(visita)}
                            className="text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 p-1.5 rounded transition-colors text-xs"
                            title="Eliminar visita"
                            disabled={isDeleting || isLoading}
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default VisitasTecnicas