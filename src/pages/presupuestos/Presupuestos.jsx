import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import usePresupuestosStore, { getClienteNombre, limpiarDatosCorruptos } from '../../stores/presupuestosStore'
import useAuthStore from '../../stores/authStore'
import { formatDateLong, getCurrentDate } from '../../utils/dateUtils'
import { canViewPrices } from '../../utils/permissionsUtils'
import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'

const MySwal = withReactContent(Swal)

// Función helper para calcular totales aplicando el margen de ganancia
const calcularTotalesPresupuesto = (presupuesto) => {
  if (!presupuesto) return { subtotal: 0, igv: 0, total: 0 }

  const items = presupuesto.items || []
  const margenGanancia = presupuesto.margenGanancia || 0

  // Si hay items con precios, calcular desde ellos para asegurar que el margen se aplique
  const subtotalItems = items.reduce((sum, item) => sum + (item.subtotal || 0), 0)

  if (subtotalItems > 0) {
    // Calcular con margen de ganancia
    const margenAmount = subtotalItems * (margenGanancia / 100)
    const subtotalConMargen = subtotalItems + margenAmount
    const igvCalculado = subtotalConMargen * 0.18
    const totalCalculado = subtotalConMargen + igvCalculado

    return {
      subtotal: subtotalConMargen,
      igv: igvCalculado,
      total: totalCalculado
    }
  }

  // Si no hay items pero hay totales almacenados, usarlos
  if (presupuesto.total > 0) {
    return {
      subtotal: presupuesto.subtotal || 0,
      igv: presupuesto.igv || 0,
      total: presupuesto.total
    }
  }

  return { subtotal: 0, igv: 0, total: 0 }
}

const Presupuestos = () => {
  const navigate = useNavigate()
  const { user, hasPermission } = useAuthStore()
  const {
    presupuestos,
    fetchPresupuestos,
    isLoading,
    filtros,
    setFiltros,
    getPresupuestosFiltrados,
    getEstadisticas,
    aprobarPresupuesto,
    rechazarPresupuesto,
    agregarPrecios
  } = usePresupuestosStore()

  const [busqueda, setBusqueda] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('todos')

  // Limpiar datos corruptos al montar el componente
  useEffect(() => {
    limpiarDatosCorruptos()
  }, [])

  useEffect(() => {
    fetchPresupuestos()
  }, [fetchPresupuestos])

  useEffect(() => {
    setFiltros({
      ...filtros,
      busqueda,
      estado: estadoFiltro
    })
  }, [busqueda, estadoFiltro, setFiltros])

  const presupuestosFiltrados = getPresupuestosFiltrados()
  const estadisticas = getEstadisticas()

  const getEstadoBadge = (estado, tienePreciosAsignados) => {
    const estilos = {
      pendiente: 'bg-yellow-100 text-yellow-800',
      aprobado: 'bg-green-100 text-green-800',
      rechazado: 'bg-red-100 text-red-800'
    }

    const iconos = {
      pendiente: '⏳',
      aprobado: '✓',
      rechazado: '✗'
    }

    // Si es pendiente y sin precios, mostrar indicador
    const esPendiente = estado === 'pendiente'
    const label = esPendiente && !tienePreciosAsignados
      ? 'Pendiente (Sin precios)'
      : estado.charAt(0).toUpperCase() + estado.slice(1)

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${estilos[estado]}`}>
        <span className="mr-1">{iconos[estado]}</span>
        {label}
      </span>
    )
  }

  const handleAprobar = async (presupuesto) => {
    const result = await MySwal.fire({
      title: '¿Aprobar presupuesto?',
      text: `¿Está seguro de aprobar el presupuesto ${presupuesto.numero}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#1e40af',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, aprobar',
      cancelButtonText: 'Cancelar'
    })

    if (result.isConfirmed) {
      try {
        await aprobarPresupuesto(presupuesto.id, user.name)
        MySwal.fire({
          title: '¡Aprobado!',
          text: 'El presupuesto ha sido aprobado exitosamente',
          icon: 'success',
          confirmButtonColor: '#1e40af'
        })
        fetchPresupuestos()
      } catch (error) {
        MySwal.fire({
          title: 'Error',
          text: 'No se pudo aprobar el presupuesto',
          icon: 'error',
          confirmButtonColor: '#1e40af'
        })
      }
    }
  }

  const handleRechazar = async (presupuesto) => {
    const { value: motivo } = await MySwal.fire({
      title: 'Rechazar presupuesto',
      input: 'textarea',
      inputLabel: 'Motivo del rechazo',
      inputPlaceholder: 'Ingrese el motivo del rechazo...',
      inputAttributes: {
        'aria-label': 'Motivo del rechazo'
      },
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => {
        if (!value) {
          return 'Debe ingresar un motivo'
        }
      }
    })

    if (motivo) {
      try {
        await rechazarPresupuesto(presupuesto.id, motivo)
        MySwal.fire({
          title: 'Rechazado',
          text: 'El presupuesto ha sido rechazado',
          icon: 'info',
          confirmButtonColor: '#1e40af'
        })
        fetchPresupuestos()
      } catch (error) {
        MySwal.fire({
          title: 'Error',
          text: 'No se pudo rechazar el presupuesto',
          icon: 'error',
          confirmButtonColor: '#1e40af'
        })
      }
    }
  }

  const handleEditar = (presupuesto) => {
    // Redirigir a la página de edición
    navigate(`/presupuestos/${presupuesto.id}/editar`)
  }

  if (isLoading && presupuestos.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-corporate-blue"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Presupuestos</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Gestión de presupuestos y cotizaciones</p>
        </div>
        <Link to="/presupuestos/nuevo" className="btn-primary text-center">
          + Nuevo Presupuesto
        </Link>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Total</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{estadisticas.total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-xl">📊</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Pendientes</p>
              <p className="text-xl sm:text-2xl font-bold text-yellow-600">{estadisticas.pendientes}</p>
              <p className="text-xs text-gray-500 mt-1">
                {estadisticas.pendientesSinPrecios} sin precios
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <span className="text-xl">⏳</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Aprobados</p>
              <p className="text-xl sm:text-2xl font-bold text-green-600">{estadisticas.aprobados}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-xl">✅</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Rechazados</p>
              <p className="text-xl sm:text-2xl font-bold text-red-600">{estadisticas.rechazados}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <span className="text-xl">❌</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Tasa Conversión</p>
              <p className="text-lg sm:text-xl font-bold text-blue-600">
                {estadisticas.tasaConversion.toFixed(1)}%
              </p>
            </div>
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <span className="text-xl">📈</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filtros */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar por número o cliente..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-corporate-blue focus:border-transparent"
            />
            <svg
              className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          <select
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-corporate-blue focus:border-transparent"
          >
            <option value="todos">Todos los estados</option>
            <option value="pendiente">Pendientes</option>
            <option value="aprobado">Aprobados</option>
            <option value="rechazado">Rechazados</option>
          </select>
        </div>
      </div>

      {/* Lista de presupuestos - Vista de tarjetas para movil */}
      <div className="md:hidden space-y-3">
        {presupuestosFiltrados.length === 0 ? (
          <div className="card p-6 text-center text-gray-500">
            No se encontraron presupuestos
          </div>
        ) : (
          presupuestosFiltrados.map((presupuesto) => {
            const totales = calcularTotalesPresupuesto(presupuesto)
            const tienePrecios = totales.subtotal > 0
            return (
              <div key={presupuesto.id} className="card p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <Link
                      to={`/presupuestos/${presupuesto.id}`}
                      className="text-corporate-blue hover:text-blue-800 font-semibold text-sm"
                    >
                      {presupuesto.numero}
                    </Link>
                    <p className="text-sm font-medium text-gray-900 mt-0.5">
                      {getClienteNombre(presupuesto) || '-'}
                    </p>
                    {(presupuesto.clienteData?.ruc || presupuesto.cliente?.ruc) && (
                      <p className="text-xs text-gray-500">
                        {presupuesto.clienteData?.ruc || presupuesto.cliente?.ruc}
                      </p>
                    )}
                  </div>
                  {getEstadoBadge(presupuesto.estado, tienePrecios)}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Fecha:</span>
                    <span className="ml-1 text-gray-900">{new Date(presupuesto.fechaCotizacion).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Vence:</span>
                    <span className="ml-1 text-gray-900">{new Date(presupuesto.fechaVencimiento).toLocaleDateString()}</span>
                  </div>
                  {canViewPrices(user) && (
                    <div className="col-span-2">
                      <span className="text-gray-500">Total:</span>
                      <span className="ml-1 font-semibold text-gray-900">
                        S/{totales.total.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="ml-2 text-gray-400">
                        (IGV S/{totales.igv.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                      </span>
                    </div>
                  )}
                  <div className="col-span-2">
                    <span className="text-gray-500">Registrado por:</span>
                    <span className="ml-1 text-gray-700">{presupuesto.elaboradoPor || '-'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
                  <Link
                    to={`/presupuestos/${presupuesto.id}`}
                    className="text-blue-600 hover:text-blue-900 p-1"
                    title="Ver detalle"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </Link>
                  {presupuesto.estado === 'pendiente' && user?.role === 'admin' && (
                    <button
                      onClick={() => handleEditar(presupuesto)}
                      className="text-gray-600 hover:text-gray-900 p-1"
                      title="Editar"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  )}
                  {presupuesto.estado === 'pendiente' && totales.subtotal > 0 && user?.role === 'admin' && (
                    <>
                      <button
                        onClick={() => handleAprobar(presupuesto)}
                        className="text-green-600 hover:text-green-900 p-1"
                        title="Aprobar"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleRechazar(presupuesto)}
                        className="text-red-600 hover:text-red-900 p-1"
                        title="Rechazar"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Lista de presupuestos - Tabla para desktop */}
      <div className="card overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Numero
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                {canViewPrices(user) && (
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                )}
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vencimiento
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Registrado por
                </th>
                <th className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {presupuestosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={canViewPrices(user) ? "8" : "7"} className="px-6 py-8 text-center text-gray-500">
                    No se encontraron presupuestos
                  </td>
                </tr>
              ) : (
                presupuestosFiltrados.map((presupuesto) => (
                  <tr key={presupuesto.id} className="hover:bg-gray-50">
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      <Link
                        to={`/presupuestos/${presupuesto.id}`}
                        className="text-corporate-blue hover:text-blue-800 font-medium"
                      >
                        {presupuesto.numero}
                      </Link>
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {getClienteNombre(presupuesto) || '-'}
                        </div>
                        {(presupuesto.clienteData?.ruc || presupuesto.cliente?.ruc) && (
                          <div className="text-sm text-gray-500">
                            {presupuesto.clienteData?.ruc || presupuesto.cliente?.ruc}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(presupuesto.fechaCotizacion).toLocaleDateString()}
                    </td>
                    {canViewPrices(user) && (
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                        {(() => {
                          const totales = calcularTotalesPresupuesto(presupuesto)
                          return (
                            <>
                              <div className="text-sm font-semibold text-gray-900">
                                S/{totales.total.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                              <div className="text-xs text-gray-500">
                                + IGV S/{totales.igv.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            </>
                          )
                        })()}
                      </td>
                    )}
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                      {(() => {
                        const totales = calcularTotalesPresupuesto(presupuesto)
                        const tienePrecios = totales.subtotal > 0
                        return getEstadoBadge(presupuesto.estado, tienePrecios)
                      })()}
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(presupuesto.fechaVencimiento).toLocaleDateString()}
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {presupuesto.elaboradoPor || '-'}
                    </td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link
                          to={`/presupuestos/${presupuesto.id}`}
                          className="text-blue-600 hover:text-blue-900"
                          title="Ver detalle"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Link>

                        {presupuesto.estado === 'pendiente' && user?.role === 'admin' && (
                          <button
                            onClick={() => handleEditar(presupuesto)}
                            className="text-gray-600 hover:text-gray-900"
                            title="Editar"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}

                        {presupuesto.estado === 'pendiente' && calcularTotalesPresupuesto(presupuesto).subtotal > 0 && user?.role === 'admin' && (
                          <>
                            <button
                              onClick={() => handleAprobar(presupuesto)}
                              className="text-green-600 hover:text-green-900"
                              title="Aprobar"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleRechazar(presupuesto)}
                              className="text-red-600 hover:text-red-900"
                              title="Rechazar"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Presupuestos