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
      alta: 'text-red-600'
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Órdenes de Trabajo</h1>
          <p className="text-gray-600">Gestión de órdenes de mantenimiento</p>
        </div>
        {(user?.role === 'admin' || user?.role === 'supervisor') && (
          <Link
            to="/ordenes/nueva"
            className="btn-primary"
          >
            ➕ Nueva Orden
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="card">
        <div className={`grid grid-cols-1 ${user?.role === 'tecnico' ? 'md:grid-cols-6' : 'md:grid-cols-7'} gap-4`}>
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

      {/* Orders Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID / Prioridad
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  OC
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente / Ubicación
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Servicio / Visita
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progreso
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Técnico
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vencimiento
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ordenes.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="text-6xl">📋</div>
                      <div className="text-lg font-semibold text-gray-900">
                        No se encontraron órdenes de trabajo
                      </div>
                      <div className="text-sm text-gray-600">
                        {user?.role === 'tecnico'
                          ? 'No tienes órdenes asignadas en este momento'
                          : 'No hay órdenes que coincidan con los filtros seleccionados'}
                      </div>
                      {(user?.role === 'admin' || user?.role === 'supervisor') && (
                        <Link
                          to="/ordenes/nueva"
                          className="btn-primary mt-4"
                        >
                          ➕ Crear Primera Orden
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                ordenes.map((orden) => (
                  <tr key={orden.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="text-sm font-semibold text-gray-900">
                      {orden.id}
                    </div>
                    <div className={`text-xs mt-0.5 font-medium ${getPrioridadColor(orden.prioridad)}`}>
                      {orden.prioridad === 'alta' ? '🔴' : orden.prioridad === 'media' ? '🟡' : '🟢'} {orden.prioridad.charAt(0).toUpperCase() + orden.prioridad.slice(1)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {orden.numeroOrdenCompra ? (
                      <div className="text-sm font-medium text-gray-900">
                        {orden.numeroOrdenCompra}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400 italic">
                        -
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">{orden.cliente}</div>
                    {orden.ubicacion && (
                      <div className="text-xs text-gray-500 mt-0.5 truncate max-w-[160px]" title={orden.ubicacion}>
                        📍 {orden.ubicacion}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-900 truncate max-w-[150px]" title={orden.tipoServicio}>
                      {orden.tipoServicio}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {getTipoVisitaBadge(orden)}
                      {!orden.basadoEnVisitaTecnica && orden.tipoVisita === 'sin_visita' && !puedesolicitarMateriales(orden).permitido && (
                        <div className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded" title="Sin acceso a materiales">
                          ⚠️
                        </div>
                      )}
                      {!puedeSubirFotos(orden).permitido && (
                        <div className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded" title="Fotos bloqueadas">
                          📸
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {getEstadoBadge(orden.estado)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-corporate-blue h-2 rounded-full transition-all"
                          style={{ width: `${orden.porcentajeAvance}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600 font-medium min-w-[32px]">
                        {orden.porcentajeAvance}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-900 font-medium truncate max-w-[120px]" title={orden.tecnicoAsignado}>
                      {orden.tecnicoAsignado}
                    </div>
                    {orden.fechaReasignacion && (
                      <div className="text-[10px] text-orange-600 flex items-center gap-0.5 mt-0.5">
                        🔄 {orden.fechaReasignacion}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {orden.fechaVencimiento ? format(new Date(orden.fechaVencimiento), 'dd/MM/yyyy', { locale: es }) : '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <Link
                        to={`/ordenes/${orden.id}`}
                        className="text-corporate-blue hover:text-blue-700 bg-blue-50 hover:bg-blue-100 p-2 rounded transition-colors"
                        title="Ver detalles"
                      >
                        👁️
                      </Link>

                      {(user?.role === 'supervisor' || user?.role === 'admin') && (
                        <button
                          onClick={() => handleReasignarTecnico(orden)}
                          className="text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 p-2 rounded transition-colors"
                          title="Reasignar técnico"
                          disabled={isLoading}
                        >
                          👥
                        </button>
                      )}

                      {user?.role === 'admin' && (
                        <>
                          <Link
                            to={`/ordenes/${orden.id}/editar`}
                            className="text-gray-600 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 p-2 rounded transition-colors"
                            title="Editar orden"
                          >
                            ✏️
                          </Link>
                          <button
                            onClick={() => handleEliminarOrden(orden)}
                            className="text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded transition-colors"
                            title="Eliminar orden"
                            disabled={isDeleting || isLoading}
                          >
                            🗑️
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

export default Ordenes