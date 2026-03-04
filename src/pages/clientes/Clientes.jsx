import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import useClientesStore from '../../stores/clientesStore'
import useAuthStore from '../../stores/authStore'
import useOrdenesStore from '../../stores/ordenesStore'
import notificationService from '../../services/notificationService'
import { canViewPrices } from '../../utils/permissionsUtils'

const Clientes = () => {
  const { user } = useAuthStore()
  const {
    clientes,
    isLoading,
    fetchClientes,
    searchClientes,
    getClientesPorCategoria,
    getClientesPorEstado,
    getEstadisticasClientes,
    cambiarEstadoCliente,
    actualizarCliente,
    inicializarDatos
  } = useClientesStore()

  const { ordenes } = useOrdenesStore()

  const [filtroCategoria, setFiltroCategoria] = useState('todos')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [vistaActual, setVistaActual] = useState('lista') // lista o tarjetas
  const [showModal, setShowModal] = useState(false)
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null)
  const [modalView, setModalView] = useState('detalles') // detalles, historial, editar
  const [formDataCliente, setFormDataCliente] = useState(null)

  useEffect(() => {
    inicializarDatos()
    fetchClientes()
  }, [inicializarDatos, fetchClientes])

  // Cerrar modal con tecla Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && showModal) {
        setShowModal(false)
        setClienteSeleccionado(null)
        setModalView('detalles')
        setFormDataCliente(null)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [showModal])

  const estadisticas = getEstadisticasClientes()

  // Aplicar filtros
  let clientesFiltrados = clientes

  if (busqueda) {
    clientesFiltrados = searchClientes(busqueda)
  }

  if (filtroCategoria !== 'todos') {
    clientesFiltrados = clientesFiltrados.filter(c => c.categoria === filtroCategoria)
  }

  if (filtroEstado !== 'todos') {
    clientesFiltrados = clientesFiltrados.filter(c => c.estado === filtroEstado)
  }

  const handleCambiarEstado = async (cliente) => {
    const nuevoEstado = cliente.estado === 'activo' ? 'inactivo' : 'activo'
    const result = await notificationService.confirm(
      '¿Cambiar estado?',
      `¿Cambiar el estado del cliente ${cliente.nombre} a ${nuevoEstado}?`,
      'Cambiar',
      'Cancelar'
    )
    
    if (result.isConfirmed) {
      await cambiarEstadoCliente(cliente.id, nuevoEstado)
      await notificationService.success('Estado actualizado', '', 2000)
    }
  }

  const getCategoriaColor = (categoria) => {
    const colores = {
      premium: 'bg-purple-100 text-purple-800',
      regular: 'bg-blue-100 text-blue-800',
      basico: 'bg-gray-100 text-gray-800'
    }
    return colores[categoria] || 'bg-gray-100 text-gray-800'
  }

  const getEstadoColor = (estado) => {
    return estado === 'activo' || estado === 'active'
      ? 'bg-green-100 text-green-800'
      : 'bg-red-100 text-red-800'
  }

  // Obtener órdenes del cliente seleccionado
  const getOrdenesCliente = () => {
    if (!clienteSeleccionado) return []
    return ordenes.filter(orden => orden.clienteId === clienteSeleccionado.id)
  }

  // Manejar vista de historial
  const handleVerHistorial = () => {
    setModalView('historial')
  }

  // Manejar vista de edición
  const handleEditarCliente = () => {
    setFormDataCliente({...clienteSeleccionado})
    setModalView('editar')
  }

  // Guardar cambios del cliente
  const handleGuardarCliente = async (e) => {
    e.preventDefault()

    // Validación de campos requeridos
    if (!formDataCliente.nombre || !formDataCliente.email || !formDataCliente.telefono || !formDataCliente.direccion) {
      await notificationService.error('Error de validación', 'Por favor complete todos los campos obligatorios')
      return
    }

    // Validación específica por tipo
    if (formDataCliente.tipo === 'empresa' && !formDataCliente.ruc) {
      await notificationService.error('Error de validación', 'El RUC es obligatorio para empresas')
      return
    }

    if (formDataCliente.tipo === 'persona' && !formDataCliente.dni) {
      await notificationService.error('Error de validación', 'El DNI es obligatorio para personas naturales')
      return
    }

    // Validación de formato RUC (11 dígitos)
    if (formDataCliente.tipo === 'empresa' && formDataCliente.ruc && !/^\d{11}$/.test(formDataCliente.ruc)) {
      await notificationService.error('Error de validación', 'El RUC debe tener 11 dígitos')
      return
    }

    // Validación de formato DNI (8 dígitos)
    if (formDataCliente.tipo === 'persona' && formDataCliente.dni && !/^\d{8}$/.test(formDataCliente.dni)) {
      await notificationService.error('Error de validación', 'El DNI debe tener 8 dígitos')
      return
    }

    console.log('🔄 Iniciando actualización de cliente:', {
      clienteId: clienteSeleccionado.id,
      datosEnviados: formDataCliente
    })

    try {
      const resultado = await actualizarCliente(clienteSeleccionado.id, formDataCliente)
      console.log('✅ Cliente actualizado exitosamente:', resultado)
      await notificationService.success('Cliente actualizado', '', 2000)
      setModalView('detalles')
      setClienteSeleccionado(resultado) // Usar resultado del backend en lugar de formData
      await fetchClientes() // Refrescar lista de clientes
    } catch (error) {
      console.error('❌ Error al actualizar cliente:', {
        error: error.message,
        stack: error.stack,
        clienteId: clienteSeleccionado.id,
        datosEnviados: formDataCliente
      })
      await notificationService.error('Error', `No se pudo actualizar el cliente: ${error.message}`)
    }
  }

  // Resetear modal
  const resetModal = () => {
    setShowModal(false)
    setClienteSeleccionado(null)
    setModalView('detalles')
    setFormDataCliente(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Cartera de Clientes</h1>
          <p className="text-gray-600">Gestiona y monitorea tu base de clientes</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setVistaActual('lista')}
              className={`px-3 py-1 rounded ${
                vistaActual === 'lista' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600'
              }`}
            >
              📋 Lista
            </button>
            <button
              onClick={() => setVistaActual('tarjetas')}
              className={`px-3 py-1 rounded ${
                vistaActual === 'tarjetas' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600'
              }`}
            >
              🎯 Tarjetas
            </button>
          </div>
          
          {user?.role !== 'supervisor' && (
            <Link to="/clientes/nuevo" className="btn-primary">
              + Nuevo Cliente
            </Link>
          )}
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card bg-blue-50 border-blue-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Clientes</p>
              <p className="text-xl sm:text-2xl font-bold text-blue-900">{estadisticas.total}</p>
            </div>
            <span className="text-3xl">👥</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card bg-green-50 border-green-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Activos</p>
              <p className="text-xl sm:text-2xl font-bold text-green-900">{estadisticas.activos}</p>
            </div>
            <span className="text-3xl">✅</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card bg-purple-50 border-purple-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Premium</p>
              <p className="text-xl sm:text-2xl font-bold text-purple-900">
                {estadisticas.clientesPorCategoria.premium}
              </p>
            </div>
            <span className="text-3xl">⭐</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card bg-orange-50 border-orange-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">Total Órdenes de trabajo</p>
              <p className="text-xl sm:text-2xl font-bold text-orange-900">{estadisticas.totalOrdenes}</p>
            </div>
            <span className="text-3xl">📋</span>
          </div>
        </motion.div>

        {canViewPrices(user) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="card bg-emerald-50 border-emerald-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-600">Facturación Total</p>
                <p className="text-xl sm:text-2xl font-bold text-emerald-900">
                  S/{estadisticas.totalFacturado.toLocaleString()}
                </p>
              </div>
              <span className="text-3xl">💰</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Filtros */}
      <div className="card">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div>
            <input
              type="text"
              placeholder="Buscar por nombre, email, RUC..."
              className="input-field"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          
          <div>
            <select
              className="input-field"
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
            >
              <option value="todos">Todas las categorías</option>
              <option value="premium">⭐ Premium</option>
              <option value="regular">🔵 Regular</option>
              <option value="basico">⚪ Básico</option>
            </select>
          </div>
          
          <div>
            <select
              className="input-field"
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
            >
              <option value="todos">Todos los estados</option>
              <option value="activo">✅ Activo</option>
              <option value="inactivo">❌ Inactivo</option>
            </select>
          </div>
          
          <div>
            <button
              onClick={() => {
                setBusqueda('')
                setFiltroCategoria('todos')
                setFiltroEstado('todos')
              }}
              className="btn-secondary w-full"
            >
              Limpiar filtros
            </button>
          </div>
        </div>
      </div>

      {/* Vista de Lista */}
      {vistaActual === 'lista' && (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Cliente</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Contacto</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Categoría</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Órdenes de trabajo</th>
                  {canViewPrices(user) && (
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Facturación</th>
                  )}
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Estado</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {clientesFiltrados.map((cliente) => (
                  <motion.tr
                    key={cliente.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-medium text-gray-900">{cliente.nombre}</p>
                        <p className="text-sm text-gray-500">
                          {cliente.tipo === 'empresa' ? `RUC: ${cliente.ruc}` : `DNI: ${cliente.dni}`}
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm">
                        <p className="text-gray-900">{cliente.email}</p>
                        <p className="text-gray-500">{cliente.telefono}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getCategoriaColor(cliente.categoria)}`}>
                        {cliente.categoria}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm">
                        <p className="font-medium">{cliente.totalOrdenes}</p>
                        <p className="text-gray-500">{cliente.ordenesActivas} activas</p>
                      </div>
                    </td>
                    {canViewPrices(user) && (
                      <td className="py-4 px-4">
                        <p className="font-semibold text-green-600">
                          S/{cliente.montoTotal?.toLocaleString() || 0}
                        </p>
                      </td>
                    )}
                    <td className="py-4 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getEstadoColor(cliente.estado)}`}>
                        {cliente.estado}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <button
                        onClick={() => {
                          setClienteSeleccionado(cliente)
                          setShowModal(true)
                        }}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                      >
                        Ver detalles
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            
            {clientesFiltrados.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No se encontraron clientes con los filtros aplicados</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Vista de Tarjetas */}
      {vistaActual === 'tarjetas' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
          {clientesFiltrados.map((cliente) => (
            <motion.div
              key={cliente.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="card hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => {
                setClienteSeleccionado(cliente)
                setShowModal(true)
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{cliente.nombre}</h3>
                  <p className="text-sm text-gray-500">
                    {cliente.tipo === 'empresa' ? cliente.ruc : cliente.dni}
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoriaColor(cliente.categoria)}`}>
                    {cliente.categoria}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEstadoColor(cliente.estado)}`}>
                    {cliente.estado}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-sm">
                  <p className="text-gray-500">Contacto</p>
                  <p className="text-gray-900">{cliente.email}</p>
                  <p className="text-gray-900">{cliente.telefono}</p>
                </div>

                {cliente.contactoPrincipal && (
                  <div className="text-sm">
                    <p className="text-gray-500">Contacto Principal</p>
                    <p className="text-gray-900">{cliente.contactoPrincipal.nombre}</p>
                    <p className="text-gray-600 text-xs">{cliente.contactoPrincipal.cargo}</p>
                  </div>
                )}

                <div className={`grid ${canViewPrices(user) ? 'grid-cols-3' : 'grid-cols-2'} gap-3 pt-3 border-t`}>
                  <div className="text-center">
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">{cliente.totalOrdenes}</p>
                    <p className="text-xs text-gray-500">Órdenes de trabajo</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl sm:text-2xl font-bold text-orange-600">{cliente.ordenesActivas}</p>
                    <p className="text-xs text-gray-500">Activas</p>
                  </div>
                  {canViewPrices(user) && (
                    <div className="text-center">
                      <p className="text-lg font-bold text-green-600">
                        S/{cliente.montoTotal?.toLocaleString() || 0}
                      </p>
                      <p className="text-xs text-gray-500">Total</p>
                    </div>
                  )}
                </div>

                {cliente.ultimaOrden && (
                  <p className="text-xs text-gray-500 text-center pt-2">
                    Última orden: {new Date(cliente.ultimaOrden).toLocaleDateString()}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Top 5 Clientes */}
      {canViewPrices(user) && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Top 5 Clientes por Facturación
          </h3>
          <div className="space-y-3">
            {estadisticas.topClientes.map((cliente, index) => (
              <div key={cliente.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl sm:text-2xl font-bold text-gray-400">#{index + 1}</span>
                  <div>
                    <p className="font-medium text-gray-900">{cliente.nombre}</p>
                    <p className="text-sm text-gray-500">
                      {cliente.totalOrdenes} órdenes • {cliente.categoria}
                    </p>
                  </div>
                </div>
                <p className="text-lg font-semibold text-green-600">
                  S/{cliente.montoTotal?.toLocaleString() || 0}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de detalles */}
      {showModal && clienteSeleccionado && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={resetModal}
        >
          <div
            className="bg-white rounded-lg w-full max-w-[95vw] sm:max-w-2xl md:max-w-4xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  Detalles del Cliente
                </h3>
                <button
                  onClick={resetModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {/* VISTA: DETALLES */}
              {modalView === 'detalles' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
                {/* Información básica */}
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Información General</h4>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div>
                        <p className="text-sm text-gray-500">Nombre</p>
                        <p className="font-medium">{clienteSeleccionado.nombre}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">
                          {clienteSeleccionado.tipo === 'empresa' ? 'RUC' : 'DNI'}
                        </p>
                        <p className="font-medium">
                          {clienteSeleccionado.tipo === 'empresa' 
                            ? clienteSeleccionado.ruc 
                            : clienteSeleccionado.dni}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Dirección</p>
                        <p className="font-medium">{clienteSeleccionado.direccion}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Fecha de Registro</p>
                        <p className="font-medium">
                          {new Date(clienteSeleccionado.fechaRegistro).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Contacto</h4>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-medium">{clienteSeleccionado.email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Teléfono</p>
                        <p className="font-medium">{clienteSeleccionado.telefono}</p>
                      </div>
                      
                      {clienteSeleccionado.contactoPrincipal && (
                        <>
                          <hr className="my-3" />
                          <div>
                            <p className="text-sm text-gray-500">Contacto Principal</p>
                            <p className="font-medium">
                              {clienteSeleccionado.contactoPrincipal.nombre}
                            </p>
                            <p className="text-sm text-gray-600">
                              {clienteSeleccionado.contactoPrincipal.cargo}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Email Directo</p>
                            <p className="font-medium">
                              {clienteSeleccionado.contactoPrincipal.email}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Móvil</p>
                            <p className="font-medium">
                              {clienteSeleccionado.contactoPrincipal.telefono}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Estadísticas y notas */}
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Estadísticas</h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div className="text-center p-3 bg-white rounded-lg">
                          <p className="text-3xl font-bold text-gray-900">
                            {clienteSeleccionado.totalOrdenes}
                          </p>
                          <p className="text-sm text-gray-500">Total Órdenes de trabajo</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg">
                          <p className="text-3xl font-bold text-orange-600">
                            {clienteSeleccionado.ordenesActivas}
                          </p>
                          <p className="text-sm text-gray-500">Órdenes de trabajo Activas</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg">
                          <p className="text-3xl font-bold text-green-600">
                            {clienteSeleccionado.ordenesCompletadas}
                          </p>
                          <p className="text-sm text-gray-500">Completadas</p>
                        </div>
                        {canViewPrices(user) && (
                          <div className="text-center p-3 bg-white rounded-lg">
                            <p className="text-xl sm:text-2xl font-bold text-blue-600">
                              S/{clienteSeleccionado.montoTotal?.toLocaleString() || 0}
                            </p>
                            <p className="text-sm text-gray-500">Facturación Total</p>
                          </div>
                        )}
                      </div>
                      
                      {clienteSeleccionado.ultimaOrden && (
                        <div className="mt-4 pt-4 border-t">
                          <p className="text-sm text-gray-500">Última orden</p>
                          <p className="font-medium">
                            {new Date(clienteSeleccionado.ultimaOrden).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Clasificación</h4>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-500">Categoría</p>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          getCategoriaColor(clienteSeleccionado.categoria)
                        }`}>
                          {clienteSeleccionado.categoria}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-500">Estado</p>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          getEstadoColor(clienteSeleccionado.estado)
                        }`}>
                          {clienteSeleccionado.estado}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-500">Tipo</p>
                        <span className="font-medium capitalize">
                          {clienteSeleccionado.tipo}
                        </span>
                      </div>
                    </div>
                  </div>

                  {clienteSeleccionado.notas && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Notas</h4>
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <p className="text-sm text-amber-800">
                          {clienteSeleccionado.notas}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              )}

              {/* VISTA: HISTORIAL DE ÓRDENES */}
              {modalView === 'historial' && (
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 mb-4">
                    Historial de Órdenes de Trabajo - {clienteSeleccionado.nombre}
                  </h4>

                  {getOrdenesCliente().length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <p className="text-gray-500">No hay órdenes registradas para este cliente</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {getOrdenesCliente().map((orden) => (
                        <div key={orden.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="font-mono text-sm font-medium text-blue-600">
                                  {orden.id}
                                </span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  (orden.estado === 'completada' || orden.estado === 'completed') ? 'bg-green-100 text-green-800' :
                                  (orden.estado === 'en_proceso' || orden.estado === 'in_progress') ? 'bg-blue-100 text-blue-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {orden.estado === 'completed' ? 'Completada' :
                                   orden.estado === 'in_progress' ? 'En Proceso' :
                                   orden.estado === 'pending' ? 'Pendiente' :
                                   orden.estado}
                                </span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  orden.prioridad === 'alta' ? 'bg-red-100 text-red-800' :
                                  orden.prioridad === 'media' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {orden.prioridad}
                                </span>
                              </div>
                              <p className="font-medium text-gray-900 mb-1">
                                {orden.nombreProyecto || orden.tipoServicio}
                              </p>
                              <p className="text-sm text-gray-600 mb-2">
                                {orden.descripcion}
                              </p>
                              <div className="flex items-center gap-4 text-sm text-gray-500">
                                <span>👷 {orden.tecnicoAsignado}</span>
                                <span>📅 {new Date(orden.fechaCreacion).toLocaleDateString()}</span>
                                {orden.fechaVencimiento && (
                                  <span>⏰ Vence: {new Date(orden.fechaVencimiento).toLocaleDateString()}</span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              {canViewPrices(user) && orden.costoEstimado && (
                                <p className="text-lg font-bold text-green-600">
                                  S/ {orden.costoEstimado.toLocaleString()}
                                </p>
                              )}
                              {orden.porcentajeAvance !== undefined && (
                                <p className="text-sm text-gray-500 mt-1">
                                  {orden.porcentajeAvance}% completado
                                </p>
                              )}
                              <Link
                                to={`/ordenes/${orden.id}`}
                                className="text-blue-600 hover:text-blue-800 text-sm mt-2 inline-block"
                                onClick={resetModal}
                              >
                                Ver detalles →
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-600 font-medium">Resumen del Cliente</p>
                        <p className="text-xs text-blue-500 mt-1">
                          Total de órdenes: {getOrdenesCliente().length}
                        </p>
                      </div>
                      {canViewPrices(user) && (
                        <div className="text-right">
                          <p className="text-lg font-bold text-blue-900">
                            S/ {clienteSeleccionado.montoTotal?.toLocaleString() || 0}
                          </p>
                          <p className="text-xs text-blue-600">Facturación total</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* VISTA: EDITAR CLIENTE */}
              {modalView === 'editar' && formDataCliente && (
                <form onSubmit={handleGuardarCliente} className="space-y-6">
                  {/* Tipo de cliente */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Tipo de Cliente
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <button
                        type="button"
                        onClick={() => setFormDataCliente({
                          ...formDataCliente,
                          tipo: 'empresa'
                        })}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          formDataCliente.tipo === 'empresa'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="text-2xl mb-2 block">🏢</span>
                        <p className="font-medium text-gray-900">Empresa</p>
                        <p className="text-sm text-gray-500">Persona jurídica con RUC</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const newFormData = {
                            ...formDataCliente,
                            tipo: 'persona'
                          }
                          // Limpiar contactoPrincipal al cambiar a persona
                          delete newFormData.contactoPrincipal
                          setFormDataCliente(newFormData)
                        }}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          formDataCliente.tipo === 'persona'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="text-2xl mb-2 block">👤</span>
                        <p className="font-medium text-gray-900">Persona Natural</p>
                        <p className="text-sm text-gray-500">Persona natural con DNI</p>
                      </button>
                    </div>
                  </div>

                  {/* Información básica */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Información Básica
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {formDataCliente.tipo === 'empresa' ? 'Razón Social' : 'Nombre Completo'} *
                        </label>
                        <input
                          type="text"
                          className="input-field"
                          value={formDataCliente.nombre}
                          onChange={(e) => setFormDataCliente({...formDataCliente, nombre: e.target.value})}
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {formDataCliente.tipo === 'empresa' ? 'RUC' : 'DNI'} *
                        </label>
                        <input
                          type="text"
                          className="input-field"
                          value={formDataCliente.tipo === 'empresa' ? (formDataCliente.ruc || '') : (formDataCliente.dni || '')}
                          onChange={(e) => setFormDataCliente({
                            ...formDataCliente,
                            [formDataCliente.tipo === 'empresa' ? 'ruc' : 'dni']: e.target.value
                          })}
                          placeholder={formDataCliente.tipo === 'empresa' ? '20123456789' : '12345678'}
                          maxLength={formDataCliente.tipo === 'empresa' ? 11 : 8}
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Categoría *
                        </label>
                        <select
                          className="input-field"
                          value={formDataCliente.categoria}
                          onChange={(e) => setFormDataCliente({...formDataCliente, categoria: e.target.value})}
                          required
                        >
                          <option value="premium">⭐ Premium</option>
                          <option value="regular">🔵 Regular</option>
                          <option value="basico">⚪ Básico</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Información de contacto */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Información de Contacto
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email *
                        </label>
                        <input
                          type="email"
                          className="input-field"
                          value={formDataCliente.email}
                          onChange={(e) => setFormDataCliente({...formDataCliente, email: e.target.value})}
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Teléfono *
                        </label>
                        <input
                          type="text"
                          className="input-field"
                          value={formDataCliente.telefono}
                          onChange={(e) => setFormDataCliente({...formDataCliente, telefono: e.target.value})}
                          placeholder="01-1234567 o 999888777"
                          required
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Dirección *
                        </label>
                        <input
                          type="text"
                          className="input-field"
                          value={formDataCliente.direccion}
                          onChange={(e) => setFormDataCliente({...formDataCliente, direccion: e.target.value})}
                          placeholder="Av. Principal 123, Distrito, Ciudad"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Contacto principal (solo para empresas) */}
                  {formDataCliente.tipo === 'empresa' && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Contacto Principal (Opcional)
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nombre del Contacto
                          </label>
                          <input
                            type="text"
                            className="input-field"
                            value={formDataCliente.contactoPrincipal?.nombre || ''}
                            onChange={(e) => setFormDataCliente({
                              ...formDataCliente,
                              contactoPrincipal: {
                                ...formDataCliente.contactoPrincipal,
                                nombre: e.target.value
                              }
                            })}
                            placeholder="Juan Pérez"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Cargo
                          </label>
                          <input
                            type="text"
                            className="input-field"
                            value={formDataCliente.contactoPrincipal?.cargo || ''}
                            onChange={(e) => setFormDataCliente({
                              ...formDataCliente,
                              contactoPrincipal: {
                                ...formDataCliente.contactoPrincipal,
                                cargo: e.target.value
                              }
                            })}
                            placeholder="Gerente de Operaciones"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email del Contacto
                          </label>
                          <input
                            type="email"
                            className="input-field"
                            value={formDataCliente.contactoPrincipal?.email || ''}
                            onChange={(e) => setFormDataCliente({
                              ...formDataCliente,
                              contactoPrincipal: {
                                ...formDataCliente.contactoPrincipal,
                                email: e.target.value
                              }
                            })}
                            placeholder="contacto@empresa.com"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Teléfono del Contacto
                          </label>
                          <input
                            type="text"
                            className="input-field"
                            value={formDataCliente.contactoPrincipal?.telefono || ''}
                            onChange={(e) => setFormDataCliente({
                              ...formDataCliente,
                              contactoPrincipal: {
                                ...formDataCliente.contactoPrincipal,
                                telefono: e.target.value
                              }
                            })}
                            placeholder="999888777"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Información adicional */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Información Adicional
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Estado *
                        </label>
                        <select
                          className="input-field"
                          value={formDataCliente.estado}
                          onChange={(e) => setFormDataCliente({...formDataCliente, estado: e.target.value})}
                          required
                        >
                          <option value="activo">Activo</option>
                          <option value="inactivo">Inactivo</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Notas (Opcional)
                        </label>
                        <textarea
                          className="input-field"
                          rows={3}
                          value={formDataCliente.notas || ''}
                          onChange={(e) => setFormDataCliente({...formDataCliente, notas: e.target.value})}
                          placeholder="Información relevante sobre el cliente, preferencias, requisitos especiales..."
                        />
                      </div>
                    </div>
                  </div>
                </form>
              )}

              {/* Botones de acción */}
              <div className="mt-6 flex flex-col-reverse sm:flex-row justify-end gap-3">
                {modalView === 'detalles' && (
                  <>
                    <button
                      onClick={handleVerHistorial}
                      className="btn-secondary"
                    >
                      📋 Ver Historial de Órdenes
                    </button>
                    <button
                      onClick={handleEditarCliente}
                      className="btn-primary"
                    >
                      ✏️ Editar Cliente
                    </button>
                  </>
                )}

                {modalView === 'historial' && (
                  <button
                    onClick={() => setModalView('detalles')}
                    className="btn-secondary"
                  >
                    ← Volver a Detalles
                  </button>
                )}

                {modalView === 'editar' && (
                  <>
                    <button
                      onClick={() => setModalView('detalles')}
                      className="btn-secondary"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleGuardarCliente}
                      className="btn-primary"
                    >
                      💾 Guardar Cambios
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Clientes