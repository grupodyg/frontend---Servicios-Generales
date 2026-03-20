import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useUsuariosStore from '../../stores/usuariosStore'
import useAuthStore from '../../stores/authStore'
import { useForm } from 'react-hook-form'
import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'

const MySwal = withReactContent(Swal)

const Usuarios = () => {
  const { user: currentUser } = useAuthStore()
  const {
    usuarios,
    isLoading,
    fetchUsuarios,
    createUsuario,
    updateUsuario,
    deleteUsuario,
    toggleUsuarioEstado,
    getUsuariosFiltrados,
    getEstadisticas,
    setFiltros,
    filtros
  } = useUsuariosStore()

  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('create') // 'create' | 'edit' | 'view'
  const [selectedUsuario, setSelectedUsuario] = useState(null)
  const [viewMode, setViewMode] = useState('table') // 'table' | 'cards'
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors }
  } = useForm()

  const watchRole = watch('role')

  useEffect(() => {
    fetchUsuarios()
  }, [fetchUsuarios])

  const usuariosFiltrados = getUsuariosFiltrados()
  const estadisticas = getEstadisticas()

  const getRoleBadge = (role) => {
    const styles = {
      admin: 'bg-red-100 text-red-800',
      supervisor: 'bg-blue-100 text-blue-800',
      tecnico: 'bg-green-100 text-green-800',
      rrhh: 'bg-purple-100 text-purple-800'
    }

    const labels = {
      admin: 'Administrador',
      supervisor: 'Supervisor',
      tecnico: 'Técnico',
      rrhh: 'RRHH'
    }

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[role] || 'bg-gray-100 text-gray-800'}`}>
        {labels[role] || role}
      </span>
    )
  }

  const getEstadoBadge = (estado) => {
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
        estado === 'active'
          ? 'bg-green-100 text-green-800'
          : 'bg-gray-100 text-gray-800'
      }`}>
        {estado === 'active' ? 'Activo' : 'Inactivo'}
      </span>
    )
  }

  const handleOpenModal = (mode, usuario = null) => {
    setModalMode(mode)
    setSelectedUsuario(usuario)
    setShowModal(true)
    
    if (mode === 'edit' && usuario) {
      // Pre-llenar el formulario con los datos del usuario
      setValue('name', usuario.name)
      setValue('email', usuario.email)
      setValue('password', usuario.password || '')
      setValue('role', usuario.role)
      setValue('telefono', usuario.telefono || '')
      setValue('dni', usuario.dni || '')
      setValue('direccion', usuario.direccion || '')
      setValue('especialidad', usuario.especialidad || '')
      setValue('permissions', usuario.permissions || [])
    } else if (mode === 'create') {
      reset()
      setShowPassword(false)
    }
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setSelectedUsuario(null)
    setShowPassword(false)
    reset()
  }

  const onSubmit = async (data) => {
    try {
      if (modalMode === 'create') {
        await createUsuario(data)
        MySwal.fire({
          title: '¡Usuario creado!',
          text: 'El usuario ha sido creado exitosamente',
          icon: 'success',
          confirmButtonColor: '#1e40af'
        })
      } else if (modalMode === 'edit' && selectedUsuario) {
        await updateUsuario(selectedUsuario.id, data)
        MySwal.fire({
          title: '¡Usuario actualizado!',
          text: 'Los datos del usuario han sido actualizados',
          icon: 'success',
          confirmButtonColor: '#1e40af'
        })
      }
      handleCloseModal()
    } catch (error) {
      MySwal.fire({
        title: 'Error',
        text: 'No se pudo procesar la solicitud',
        icon: 'error',
        confirmButtonColor: '#1e40af'
      })
    }
  }

  const handleDeleteUsuario = async (usuario) => {
    const result = await MySwal.fire({
      title: '¿Eliminar usuario?',
      text: `¿Está seguro de eliminar a ${usuario.name}? Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    })

    if (result.isConfirmed) {
      try {
        await deleteUsuario(usuario.id)
        MySwal.fire({
          title: '¡Eliminado!',
          text: 'El usuario ha sido eliminado exitosamente',
          icon: 'success',
          confirmButtonColor: '#1e40af'
        })
      } catch (error) {
        MySwal.fire({
          title: 'Error',
          text: 'No se pudo eliminar el usuario',
          icon: 'error',
          confirmButtonColor: '#1e40af'
        })
      }
    }
  }

  const handleToggleEstado = async (usuario) => {
    const nuevoEstado = usuario.estado === 'active' ? 'inactive' : 'active'
    const result = await MySwal.fire({
      title: `¿${nuevoEstado === 'active' ? 'Activar' : 'Desactivar'} usuario?`,
      text: `¿Está seguro de ${nuevoEstado === 'active' ? 'activar' : 'desactivar'} a ${usuario.name}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#1e40af',
      cancelButtonColor: '#6b7280',
      confirmButtonText: `Sí, ${nuevoEstado === 'active' ? 'activar' : 'desactivar'}`,
      cancelButtonText: 'Cancelar'
    })

    if (result.isConfirmed) {
      try {
        await toggleUsuarioEstado(usuario.id)
        MySwal.fire({
          title: '¡Estado actualizado!',
          text: `El usuario ha sido ${nuevoEstado === 'active' ? 'activado' : 'desactivado'}`,
          icon: 'success',
          confirmButtonColor: '#1e40af'
        })
      } catch (error) {
        MySwal.fire({
          title: 'Error',
          text: 'No se pudo actualizar el estado del usuario',
          icon: 'error',
          confirmButtonColor: '#1e40af'
        })
      }
    }
  }

  const getPermissionsByRole = (role) => {
    switch (role) {
      case 'admin':
        return ['all']
      case 'supervisor':
        return ['dashboard', 'ordenes', 'reportes', 'materiales', 'gantt', 'clientes', 'presupuestos']
      case 'tecnico':
        return ['dashboard', 'ordenes', 'reportes', 'materiales']
      case 'rrhh':
        return ['dashboard', 'ordenes', 'reportes', 'permisos']
      default:
        return []
    }
  }

  if (isLoading && usuarios.length === 0) {
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
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-sm text-gray-600">Administración de usuarios del sistema</p>
        </div>
        <div className="flex space-x-3">
          <div className="hidden sm:flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'table'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📋 Tabla
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'cards'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📇 Tarjetas
            </button>
          </div>
          <button
            onClick={() => handleOpenModal('create')}
            className="btn-primary"
          >
            + Nuevo Usuario
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Usuarios</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{estadisticas.total}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-lg sm:text-xl">👥</span>
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
              <p className="text-sm text-gray-600">Usuarios Activos</p>
              <p className="text-xl sm:text-2xl font-bold text-green-600">{estadisticas.activos}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-lg sm:text-xl">✅</span>
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
              <p className="text-sm text-gray-600">Técnicos</p>
              <p className="text-xl sm:text-2xl font-bold text-blue-600">{estadisticas.tecnicos}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-lg sm:text-xl">🔧</span>
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
              <p className="text-sm text-gray-600">Supervisores</p>
              <p className="text-xl sm:text-2xl font-bold text-purple-600">{estadisticas.supervisores}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-lg sm:text-xl">👨‍💼</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filtros */}
      <div className="card">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar usuarios..."
              value={filtros.busqueda}
              onChange={(e) => setFiltros({ busqueda: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-corporate-blue focus:border-transparent"
            />
            <svg
              className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <select
            value={filtros.rol}
            onChange={(e) => setFiltros({ rol: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-corporate-blue focus:border-transparent"
          >
            <option value="todos">Todos los roles</option>
            <option value="admin">Administradores</option>
            <option value="supervisor">Supervisores</option>
            <option value="tecnico">Técnicos</option>
            <option value="rrhh">RRHH</option>
          </select>

          <select
            value={filtros.estado}
            onChange={(e) => setFiltros({ estado: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-corporate-blue focus:border-transparent"
          >
            <option value="todos">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
        </div>
      </div>

      {/* Lista de usuarios */}
      {viewMode === 'table' ? (
        <>
        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {usuariosFiltrados.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-gray-500">No se encontraron usuarios</p>
            </div>
          ) : (
            usuariosFiltrados.map((usuario) => (
              <div key={usuario.id} className="card">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="flex-shrink-0 h-10 w-10">
                    <div className="h-10 w-10 rounded-full bg-corporate-blue flex items-center justify-center">
                      <span className="text-sm font-medium text-white">
                        {usuario.name.charAt(0)}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{usuario.name}</p>
                    <p className="text-xs text-gray-500 truncate">{usuario.email}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {getRoleBadge(usuario.role)}
                  {getEstadoBadge(usuario.estado)}
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{usuario.especialidad || 'Sin especialidad'}</span>
                  <span>{usuario.ultimaActividad ? new Date(usuario.ultimaActividad).toLocaleDateString() : 'Sin conexión'}</span>
                </div>
                <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-gray-100">
                  <button onClick={() => handleOpenModal('view', usuario)} className="text-blue-600 hover:text-blue-900 p-1" title="Ver">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  </button>
                  <button onClick={() => handleOpenModal('edit', usuario)} className="text-green-600 hover:text-green-900 p-1" title="Editar">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button onClick={() => handleToggleEstado(usuario)} className={usuario.estado === 'active' ? 'text-orange-600 hover:text-orange-900 p-1' : 'text-green-600 hover:text-green-900 p-1'} title={usuario.estado === 'active' ? 'Desactivar' : 'Activar'}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={usuario.estado === 'active' ? "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L5.636 5.636" : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"} /></svg>
                  </button>
                  {usuario.id !== currentUser?.id && (
                    <button onClick={() => handleDeleteUsuario(usuario)} className="text-red-600 hover:text-red-900 p-1" title="Eliminar">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        {/* Desktop table */}
        <div className="hidden md:block card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Especialidad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Última Actividad
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {usuariosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                      No se encontraron usuarios
                    </td>
                  </tr>
                ) : (
                  usuariosFiltrados.map((usuario) => (
                    <tr key={usuario.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-corporate-blue flex items-center justify-center">
                              <span className="text-sm font-medium text-white">
                                {usuario.name.charAt(0)}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {usuario.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {usuario.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getRoleBadge(usuario.role)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {usuario.especialidad || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getEstadoBadge(usuario.estado)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {usuario.ultimaActividad ? new Date(usuario.ultimaActividad).toLocaleDateString() : 'Sin conexión'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleOpenModal('view', usuario)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Ver detalles"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleOpenModal('edit', usuario)}
                            className="text-green-600 hover:text-green-900"
                            title="Editar"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleToggleEstado(usuario)}
                            className={`${
                              usuario.estado === 'active'
                                ? 'text-orange-600 hover:text-orange-900'
                                : 'text-green-600 hover:text-green-900'
                            }`}
                            title={usuario.estado === 'active' ? 'Desactivar' : 'Activar'}
                          >
                            {usuario.estado === 'active' ? (
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </button>
                          {usuario.id !== currentUser?.id && (
                            <button
                              onClick={() => handleDeleteUsuario(usuario)}
                              className="text-red-600 hover:text-red-900"
                              title="Eliminar"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
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
        </>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {usuariosFiltrados.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="text-6xl text-gray-400 mb-4">👥</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No se encontraron usuarios</h3>
              <p className="text-gray-600">Intenta ajustar los filtros de búsqueda</p>
            </div>
          ) : (
            usuariosFiltrados.map((usuario) => (
              <motion.div
                key={usuario.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="card hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleOpenModal('view', usuario)}
              >
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="h-12 w-12 rounded-full bg-corporate-blue flex items-center justify-center">
                      <span className="text-lg font-medium text-white">
                        {usuario.name.charAt(0)}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{usuario.name}</h3>
                    <p className="text-sm text-gray-600">{usuario.email}</p>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    {getRoleBadge(usuario.role)}
                    {getEstadoBadge(usuario.estado)}
                  </div>
                </div>
                
                {usuario.especialidad && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Especialidad:</span> {usuario.especialidad}
                    </p>
                  </div>
                )}
                
                <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between items-center">
                  <p className="text-xs text-gray-500">
                    Último acceso: {usuario.ultimaActividad ? new Date(usuario.ultimaActividad).toLocaleDateString() : 'Sin conexión'}
                  </p>
                  <div className="flex space-x-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenModal('edit', usuario)
                      }}
                      className="p-1 text-green-600 hover:text-green-900"
                      title="Editar"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    {usuario.id !== currentUser?.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteUsuario(usuario)
                        }}
                        className="p-1 text-red-600 hover:text-red-900"
                        title="Eliminar"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={handleCloseModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {modalMode === 'create' && 'Nuevo Usuario'}
                    {modalMode === 'edit' && 'Editar Usuario'}
                    {modalMode === 'view' && 'Detalles del Usuario'}
                  </h2>
                  <button
                    onClick={handleCloseModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {modalMode === 'view' && selectedUsuario ? (
                  <div className="space-y-6">
                    <div className="flex items-center space-x-4">
                      <div className="h-16 w-16 rounded-full bg-corporate-blue flex items-center justify-center">
                        <span className="text-2xl font-medium text-white">
                          {selectedUsuario.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">{selectedUsuario.name}</h3>
                        <p className="text-gray-600">{selectedUsuario.email}</p>
                        <div className="flex space-x-2 mt-2">
                          {getRoleBadge(selectedUsuario.role)}
                          {getEstadoBadge(selectedUsuario.estado)}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Información Personal</h4>
                        <dl className="space-y-2">
                          {currentUser?.role === 'admin' && (
                            <div>
                              <dt className="text-sm font-medium text-gray-500">Contraseña</dt>
                              <dd className="text-sm text-gray-900 flex items-center space-x-2">
                                <span>{showPassword ? selectedUsuario.password : '••••••••'}</span>
                                <button
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="text-blue-600 hover:text-blue-800 text-xs"
                                  title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                >
                                  {showPassword ? '👁️‍🗨️' : '👁️'}
                                </button>
                              </dd>
                            </div>
                          )}
                          <div>
                            <dt className="text-sm font-medium text-gray-500">DNI</dt>
                            <dd className="text-sm text-gray-900">{selectedUsuario.dni || 'No especificado'}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Dirección</dt>
                            <dd className="text-sm text-gray-900">{selectedUsuario.direccion || 'No especificado'}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Teléfono</dt>
                            <dd className="text-sm text-gray-900">{selectedUsuario.telefono || 'No especificado'}</dd>
                          </div>
                          {selectedUsuario.especialidad && (
                            <div>
                              <dt className="text-sm font-medium text-gray-500">Especialidad</dt>
                              <dd className="text-sm text-gray-900">{selectedUsuario.especialidad}</dd>
                            </div>
                          )}
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Fecha de Creación</dt>
                            <dd className="text-sm text-gray-900">
                              {selectedUsuario.fechaCreacion ? new Date(selectedUsuario.fechaCreacion).toLocaleDateString() : 'No disponible'}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Última Actividad</dt>
                            <dd className="text-sm text-gray-900">
                              {selectedUsuario.ultimaActividad ? new Date(selectedUsuario.ultimaActividad).toLocaleDateString() : 'Sin conexión'}
                            </dd>
                          </div>
                        </dl>
                      </div>

                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Permisos</h4>
                        <div className="space-y-2">
                          {selectedUsuario.permissions && selectedUsuario.permissions.includes('all') ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-red-100 text-red-800">
                              🔓 Acceso Total
                            </span>
                          ) : selectedUsuario.permissions && selectedUsuario.permissions.length > 0 ? (
                            selectedUsuario.permissions.map((permission) => (
                              <span key={permission.id || permission} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 mr-2 mb-2">
                                {permission.name || permission}
                              </span>
                            ))
                          ) : (
                            <p className="text-sm text-gray-500">Sin permisos asignados</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-6 border-t">
                      <button
                        onClick={() => handleOpenModal('edit', selectedUsuario)}
                        className="btn-secondary"
                      >
                        Editar Usuario
                      </button>
                      <button
                        onClick={handleCloseModal}
                        className="btn-primary"
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nombre Completo *
                        </label>
                        <input
                          type="text"
                          className={`input-field ${errors.name ? 'border-red-500' : ''}`}
                          {...register('name', { required: 'El nombre es requerido' })}
                        />
                        {errors.name && (
                          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email *
                        </label>
                        <input
                          type="email"
                          className={`input-field ${errors.email ? 'border-red-500' : ''}`}
                          {...register('email', {
                            required: 'El email es requerido',
                            pattern: {
                              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                              message: 'Email inválido'
                            }
                          })}
                        />
                        {errors.email && (
                          <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Contraseña {modalMode === 'create' ? '*' : ''}
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            className={`input-field pr-10 ${errors.password ? 'border-red-500' : ''}`}
                            {...register('password', modalMode === 'create' ? {
                              required: 'La contraseña es requerida',
                              minLength: {
                                value: 6,
                                message: 'La contraseña debe tener al menos 6 caracteres'
                              }
                            } : {})}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
                          >
                            {showPassword ? (
                              <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L15 15" />
                              </svg>
                            ) : (
                              <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            )}
                          </button>
                        </div>
                        {errors.password && (
                          <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          DNI
                        </label>
                        <input
                          type="text"
                          className={`input-field ${errors.dni ? 'border-red-500' : ''}`}
                          placeholder="12345678"
                          {...register('dni', {
                            pattern: {
                              value: /^\d{8}$/,
                              message: 'El DNI debe tener 8 dígitos'
                            }
                          })}
                        />
                        {errors.dni && (
                          <p className="mt-1 text-sm text-red-600">{errors.dni.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Rol *
                        </label>
                        <select
                          className={`input-field ${errors.role ? 'border-red-500' : ''}`}
                          {...register('role', { required: 'El rol es requerido' })}
                          onChange={(e) => {
                            const role = e.target.value
                            setValue('role', role)
                            setValue('permissions', getPermissionsByRole(role))
                          }}
                        >
                          <option value="">Seleccionar rol</option>
                          <option value="admin">Administrador</option>
                          <option value="supervisor">Supervisor</option>
                          <option value="tecnico">Técnico</option>
                          <option value="rrhh">Recursos Humanos</option>
                        </select>
                        {errors.role && (
                          <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Teléfono
                        </label>
                        <input
                          type="tel"
                          className="input-field"
                          placeholder="+51 999 888 777"
                          {...register('telefono')}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Dirección
                        </label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="Av. Javier Prado 123, San Isidro, Lima"
                          {...register('direccion')}
                        />
                      </div>

                      {watchRole === 'tecnico' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Especialidad
                          </label>
                          <select
                            className="input-field"
                            {...register('especialidad')}
                          >
                            <option value="">Seleccionar especialidad</option>
                            <option value="HVAC">HVAC</option>
                            <option value="Eléctrico">Eléctrico</option>
                            <option value="Plomería">Plomería</option>
                            <option value="Estructural">Estructural</option>
                            <option value="Mecánico">Mecánico</option>
                            <option value="General">General</option>
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-6 border-t">
                      <button
                        type="button"
                        onClick={handleCloseModal}
                        className="btn-secondary"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="btn-primary"
                        disabled={isLoading}
                      >
                        {modalMode === 'create' ? 'Crear Usuario' : 'Actualizar Usuario'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Usuarios