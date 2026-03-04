import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import useAuthStore from '../../stores/authStore'
import useOrdenesStore from '../../stores/ordenesStore'
import useMaterialesStore from '../../stores/materialesStore'
import { isAdminOrSupervisor } from '../../utils/roleUtils'
import { getCurrentDate } from '../../utils/dateUtils'

const Dashboard = () => {
  const { user, hasPermission, isAuthenticated } = useAuthStore()
  const { ordenes, fetchOrdenes } = useOrdenesStore()
  const { getEstadisticasMateriales, getMaterialesBajoStock, fetchMateriales } = useMaterialesStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      // CRITICAL: Only fetch if authenticated
      if (!isAuthenticated || !user) {
        setLoading(false)
        return
      }

      try {
        await Promise.all([
          fetchOrdenes(),
          fetchMateriales()
        ])
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [fetchOrdenes, fetchMateriales, isAuthenticated, user])

  // Calcular métricas
  const getMetricas = () => {
    const total = ordenes.length
    const pendientes = ordenes.filter(o => o.estado === 'pending').length
    const enProceso = ordenes.filter(o => o.estado === 'in_progress').length
    const completadas = ordenes.filter(o => o.estado === 'completed').length
    const vencidas = ordenes.filter(o =>
      new Date(o.fechaVencimiento) < getCurrentDate() && o.estado !== 'completed'
    ).length
    const pendientesAprobacion = ordenes.filter(o =>
      o.estadoAprobacion === 'pending_approval'
    ).length

    return { total, pendientes, enProceso, completadas, vencidas, pendientesAprobacion }
  }

  const metricas = getMetricas()
  const estadisticasMateriales = getEstadisticasMateriales()
  const materialesBajoStock = getMaterialesBajoStock()

  // Datos para gráficos
  const dataPieChart = [
    { name: 'Pendientes', value: metricas.pendientes, color: '#6b7280' },
    { name: 'En Proceso', value: metricas.enProceso, color: '#3b82f6' },
    { name: 'Completadas', value: metricas.completadas, color: '#059669' },
    { name: 'Vencidas', value: metricas.vencidas, color: '#dc2626' }
  ]

  // Generar datos de barras desde las órdenes reales agrupadas por mes
  const getDataBarChart = () => {
    const mesesNombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    const ahora = getCurrentDate()
    const añoActual = ahora.getFullYear()

    // Obtener los últimos 6 meses
    const ultimos6Meses = []
    for (let i = 5; i >= 0; i--) {
      const fecha = new Date(añoActual, ahora.getMonth() - i, 1)
      ultimos6Meses.push({
        mes: mesesNombres[fecha.getMonth()],
        mesNumero: fecha.getMonth(),
        año: fecha.getFullYear()
      })
    }

    // Contar órdenes por mes
    return ultimos6Meses.map(({ mes, mesNumero, año }) => {
      const ordenesMes = ordenes.filter(orden => {
        const fechaOrden = new Date(orden.fechaCreacion)
        return fechaOrden.getMonth() === mesNumero && fechaOrden.getFullYear() === año
      })

      const completadasMes = ordenesMes.filter(o => o.estado === 'completed').length

      return {
        mes,
        ordenes: ordenesMes.length,
        completadas: completadasMes
      }
    })
  }

  const dataBarChart = getDataBarChart()

  // Calcular porcentaje de cambio vs mes anterior
  const calcularCambioMensual = () => {
    const ahora = getCurrentDate()
    const mesActual = ahora.getMonth()
    const añoActual = ahora.getFullYear()

    // Corregir cálculo para enero: mes anterior es diciembre del año anterior
    const mesAnterior = mesActual === 0 ? 11 : mesActual - 1
    const añoMesAnterior = mesActual === 0 ? añoActual - 1 : añoActual

    const ordenesMesActual = ordenes.filter(o => {
      const fecha = new Date(o.fechaCreacion)
      return fecha.getMonth() === mesActual && fecha.getFullYear() === añoActual
    }).length

    const ordenesMesAnterior = ordenes.filter(o => {
      const fecha = new Date(o.fechaCreacion)
      return fecha.getMonth() === mesAnterior && fecha.getFullYear() === añoMesAnterior
    }).length

    if (ordenesMesAnterior === 0) return { porcentaje: 0, esPositivo: true }

    const cambio = ((ordenesMesActual - ordenesMesAnterior) / ordenesMesAnterior) * 100
    return {
      porcentaje: Math.abs(Math.round(cambio)),
      esPositivo: cambio >= 0
    }
  }

  const cambioMensual = calcularCambioMensual()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-corporate-blue"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-corporate-blue to-blue-600 rounded-lg p-4 sm:p-6 text-white">
        <h1 className="text-lg sm:text-2xl font-bold mb-1 sm:mb-2">
          ¡Hola, {user?.name}!
        </h1>
        <p className="text-blue-100 text-sm sm:text-base">
          Aquí tienes un resumen de las actividades de mantenimiento
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total Órdenes</p>
              <p className="text-xl sm:text-3xl font-bold text-gray-900">{metricas.total}</p>
            </div>
            <div className="w-8 h-8 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
              <span className="text-lg sm:text-2xl">📋</span>
            </div>
          </div>
          <div className="mt-4">
            {cambioMensual.porcentaje > 0 ? (
              <span className={`text-sm ${cambioMensual.esPositivo ? 'text-green-600' : 'text-red-600'}`}>
                {cambioMensual.esPositivo ? '+' : '-'}{cambioMensual.porcentaje}% vs mes anterior
              </span>
            ) : (
              <span className="text-sm text-gray-500">Sin cambios vs mes anterior</span>
            )}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-gray-600">En Proceso</p>
              <p className="text-xl sm:text-3xl font-bold text-blue-600">{metricas.enProceso}</p>
            </div>
            <div className="w-8 h-8 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
              <span className="text-lg sm:text-2xl">⚙️</span>
            </div>
          </div>
          <div className="mt-2 sm:mt-4">
            <span className="text-xs sm:text-sm text-blue-600">Activas actualmente</span>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Completadas</p>
              <p className="text-xl sm:text-3xl font-bold text-green-600">{metricas.completadas}</p>
            </div>
            <div className="w-8 h-8 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
              <span className="text-lg sm:text-2xl">✅</span>
            </div>
          </div>
          <div className="mt-2 sm:mt-4">
            <span className="text-xs sm:text-sm text-green-600">
              {metricas.total > 0
                ? `${Math.round((metricas.completadas / metricas.total) * 100)}% éxito`
                : 'Sin datos'}
            </span>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Vencidas</p>
              <p className="text-xl sm:text-3xl font-bold text-red-600">{metricas.vencidas}</p>
            </div>
            <div className="w-8 h-8 sm:w-12 sm:h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
              <span className="text-lg sm:text-2xl">⚠️</span>
            </div>
          </div>
          <div className="mt-2 sm:mt-4">
            <span className="text-xs sm:text-sm text-red-600">Requieren atención</span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
        {/* Pie Chart */}
        <div className="card">
          <h3 className="text-sm sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
            Distribución de Órdenes
          </h3>
          <ResponsiveContainer width="100%" height={220} className="sm:!h-[300px]">
            <PieChart>
              <Pie
                data={dataPieChart}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={5}
                dataKey="value"
              >
                {dataPieChart.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 sm:mt-4 grid grid-cols-2 gap-2 sm:gap-4">
            {dataPieChart.map((item, index) => (
              <div key={index} className="flex items-center">
                <div
                  className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full mr-1.5 sm:mr-2 flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs sm:text-sm text-gray-600 truncate">{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bar Chart */}
        <div className="card">
          <h3 className="text-sm sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
            Órdenes por Mes
          </h3>
          <div className="overflow-x-auto -mx-2">
            <div className="min-w-[300px]">
              <ResponsiveContainer width="100%" height={220} className="sm:!h-[300px]">
                <BarChart data={dataBarChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="ordenes" fill="#3b82f6" name="Total" />
                  <Bar dataKey="completadas" fill="#059669" name="Completadas" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions & Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
        {/* Quick Actions */}
        {hasPermission('ordenes') && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Acciones Rápidas
            </h3>
            <div className="space-y-3">
              <Link
                to="/ordenes/nueva"
                className="block w-full btn-primary text-center"
              >
                📝 Nueva Orden
              </Link>
              <Link
                to="/ordenes"
                className="block w-full btn-secondary text-center"
              >
                📋 Ver Órdenes de trabajo
              </Link>
              {isAdminOrSupervisor(user) && metricas.pendientesAprobacion > 0 && (
                <Link
                  to="/aprobaciones"
                  className="block w-full bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg text-center transition-colors relative"
                >
                  ✅ Aprobaciones
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">
                    {metricas.pendientesAprobacion}
                  </span>
                </Link>
              )}
              {hasPermission('reportes') && (
                <Link
                  to="/reportes"
                  className="block w-full btn-secondary text-center"
                >
                  📊 Reportes
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Materials Alert */}
        {hasPermission('materiales') && materialesBajoStock.length > 0 && (
          <div className="card border-l-4 border-l-yellow-500">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              ⚠️ Materiales Bajo Stock
            </h3>
            <div className="space-y-2">
              {materialesBajoStock.slice(0, 3).map((material) => (
                <div key={material.id} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{material.nombre}</span>
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                    {material.stockActual} unidades
                  </span>
                </div>
              ))}
              {materialesBajoStock.length > 3 && (
                <Link
                  to="/materiales"
                  className="text-sm text-corporate-blue hover:underline"
                >
                  Ver todos ({materialesBajoStock.length - 3} más)
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Actividad Reciente
          </h3>
          <div className="space-y-3">
            {(() => {
              // Obtener las órdenes más recientes (últimas 5)
              const ordenesRecientes = [...ordenes]
                .sort((a, b) => new Date(b.fechaModificacion || b.fechaCreacion) - new Date(a.fechaModificacion || a.fechaCreacion))
                .slice(0, 5)

              // Función para calcular tiempo relativo
              const tiempoRelativo = (fecha) => {
                const ahora = getCurrentDate()
                const fechaActividad = new Date(fecha)
                const diff = ahora - fechaActividad
                const minutos = Math.floor(diff / 60000)
                const horas = Math.floor(diff / 3600000)
                const dias = Math.floor(diff / 86400000)

                if (minutos < 60) return `Hace ${minutos} minuto${minutos !== 1 ? 's' : ''}`
                if (horas < 24) return `Hace ${horas} hora${horas !== 1 ? 's' : ''}`
                return `Hace ${dias} día${dias !== 1 ? 's' : ''}`
              }

              const getColorEstado = (estado) => {
                switch(estado) {
                  case 'completed': return 'bg-green-500'
                  case 'in_progress': return 'bg-blue-500'
                  case 'pending': return 'bg-yellow-500'
                  case 'cancelled': return 'bg-red-500'
                  default: return 'bg-gray-500'
                }
              }

              const getTextoEstado = (estado) => {
                switch(estado) {
                  case 'completed': return 'completada'
                  case 'in_progress': return 'en proceso'
                  case 'pending': return 'creada'
                  case 'cancelled': return 'cancelada'
                  default: return 'actualizada'
                }
              }

              if (ordenesRecientes.length === 0) {
                return (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No hay actividad reciente
                  </p>
                )
              }

              return ordenesRecientes.map((orden) => (
                <div key={orden.id} className="flex items-start space-x-3">
                  <div className={`w-2 h-2 ${getColorEstado(orden.estado)} rounded-full mt-2`}></div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">
                      Orden {orden.id} {getTextoEstado(orden.estado)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {tiempoRelativo(orden.fechaModificacion || orden.fechaCreacion)}
                    </p>
                  </div>
                </div>
              ))
            })()}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard