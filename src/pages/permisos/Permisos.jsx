import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import useAuthStore from '../../stores/authStore'
import usePermisosStore from '../../stores/permisosStore'
import notificationService from '../../services/notificationService'
import { ROLES, isTecnico, isAdminOrSupervisor, getRoleDisplayName } from '../../utils/roleUtils'

const Permisos = () => {
  const { user, getAllUsers } = useAuthStore()
  const {
    permisos,
    isLoading,
    crearPermiso,
    aprobarPermiso,
    rechazarPermiso,
    agregarArchivoAdjunto,
    obtenerEstadisticas,
    inicializarDatos
  } = usePermisosStore()

  const [usuariosDisponibles, setUsuariosDisponibles] = useState([])
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [permisoSeleccionado, setPermisoSeleccionado] = useState(null)
  const [formData, setFormData] = useState({
    empleadoId: '',
    empleadoNombre: '',
    tipoPermiso: 'vacaciones',
    fechaInicio: '',
    fechaFin: '',
    motivo: '',
    documentacionAdjunta: ''
  })

  useEffect(() => {
    const loadData = async () => {
      await inicializarDatos()
      const users = await getAllUsers()
      setUsuariosDisponibles(users || [])
    }
    loadData()
  }, [inicializarDatos, getAllUsers])

  const estadisticas = obtenerEstadisticas()

  // Filtrar permisos según el rol del usuario
  const permisosFiltrados = (permisos || []).filter(permiso => {
    // Los técnicos solo pueden ver sus propios permisos
    if (isTecnico(user)) {
      const matchUsuario = permiso.empleadoId === user.id || permiso.empleadoNombre === user.name
      if (!matchUsuario) return false
    }

    const matchEstado = filtroEstado === 'todos' || permiso.estado === filtroEstado
    const matchTipo = filtroTipo === 'todos' || permiso.tipoPermiso === filtroTipo
    const matchBusqueda = busqueda === '' ||
      (permiso.empleadoNombre && permiso.empleadoNombre.toLowerCase().includes(busqueda.toLowerCase())) ||
      (permiso.id && permiso.id.toString().toLowerCase().includes(busqueda.toLowerCase()))

    return matchEstado && matchTipo && matchBusqueda
  })

  const handleNuevoPermiso = () => {
    setFormData({
      empleadoId: user?.id || '',
      empleadoNombre: user?.name || '',
      tipoPermiso: 'vacaciones',
      fechaInicio: '',
      fechaFin: '',
      motivo: '',
      documentacionAdjunta: ''
    })
    setShowModal(true)
  }

  const handleEmpleadoChange = (empleadoId) => {
    const empleadoSeleccionado = usuariosDisponibles.find(u => u.id.toString() === empleadoId)
    setFormData({
      ...formData,
      empleadoId: empleadoId,
      empleadoNombre: empleadoSeleccionado ? empleadoSeleccionado.name : ''
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      const diasSolicitados = calcularDias(formData.fechaInicio, formData.fechaFin)
      
      await crearPermiso({
        ...formData,
        empleadoId: user?.id || 'EMP-' + Date.now(),
        diasSolicitados
      })
      
      await notificationService.success(
        'Permiso solicitado',
        'Tu solicitud ha sido enviada para aprobación',
        2000
      )
      
      setShowModal(false)
    } catch (error) {
      await notificationService.error('Error', 'No se pudo crear la solicitud')
    }
  }

  const handleAprobar = async (permiso) => {
    const result = await notificationService.confirm(
      '¿Aprobar permiso?',
      `¿Aprobar el permiso de ${permiso.empleadoNombre}?`,
      'Aprobar',
      'Cancelar'
    )
    
    if (result.isConfirmed) {
      await aprobarPermiso(permiso.id, user.name)
      await notificationService.success('Permiso aprobado', '', 2000)
    }
  }

  const handleRechazar = async (permiso) => {
    const { value: motivo } = await notificationService.html(
      'Rechazar permiso',
      `
        <div class="text-left">
          <p class="mb-3">¿Por qué rechazas el permiso de <strong>${permiso.empleadoNombre}</strong>?</p>
          <textarea 
            id="motivo-rechazo" 
            class="w-full p-3 border border-gray-300 rounded-lg" 
            rows="3" 
            placeholder="Motivo del rechazo..."
          ></textarea>
        </div>
      `,
      'warning'
    )
    
    if (motivo) {
      const motivoRechazo = document.getElementById('motivo-rechazo').value
      if (motivoRechazo) {
        await rechazarPermiso(permiso.id, user.name, motivoRechazo)
        await notificationService.success('Permiso rechazado', '', 2000)
      }
    }
  }

  const handleVerDetalles = (permiso) => {
    console.log('🔍 Ver detalles - Permiso completo:', permiso)
    console.log('🔍 archivosAdjuntos:', permiso.archivosAdjuntos)
    console.log('🔍 es Array?:', Array.isArray(permiso.archivosAdjuntos))
    if (permiso.archivosAdjuntos) {
      console.log('🔍 Contenido archivos:', permiso.archivosAdjuntos.map((a, i) => ({
        index: i,
        tipo: typeof a,
        esObjeto: typeof a === 'object',
        keys: Object.keys(a || {}),
        valor: a
      })))
    }
    setPermisoSeleccionado(permiso)
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (file) {
      // En producción, aquí subirías el archivo a un servidor
      // Por ahora simulamos la carga
      const fileInfo = {
        nombre: file.name,
        tipo: file.type,
        tamaño: (file.size / 1024).toFixed(2) + 'KB',
        url: URL.createObjectURL(file)
      }
      
      if (permisoSeleccionado) {
        await agregarArchivoAdjunto(permisoSeleccionado.id, fileInfo)
        await notificationService.success('Archivo adjuntado', '', 1000)
      }
    }
  }

  const calcularDias = (fechaInicio, fechaFin) => {
    const inicio = new Date(fechaInicio)
    const fin = new Date(fechaFin)
    const diferencia = fin - inicio
    return Math.ceil(diferencia / (1000 * 60 * 60 * 24)) + 1
  }

  const getEstadoBadge = (estado) => {
    const estilos = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    }

    const textos = {
      pending: 'Pendiente',
      approved: 'Aprobado',
      rejected: 'Rechazado'
    }

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${estilos[estado]}`}>
        {textos[estado]}
      </span>
    )
  }

  const getTipoIcon = (tipo) => {
    const icons = {
      vacaciones: '🏖️',
      medico: '🏥',
      personal: '👤',
      otros: '📋'
    }
    return icons[tipo] || '📋'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          {isTecnico(user) ? (
            <>
              <h1 className="text-2xl font-bold text-gray-900">Mis Permisos</h1>
              <p className="text-gray-600">Gestiona tus solicitudes de permisos y descansos</p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900">Gestión de Permisos</h1>
              <p className="text-gray-600">Administra las solicitudes de permisos del personal</p>
            </>
          )}
        </div>

        <button
          onClick={handleNuevoPermiso}
          className="btn-primary"
        >
          {isTecnico(user) ? '+ Solicitar Permiso' : '+ Nueva Solicitud'}
        </button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card bg-blue-50 border-blue-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Solicitudes</p>
              <p className="text-2xl font-bold text-blue-900">{estadisticas.total}</p>
            </div>
            <span className="text-3xl">📊</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card bg-yellow-50 border-yellow-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600">Pendientes</p>
              <p className="text-2xl font-bold text-yellow-900">{estadisticas.pendientes}</p>
            </div>
            <span className="text-3xl">⏳</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card bg-green-50 border-green-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Aprobados</p>
              <p className="text-2xl font-bold text-green-900">{estadisticas.aprobados}</p>
            </div>
            <span className="text-3xl">✅</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card bg-red-50 border-red-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Rechazados</p>
              <p className="text-2xl font-bold text-red-900">{estadisticas.rechazados}</p>
            </div>
            <span className="text-3xl">❌</span>
          </div>
        </motion.div>
      </div>

      {/* Filtros */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <input
              type="text"
              placeholder={isTecnico(user) ? "Buscar por ID de permiso..." : "Buscar por empleado o ID..."}
              className="input-field"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          
          <div>
            <select
              className="input-field"
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
            >
              <option value="todos">Todos los estados</option>
              <option value="pending">Pendientes</option>
              <option value="approved">Aprobados</option>
              <option value="rejected">Rechazados</option>
            </select>
          </div>
          
          <div>
            <select
              className="input-field"
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
            >
              <option value="todos">Todos los tipos</option>
              <option value="vacaciones">Vacaciones</option>
              <option value="medico">Médico</option>
              <option value="personal">Personal</option>
              <option value="otros">Otros</option>
            </select>
          </div>
          
          <div>
            <button
              onClick={() => {
                setBusqueda('')
                setFiltroEstado('todos')
                setFiltroTipo('todos')
              }}
              className="btn-secondary w-full"
            >
              Limpiar filtros
            </button>
          </div>
        </div>
      </div>

      {/* Lista de permisos */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-700">ID</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Empleado</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Tipo</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Fechas</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Días</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Estado</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Documentos</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {permisosFiltrados.map((permiso) => (
                <motion.tr
                  key={permiso.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-gray-50"
                >
                  <td className="py-4 px-4">
                    <span className="font-mono text-sm">{permiso.id}</span>
                  </td>
                  <td className="py-4 px-4">{permiso.empleadoNombre}</td>
                  <td className="py-4 px-4">
                    <span className="flex items-center gap-2">
                      <span className="text-xl">{getTipoIcon(permiso.tipoPermiso)}</span>
                      <span className="capitalize">{permiso.tipoPermiso}</span>
                    </span>
                  </td>
                  <td className="py-4 px-4 text-sm">
                    {permiso.fechaInicio} - {permiso.fechaFin}
                  </td>
                  <td className="py-4 px-4">
                    <span className="font-medium">{permiso.diasSolicitados || 1}</span>
                  </td>
                  <td className="py-4 px-4">
                    {getEstadoBadge(permiso.estado)}
                  </td>
                  <td className="py-4 px-4">
                    {permiso.archivosAdjuntos?.length > 0 && (
                      <span className="flex items-center gap-1 text-blue-600">
                        📎 {permiso.archivosAdjuntos.length}
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleVerDetalles(permiso)}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                      >
                        Ver detalles
                      </button>
                      
                      {permiso.estado === 'pending' && isAdminOrSupervisor(user) && (
                        <>
                          <span className="text-gray-300">|</span>
                          <button
                            onClick={() => handleAprobar(permiso)}
                            className="text-green-600 hover:text-green-800 font-medium text-sm"
                          >
                            Aprobar
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            onClick={() => handleRechazar(permiso)}
                            className="text-red-600 hover:text-red-800 font-medium text-sm"
                          >
                            Rechazar
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          
          {permisosFiltrados.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No se encontraron permisos con los filtros aplicados</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de nuevo permiso */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Nueva Solicitud de Permiso
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo de Permiso
                    </label>
                    <select
                      className="input-field"
                      value={formData.tipoPermiso}
                      onChange={(e) => setFormData({ ...formData, tipoPermiso: e.target.value })}
                      required
                    >
                      <option value="vacaciones">🏖️ Vacaciones</option>
                      <option value="medico">🏥 Médico</option>
                      <option value="personal">👤 Personal</option>
                      <option value="otros">📋 Otros</option>
                    </select>
                  </div>
                  
                  {user?.role !== 'tecnico' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Empleado
                      </label>
                      <select
                        className="input-field"
                        value={formData.empleadoId}
                        onChange={(e) => handleEmpleadoChange(e.target.value)}
                        required
                      >
                        <option value="">Seleccionar empleado...</option>
                        {usuariosDisponibles.map((usuario) => (
                          <option key={usuario.id} value={usuario.id}>
                            {usuario.name} - {getRoleDisplayName(usuario.role)}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-500">
                        👥 Seleccione el empleado para quien se solicita el permiso
                      </p>
                    </div>
                  )}

                  {isTecnico(user) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Solicitante
                      </label>
                      <input
                        type="text"
                        className="input-field bg-gray-100"
                        value={user?.name || ''}
                        readOnly
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        👤 Estas solicitando el permiso para ti mismo
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha Inicio
                    </label>
                    <input
                      type="date"
                      className="input-field"
                      value={formData.fechaInicio}
                      onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha Fin
                    </label>
                    <input
                      type="date"
                      className="input-field"
                      value={formData.fechaFin}
                      onChange={(e) => setFormData({ ...formData, fechaFin: e.target.value })}
                      min={formData.fechaInicio}
                      required
                    />
                  </div>
                </div>
                
                {formData.fechaInicio && formData.fechaFin && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      Total de días solicitados: <strong>{calcularDias(formData.fechaInicio, formData.fechaFin)}</strong>
                    </p>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Motivo
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.motivo}
                    onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                    placeholder="Breve descripción del motivo..."
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Documentación / Justificación Detallada
                  </label>
                  <textarea
                    className="input-field"
                    rows="4"
                    value={formData.documentacionAdjunta}
                    onChange={(e) => setFormData({ ...formData, documentacionAdjunta: e.target.value })}
                    placeholder="Proporcione detalles adicionales, justificación o información relevante para su solicitud..."
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Esta información ayudará a evaluar su solicitud de manera más efectiva
                  </p>
                </div>
                
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-amber-800 mb-2">
                    📎 Archivos Adjuntos
                  </h4>
                  <p className="text-sm text-amber-700 mb-3">
                    Puede adjuntar documentos después de crear la solicitud (certificados médicos, comprobantes, etc.)
                  </p>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="btn-secondary"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Creando...' : 'Crear Solicitud'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de detalles */}
      {permisoSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Detalles del Permiso {permisoSeleccionado.id}
                </h3>
                <button
                  onClick={() => setPermisoSeleccionado(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Empleado</p>
                      <p className="text-gray-900">{permisoSeleccionado.empleadoNombre}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Tipo de Permiso</p>
                      <p className="text-gray-900 flex items-center gap-2">
                        <span className="text-xl">{getTipoIcon(permisoSeleccionado.tipoPermiso)}</span>
                        <span className="capitalize">{permisoSeleccionado.tipoPermiso}</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Periodo</p>
                      <p className="text-gray-900">
                        {permisoSeleccionado.fechaInicio} - {permisoSeleccionado.fechaFin}
                        <span className="ml-2 text-sm text-gray-600">
                          ({permisoSeleccionado.diasSolicitados || 1} días)
                        </span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Estado</p>
                      <p>{getEstadoBadge(permisoSeleccionado.estado)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Fecha de Solicitud</p>
                      <p className="text-gray-900">
                        {permisoSeleccionado.fechaSolicitud
                          ? new Date(permisoSeleccionado.fechaSolicitud).toLocaleDateString()
                          : 'No disponible'}
                      </p>
                    </div>
                    {permisoSeleccionado.estado === 'approved' && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">Aprobado por</p>
                        <p className="text-gray-900">{permisoSeleccionado.aprobadoPor}</p>
                      </div>
                    )}
                    {permisoSeleccionado.estado === 'rejected' && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">Rechazado por</p>
                        <p className="text-gray-900">{permisoSeleccionado.rechazadoPor}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Motivo</p>
                  <p className="text-gray-900">{permisoSeleccionado.motivo}</p>
                </div>
                
                {permisoSeleccionado.documentacionAdjunta && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Documentación / Justificación</p>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <p className="text-gray-700 whitespace-pre-wrap">
                        {permisoSeleccionado.documentacionAdjunta}
                      </p>
                    </div>
                  </div>
                )}
                
                {permisoSeleccionado.estado === 'rejected' && permisoSeleccionado.motivoRechazo && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Motivo de Rechazo</p>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-red-800">{permisoSeleccionado.motivoRechazo}</p>
                    </div>
                  </div>
                )}
                
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-gray-500">Archivos Adjuntos</p>
                    {permisoSeleccionado.estado === 'pending' && (
                      <label className="btn-secondary text-sm cursor-pointer">
                        📎 Adjuntar archivo
                        <input
                          type="file"
                          className="hidden"
                          onChange={handleFileUpload}
                          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        />
                      </label>
                    )}
                  </div>
                  
                  {(() => {
                    const archivos = permisoSeleccionado.archivosAdjuntos || []
                    const archivosArray = Array.isArray(archivos) ? archivos : []

                    if (archivosArray.length === 0) {
                      return <p className="text-sm text-gray-500">No hay archivos adjuntos</p>
                    }

                    return (
                      <div className="space-y-2">
                        {archivosArray.map((archivo, index) => {
                          if (!archivo || typeof archivo !== 'object') {
                            return null
                          }

                          return (
                            <div
                              key={archivo.id || index}
                              className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-2xl">📄</span>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {String(archivo.nombre || 'Documento adjunto')}
                                  </p>
                                  {archivo.descripcion && typeof archivo.descripcion === 'string' && (
                                    <p className="text-xs text-gray-500">
                                      {archivo.descripcion}
                                    </p>
                                  )}
                                  {archivo.descripcion && typeof archivo.descripcion !== 'string' && (
                                    <p className="text-xs text-gray-500">
                                      {JSON.stringify(archivo.descripcion)}
                                    </p>
                                  )}
                                  {archivo.tamaño && archivo.fechaCarga && (
                                    <p className="text-xs text-gray-500">
                                      {String(archivo.tamaño)} • {new Date(archivo.fechaCarga).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                              </div>
                              {archivo.url && (
                                <a
                                  href={archivo.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                >
                                  Ver archivo
                                </a>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Permisos