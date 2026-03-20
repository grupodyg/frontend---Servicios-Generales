import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import useOrdenesStore from '../../stores/ordenesStore'
import useConfigStore from '../../stores/configStore'
import useAuthStore from '../../stores/authStore'
import useTecnicosStore from '../../stores/tecnicosStore'
import useMaterialesStore from '../../stores/materialesStore'
import useClientesStore from '../../stores/clientesStore'
import useDoubleConfirmDelete from '../../hooks/useDoubleConfirmDelete'
import { getToday } from '../../utils/dateUtils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'

const MySwal = withReactContent(Swal)

const Ordenes = () => {
  const { ordenes, fetchOrdenes, isLoading, filtros, setFiltros, updateOrden, checkCanDeleteOrden, deleteOrden } = useOrdenesStore()
  const { getTiposServicioActivos } = useConfigStore()
  const { user } = useAuthStore()
  const { getNombresTecnicos, fetchTecnicos } = useTecnicosStore()
  const { puedesolicitarMateriales } = useMaterialesStore()
  const { puedeSubirFotos } = useOrdenesStore()
  const { clientes, fetchClientes } = useClientesStore()
  const { handleDelete, isDeleting } = useDoubleConfirmDelete()

  const tiposServicioActivos = getTiposServicioActivos()
  const tecnicos = getNombresTecnicos()

  useEffect(() => {
    fetchOrdenes({})
    fetchClientes()
    fetchTecnicos()
  }, [fetchOrdenes, fetchClientes, fetchTecnicos, user])

  // Obtener lista única de clientes desde las órdenes
  const clientesConOrdenes = [...new Set(ordenes.map(orden => orden.cliente))].sort()
  // Combinar con clientes del store para tener opciones completas
  const todosLosClientes = [...new Set([...clientesConOrdenes, ...clientes.map(c => c.nombre)])].sort()

  const getEstadoBadge = (estado) => {
    const estilos = {
      pending: 'status-badge status-pending',
      in_progress: 'status-badge status-progress',
      completed: 'status-badge status-completed'
    }
    const textos = {
      pending: 'Pendiente',
      in_progress: 'En Proceso',
      completed: 'Completada'
    }
    return (
      <span className={estilos[estado] || 'status-badge status-pending'}>
        {textos[estado] || estado}
      </span>
    )
  }

  const getPrioridadColor = (prioridad) => {
    const colores = {
      baja: 'text-green-600',
      media: 'text-yellow-600',
      alta: 'text-red-600',
      urgente: 'text-purple-600'
    }
    return colores[prioridad] || 'text-gray-600'
  }

  const getTipoVisitaBadge = (orden) => {
    // Usar basadoEnVisitaTecnica como fallback si tipoVisita está mal configurado
    const tieneVisita = orden.tipoVisita === 'con_visita' || orden.basadoEnVisitaTecnica || orden.visitaTecnicaId

    const estilo = tieneVisita ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
    const texto = tieneVisita ? 'Con Visita Técnica' : 'Sin Visita Técnica'

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${estilo}`}>
        {texto}
      </span>
    )
  }

  const handleEliminarOrden = async (orden) => {
    await handleDelete({
      entityName: 'orden de trabajo',
      entityId: orden.id,
      entityData: {
        'ID': orden.id,
        'Cliente': orden.cliente,
        'Servicio': orden.tipoServicio,
        'Técnico': orden.tecnicoAsignado || 'Sin asignar',
        'Estado': orden.estado
      },
      checkCanDeleteFn: checkCanDeleteOrden,
      deleteFn: deleteOrden,
      onSuccess: () => fetchOrdenes({})
    })
  }

  const handleReasignarTecnico = async (orden) => {
    if (user?.role !== 'supervisor' && user?.role !== 'admin') {
      MySwal.fire({
        title: 'Acceso denegado',
        text: 'Solo supervisores y administradores pueden reasignar técnicos',
        icon: 'error'
      })
      return
    }

    const { value: nuevoTecnico } = await MySwal.fire({
      title: `Reasignar técnico - Orden ${orden.id}`,
      html: `
        <div class="text-left mb-4">
          <p class="text-sm text-gray-600 mb-2">Cliente: <strong>${orden.cliente}</strong></p>
          <p class="text-sm text-gray-600 mb-2">Servicio: <strong>${orden.tipoServicio}</strong></p>
          <p class="text-sm text-gray-600 mb-4">Técnico actual: <strong>${orden.tecnicoAsignado}</strong></p>
        </div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Seleccionar nuevo técnico:</label>
        <select id="tecnico-select" class="w-full p-2 border border-gray-300 rounded-md">
          ${tecnicos.map(tecnico =>
            `<option value="${tecnico}" ${tecnico === orden.tecnicoAsignado ? 'selected' : ''}>${tecnico}</option>`
          ).join('')}
        </select>
      `,
      showCancelButton: true,
      confirmButtonText: 'Reasignar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#1e40af',
      preConfirm: () => {
        const select = document.getElementById('tecnico-select')
        const nuevoTecnico = select.value

        if (nuevoTecnico === orden.tecnicoAsignado) {
          Swal.showValidationMessage('Debe seleccionar un técnico diferente al actual')
          return false
        }

        return nuevoTecnico
      }
    })

    if (nuevoTecnico) {
      try {
        await updateOrden(orden.id, {
          tecnicoAsignado: nuevoTecnico,
          fechaReasignacion: getToday(),
          reasignadoPor: user.name
        })

        MySwal.fire({
          title: '¡Reasignado!',
          text: `Orden ${orden.id} reasignada a ${nuevoTecnico}`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        })

        // Refrescar órdenes
        fetchOrdenes({})
      } catch (error) {
        MySwal.fire({
          title: 'Error',
          text: 'No se pudo reasignar el técnico',
          icon: 'error'
        })
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-corporate-blue"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Órdenes de Trabajo</h1>
          <p className="text-sm text-gray-600 hidden sm:block">Gestión de órdenes de mantenimiento</p>
        </div>
        {(user?.role === 'admin' || user?.role === 'supervisor') && (
          <Link
            to="/ordenes/nueva"
            className="btn-primary text-center text-sm sm:text-base"
          >
            ➕ Nueva Orden
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 sm:gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado
            </label>
            <select
              className="input-field"
              value={filtros.estado}
              onChange={(e) => setFiltros({ estado: e.target.value })}
            >
              <option value="todos">Todos</option>
              <option value="pending">Pendiente</option>
              <option value="in_progress">En Proceso</option>
              <option value="completed">Completada</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Visita
            </label>
            <select 
              className="input-field"
              value={filtros.tipoVisita}
              onChange={(e) => setFiltros({ tipoVisita: e.target.value })}
            >
              <option value="todos">Todos</option>
              <option value="con_visita">Con Visita Técnica</option>
              <option value="sin_visita">Sin Visita Técnica</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Servicio
            </label>
            <select 
              className="input-field"
              value={filtros.tipo}
              onChange={(e) => setFiltros({ tipo: e.target.value })}
            >
              <option value="todos">Todos</option>
              {tiposServicioActivos.map((tipo) => (
                <option key={tipo.id} value={tipo.nombre}>
                  {tipo.nombre}
                </option>
              ))}
            </select>
          </div>
          
          {user?.role !== 'tecnico' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Técnico
              </label>
              <select 
                className="input-field"
                value={filtros.tecnico}
                onChange={(e) => setFiltros({ tecnico: e.target.value })}
              >
                <option value="todos">Todos</option>
                {tecnicos.map((tecnico) => (
                  <option key={tecnico} value={tecnico}>
                    {tecnico}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cliente
            </label>
            <select 
              className="input-field"
              value={filtros.cliente || ''}
              onChange={(e) => setFiltros({ cliente: e.target.value })}
            >
              <option value="">Todos los clientes</option>
              {todosLosClientes.map((cliente) => (
                <option key={cliente} value={cliente}>
                  {cliente}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Búsqueda
            </label>
            <input
              type="text"
              placeholder="Buscar por ID o cliente..."
              className="input-field"
              value={filtros.busqueda}
              onChange={(e) => setFiltros({ busqueda: e.target.value })}
            />
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => fetchOrdenes({})}
              className="btn-primary w-full"
            >
              🔍 Buscar
            </button>
          </div>
        </div>
      </div>

      {/* Orders - Mobile Cards */}
      <div className="md:hidden space-y-3">
        {ordenes.length === 0 ? (
          <div className="card text-center py-8">
            <div className="text-4xl mb-3">📋</div>
            <p className="font-semibold text-gray-900 text-sm">No se encontraron órdenes</p>
            <p className="text-xs text-gray-600 mt-1">
              {user?.role === 'tecnico'
                ? 'No tienes órdenes asignadas'
                : 'No hay órdenes que coincidan con los filtros'}
            </p>
          </div>
        ) : (
          ordenes.map((orden) => (
            <div key={orden.id} className="card">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900">#{orden.id}</span>
                  <span className={`text-xs font-medium ${getPrioridadColor(orden.prioridad)}`}>
                    {orden.prioridad === 'urgente' ? '🚨' : orden.prioridad === 'alta' ? '🔴' : orden.prioridad === 'media' ? '🟡' : '🟢'} {orden.prioridad?.charAt(0).toUpperCase() + orden.prioridad?.slice(1)}
                  </span>
                  {orden.esEmergencia && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-300 animate-pulse">
                      EMERGENCIA
                    </span>
                  )}
                </div>
                {getEstadoBadge(orden.estado)}
              </div>

              <div className="space-y-1.5 text-sm">
                <div className="font-medium text-gray-900">{orden.cliente}</div>
                {orden.ubicacion && (
                  <div className="text-xs text-gray-500 truncate">📍 {orden.ubicacion}</div>
                )}
                <div className="text-xs text-gray-600">{orden.tipoServicio}</div>
                <div className="flex flex-wrap gap-1">
                  {getTipoVisitaBadge(orden)}
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                <span>👤 {orden.tecnicoAsignado}</span>
                <span>{orden.fechaVencimiento ? format(new Date(orden.fechaVencimiento), 'dd/MM/yyyy', { locale: es }) : '-'}</span>
              </div>

              {/* Progreso */}
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                  <div className="bg-corporate-blue h-1.5 rounded-full" style={{ width: `${orden.porcentajeAvance}%` }} />
                </div>
                <span className="text-xs text-gray-600 font-medium">{orden.porcentajeAvance}%</span>
              </div>

              {/* Acciones */}
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
                <Link to={`/ordenes/${orden.id}`} className="flex-1 text-center text-xs bg-blue-50 text-corporate-blue py-2 rounded-lg font-medium hover:bg-blue-100">
                  Ver detalle
                </Link>
                {(user?.role === 'supervisor' || user?.role === 'admin') && (
                  <button onClick={() => handleReasignarTecnico(orden)} className="text-xs bg-orange-50 text-orange-600 py-2 px-3 rounded-lg hover:bg-orange-100" disabled={isLoading}>
                    👥
                  </button>
                )}
                {user?.role === 'admin' && (
                  <>
                    <Link to={`/ordenes/${orden.id}/editar`} className="text-xs bg-gray-50 text-gray-600 py-2 px-3 rounded-lg hover:bg-gray-100">✏️</Link>
                    <button onClick={() => handleEliminarOrden(orden)} className="text-xs bg-red-50 text-red-600 py-2 px-3 rounded-lg hover:bg-red-100" disabled={isDeleting || isLoading}>🗑️</button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Orders Table - Desktop */}
      <div className="card hidden md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">OC</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Servicio</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">Progreso</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Técnico</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Vencimiento</th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ordenes.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="text-6xl">📋</div>
                      <div className="text-lg font-semibold text-gray-900">No se encontraron órdenes de trabajo</div>
                      <div className="text-sm text-gray-600">
                        {user?.role === 'tecnico' ? 'No tienes órdenes asignadas en este momento' : 'No hay órdenes que coincidan con los filtros seleccionados'}
                      </div>
                      {(user?.role === 'admin' || user?.role === 'supervisor') && (
                        <Link to="/ordenes/nueva" className="btn-primary mt-4">➕ Crear Primera Orden</Link>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                ordenes.map((orden) => (
                  <tr key={orden.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3">
                      <div className="text-sm font-semibold text-gray-900">
                        {orden.id}
                        {orden.esEmergencia && (
                          <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-300 animate-pulse">
                            EMERGENCIA
                          </span>
                        )}
                      </div>
                      <div className={`text-xs mt-0.5 font-medium ${getPrioridadColor(orden.prioridad)}`}>
                        {orden.prioridad === 'urgente' ? '🚨' : orden.prioridad === 'alta' ? '🔴' : orden.prioridad === 'media' ? '🟡' : '🟢'} {orden.prioridad?.charAt(0).toUpperCase() + orden.prioridad?.slice(1)}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-sm text-gray-900">{orden.numeroOrdenCompra || <span className="text-gray-400 italic">-</span>}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-sm font-medium text-gray-900 truncate max-w-[140px]">{orden.cliente}</div>
                      {orden.ubicacion && <div className="text-xs text-gray-500 mt-0.5 truncate max-w-[140px]">📍 {orden.ubicacion}</div>}
                    </td>
                    <td className="px-3 py-3 hidden lg:table-cell">
                      <div className="text-sm text-gray-900 truncate max-w-[130px]">{orden.tipoServicio}</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {getTipoVisitaBadge(orden)}
                      </div>
                    </td>
                    <td className="px-3 py-3">{getEstadoBadge(orden.estado)}</td>
                    <td className="px-3 py-3 hidden xl:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div className="bg-corporate-blue h-2 rounded-full transition-all" style={{ width: `${orden.porcentajeAvance}%` }} />
                        </div>
                        <span className="text-xs text-gray-600 font-medium">{orden.porcentajeAvance}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-sm text-gray-900 font-medium truncate max-w-[100px]">{orden.tecnicoAsignado}</div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900 hidden lg:table-cell">
                      {orden.fechaVencimiento ? format(new Date(orden.fechaVencimiento), 'dd/MM/yyyy', { locale: es }) : '-'}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Link to={`/ordenes/${orden.id}`} className="text-corporate-blue hover:text-blue-700 bg-blue-50 hover:bg-blue-100 p-1.5 rounded transition-colors" title="Ver detalles">👁️</Link>
                        {(user?.role === 'supervisor' || user?.role === 'admin') && (
                          <button onClick={() => handleReasignarTecnico(orden)} className="text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 p-1.5 rounded transition-colors" title="Reasignar" disabled={isLoading}>👥</button>
                        )}
                        {user?.role === 'admin' && (
                          <>
                            <Link to={`/ordenes/${orden.id}/editar`} className="text-gray-600 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 p-1.5 rounded transition-colors" title="Editar">✏️</Link>
                            <button onClick={() => handleEliminarOrden(orden)} className="text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 p-1.5 rounded transition-colors" title="Eliminar" disabled={isDeleting || isLoading}>🗑️</button>
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

export default Ordenes