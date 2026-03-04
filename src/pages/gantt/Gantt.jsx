import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { format, addDays, subDays, differenceInDays, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import useOrdenesStore from '../../stores/ordenesStore'
import { getCurrentDate } from '../../utils/dateUtils'

const Gantt = () => {
  const { ordenes, fetchOrdenes, isLoading } = useOrdenesStore()
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [selectedClient, setSelectedClient] = useState('all')
  const [dateRange, setDateRange] = useState(30) // días a mostrar

  useEffect(() => {
    // Cargar todas las órdenes
    fetchOrdenes({ estado: selectedFilter === 'all' ? undefined : selectedFilter })
  }, [fetchOrdenes, selectedFilter])

  // Filtrar órdenes según selección
  const filteredOrdenes = ordenes.filter(orden => {
    const matchesFilter = selectedFilter === 'all' || orden.estado === selectedFilter
    const matchesClient = selectedClient === 'all' || String(orden.clienteId) === String(selectedClient)
    return matchesFilter && matchesClient
  })

  // Obtener lista única de clientes con ID y nombre
  const clientesUnicos = useMemo(() => {
    const clientesMap = new Map()
    ordenes
      .filter(orden => orden.clienteId && orden.clienteNombre)
      .forEach(orden => {
        if (!clientesMap.has(orden.clienteId)) {
          clientesMap.set(orden.clienteId, {
            id: orden.clienteId,
            nombre: orden.clienteNombre
          })
        }
      })
    return Array.from(clientesMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [ordenes])

  // Calculate dynamic date range based on orders
  const calculateDateRange = () => {
    if (filteredOrdenes.length === 0) {
      return {
        startDate: getCurrentDate(),
        endDate: addDays(getCurrentDate(), dateRange),
        dates: []
      }
    }

    const today = getCurrentDate()

    // Find the earliest start date and latest end date from orders
    let earliestDate = today
    let latestDate = addDays(today, dateRange)

    filteredOrdenes.forEach(orden => {
      if (!orden.fechaCreacion || !orden.fechaVencimiento) return

      const fechaInicio = parseISO(orden.fechaInicio || orden.fechaCreacion)
      const fechaFin = parseISO(orden.fechaVencimiento)

      if (fechaInicio < earliestDate) {
        earliestDate = fechaInicio
      }
      if (fechaFin > latestDate) {
        latestDate = fechaFin
      }
    })

    // Ensure we show at least 30 days in the past
    const minStartDate = subDays(today, 30)
    if (earliestDate > minStartDate) {
      earliestDate = minStartDate
    }

    // Ensure we show at least dateRange days in the future
    const minEndDate = addDays(today, dateRange)
    if (latestDate < minEndDate) {
      latestDate = minEndDate
    }

    // Generate dates array
    const totalDays = Math.ceil(differenceInDays(latestDate, earliestDate))
    const dates = []
    for (let i = 0; i <= totalDays; i++) {
      dates.push(addDays(earliestDate, i))
    }

    return {
      startDate: earliestDate,
      endDate: latestDate,
      dates,
      totalDays
    }
  }

  const { startDate, endDate, dates, totalDays } = calculateDateRange()

  // Preparar órdenes para el Gantt
  const prepareGanttData = () => {
    return filteredOrdenes
      .filter(orden => orden.fechaCreacion && orden.fechaVencimiento)
      .map(orden => {
        const fechaInicio = parseISO(orden.fechaInicio || orden.fechaCreacion)
        const fechaFin = parseISO(orden.fechaVencimiento)
        const diasTranscurridos = differenceInDays(getCurrentDate(), fechaInicio)
        const duracionTotal = differenceInDays(fechaFin, fechaInicio)

        return {
          ...orden,
          fechaInicio,
          fechaFin,
          diasTranscurridos: Math.max(0, diasTranscurridos),
          duracionTotal: Math.max(1, duracionTotal),
          diasRestantes: differenceInDays(fechaFin, getCurrentDate())
        }
      })
  }

  const ganttData = prepareGanttData()

  const getBarColor = (orden) => {
    if (orden.estado === 'completed') return 'bg-green-500'
    if (orden.estado === 'in_progress') return 'bg-blue-500'
    if (orden.diasRestantes < 0) return 'bg-red-500'
    if (orden.diasRestantes <= 2) return 'bg-yellow-500'
    return 'bg-gray-400'
  }

  const getBarPosition = (orden) => {
    const startOffset = differenceInDays(orden.fechaInicio, startDate)
    const width = Math.max(1, orden.duracionTotal)

    return {
      left: Math.max(0, (startOffset / totalDays) * 100),
      width: Math.min((width / totalDays) * 100, 100)
    }
  }

  const getPriorityIcon = (prioridad) => {
    const icons = {
      high: '🔴',
      medium: '🟡',
      low: '🟢',
      urgent: '🔴'
    }
    return icons[prioridad] || '⚪'
  }

  // Calculate position of "today" line
  const getTodayPosition = () => {
    const offsetFromStart = differenceInDays(getCurrentDate(), startDate)
    return (offsetFromStart / totalDays) * 100
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando diagrama Gantt...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Diagrama Gantt</h1>
          <p className="text-sm text-gray-600">Vista temporal de órdenes de trabajo</p>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:space-x-4 gap-2 sm:gap-0">
          <select
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value)}
            className="input-field min-w-0 sm:min-w-32"
          >
            <option value="all">Todas</option>
            <option value="pending">Pendientes</option>
            <option value="in_progress">En Proceso</option>
            <option value="completed">Completadas</option>
          </select>

          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="input-field min-w-0 sm:min-w-40"
          >
            <option value="all">Todos los Clientes</option>
            {clientesUnicos.map((cliente) => (
              <option key={cliente.id} value={cliente.id}>
                {cliente.nombre}
              </option>
            ))}
          </select>

          <select
            value={dateRange}
            onChange={(e) => setDateRange(Number(e.target.value))}
            className="input-field min-w-0 sm:min-w-32 col-span-2 sm:col-span-1"
          >
            <option value={15}>15 días</option>
            <option value={30}>30 días</option>
            <option value={60}>60 días</option>
            <option value={90}>90 días</option>
          </select>
        </div>
      </div>

      {/* Legend */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Leyenda</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-sm text-gray-600">Completadas</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span className="text-sm text-gray-600">En Proceso</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span className="text-sm text-gray-600">Próximo Vencimiento</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-sm text-gray-600">Vencidas</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gray-400 rounded"></div>
            <span className="text-sm text-gray-600">Pendientes</span>
          </div>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="card overflow-x-auto">
        <div className="min-w-full">
          {/* Date Headers */}
          <div className="flex border-b border-gray-200 pb-2 mb-4">
            <div className="w-64 flex-shrink-0 font-semibold text-gray-700 px-4 py-2">
              Orden de Trabajo
            </div>
            <div className="flex-1 grid grid-cols-8 gap-1 min-w-0">
              {dates.filter((_, index) => index % Math.ceil(dates.length / 8) === 0).map((date, index) => (
                <div
                  key={index}
                  className="text-center text-xs text-gray-600 font-medium"
                >
                  <div>{format(date, 'dd', { locale: es })}</div>
                  <div>{format(date, 'MMM', { locale: es })}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Gantt Rows */}
          <div className="space-y-3">
            {ganttData.map((orden, index) => {
              const barPosition = getBarPosition(orden)
              const barColor = getBarColor(orden)

              return (
                <motion.div
                  key={orden.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center group hover:bg-gray-50 rounded-lg py-2"
                >
                  {/* Order Info */}
                  <div className="w-64 flex-shrink-0 px-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getPriorityIcon(orden.prioridad)}</span>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {orden.numeroOrden}
                        </h4>
                        <p className="text-xs text-gray-500 truncate">
                          {orden.clienteNombre}
                        </p>
                        {orden.numeroOrdenCompra && (
                          <p className="text-xs text-blue-600 truncate">
                            OC: {orden.numeroOrdenCompra}
                          </p>
                        )}
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`status-badge text-xs ${
                            orden.estado === 'pending' ? 'status-pending' :
                            orden.estado === 'in_progress' ? 'status-progress' :
                            'status-completed'
                          }`}>
                            {orden.estado === 'pending' ? 'Pendiente' :
                             orden.estado === 'in_progress' ? 'En Proceso' :
                             orden.estado === 'completed' ? 'Completada' : orden.estado}
                          </span>
                          <span className="text-xs text-gray-500">
                            {orden.porcentajeAvance}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Timeline Bar */}
                  <div className="flex-1 relative h-8 bg-gray-100 rounded min-w-0">
                    {/* Today Indicator */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-10"
                      style={{ left: `${getTodayPosition()}%` }}
                      title="Hoy"
                    />

                    {/* Task Bar */}
                    <div
                      className={`absolute top-1 bottom-1 ${barColor} rounded-sm shadow-sm transition-all duration-300 group-hover:shadow-md`}
                      style={{
                        left: `${barPosition.left}%`,
                        width: `${barPosition.width}%`
                      }}
                    >
                      {/* Progress Overlay */}
                      <div
                        className="h-full bg-white bg-opacity-30 rounded-sm"
                        style={{ width: `${orden.porcentajeAvance}%` }}
                      />

                      {/* Task Info Tooltip */}
                      <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-white text-xs font-medium truncate max-w-full px-1">
                        {orden.tecnicoAsignado || 'Sin asignar'}
                      </div>
                    </div>

                    {/* Hover Tooltip */}
                    <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-black text-white text-xs rounded py-1 px-2 whitespace-nowrap z-20">
                      <div>{orden.descripcion}</div>
                      {orden.numeroOrdenCompra && <div>Orden de Compra: {orden.numeroOrdenCompra}</div>}
                      <div>Inicio: {format(orden.fechaInicio, 'dd/MM/yyyy', { locale: es })}</div>
                      <div>Fin: {format(orden.fechaFin, 'dd/MM/yyyy', { locale: es })}</div>
                      <div>Progreso: {orden.porcentajeAvance}%</div>
                      <div>Días restantes: {orden.diasRestantes}</div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* No Data State */}
          {ganttData.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-4xl mb-2">📊</div>
              <p className="text-gray-500">No hay órdenes para mostrar en este rango de fechas</p>
              <p className="text-gray-400 text-sm mt-2">
                Prueba ajustando los filtros o el rango de días
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <div className="card">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Órdenes de trabajo Activas</h3>
          <div className="text-xl sm:text-2xl font-bold text-blue-600">
            {ganttData.filter(o => o.estado !== 'completed').length}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            En el rango de {dateRange} días
          </p>
        </div>

        <div className="card">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Próximos Vencimientos</h3>
          <div className="text-xl sm:text-2xl font-bold text-yellow-600">
            {ganttData.filter(o => o.diasRestantes <= 3 && o.diasRestantes >= 0).length}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Vencen en 3 días o menos
          </p>
        </div>

        <div className="card">
          <h3 className="text-sm font-medium text-gray-700 mb-2 col-span-2 md:col-span-1">Órdenes de trabajo Vencidas</h3>
          <div className="text-xl sm:text-2xl font-bold text-red-600">
            {ganttData.filter(o => o.diasRestantes < 0).length}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Requieren atención inmediata
          </p>
        </div>
      </div>
    </div>
  )
}

export default Gantt
