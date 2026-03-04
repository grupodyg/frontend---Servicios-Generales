import { useState, useEffect } from 'react'
import useConfigStore from '../../stores/configStore'
import useAuthStore from '../../stores/authStore'
import { isAdmin } from '../../utils/roleUtils'
import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'

const MySwal = withReactContent(Swal)

const TiposServicio = () => {
  const { user } = useAuthStore()
  const {
    tiposServicio,
    isLoading,
    fetchTiposServicio,
    createTipoServicio,
    updateTipoServicio,
    deleteTipoServicio,
    toggleTipoServicio,
    reorderTiposServicio
  } = useConfigStore()

  const [showModal, setShowModal] = useState(false)
  const [editingTipo, setEditingTipo] = useState(null)
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: ''
  })

  // Cargar tipos de servicio al montar el componente
  useEffect(() => {
    fetchTiposServicio()
  }, [fetchTiposServicio])

  // Verificar que el usuario tiene permisos de administrador
  if (!isAdmin(user)) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Acceso Restringido</h2>
        <p className="text-gray-600">Solo los administradores pueden acceder a esta página.</p>
      </div>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.nombre.trim()) {
      MySwal.fire({
        title: 'Error',
        text: 'El nombre del tipo de servicio es requerido',
        icon: 'error'
      })
      return
    }

    try {
      if (editingTipo) {
        await updateTipoServicio(editingTipo.id, formData)
        MySwal.fire({
          title: '¡Actualizado!',
          text: 'Tipo de servicio actualizado correctamente',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        })
      } else {
        await createTipoServicio(formData)
        MySwal.fire({
          title: '¡Creado!',
          text: 'Nuevo tipo de servicio creado correctamente',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        })
      }
      
      setShowModal(false)
      setEditingTipo(null)
      setFormData({ nombre: '', descripcion: '' })
    } catch (error) {
      MySwal.fire({
        title: 'Error',
        text: 'No se pudo guardar el tipo de servicio',
        icon: 'error'
      })
    }
  }

  const handleEdit = (tipo) => {
    setEditingTipo(tipo)
    setFormData({
      nombre: tipo.nombre,
      descripcion: tipo.descripcion
    })
    setShowModal(true)
  }

  const handleDelete = async (tipo) => {
    const result = await MySwal.fire({
      title: '¿Estás seguro?',
      text: `¿Deseas desactivar el tipo de servicio "${tipo.nombre}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, desactivar',
      cancelButtonText: 'Cancelar'
    })

    if (result.isConfirmed) {
      try {
        await deleteTipoServicio(tipo.id)
        MySwal.fire({
          title: '¡Desactivado!',
          text: 'Tipo de servicio desactivado correctamente',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        })
      } catch (error) {
        MySwal.fire({
          title: 'Error',
          text: 'No se pudo desactivar el tipo de servicio',
          icon: 'error'
        })
      }
    }
  }

  const handleToggle = async (tipo) => {
    try {
      await toggleTipoServicio(tipo.id)
      MySwal.fire({
        title: tipo.activo ? '¡Desactivado!' : '¡Activado!',
        text: `Tipo de servicio ${tipo.activo ? 'desactivado' : 'activado'} correctamente`,
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      })
    } catch (error) {
      MySwal.fire({
        title: 'Error',
        text: 'No se pudo cambiar el estado del tipo de servicio',
        icon: 'error'
      })
    }
  }

  const handleMoveUp = async (tipo) => {
    const tipos = [...tiposServicio].sort((a, b) => a.orden - b.orden)
    const index = tipos.findIndex(t => t.id === tipo.id)

    if (index > 0) {
      // Intercambiar posiciones en el array
      const newTipos = [...tipos]
      const temp = newTipos[index]
      newTipos[index] = newTipos[index - 1]
      newTipos[index - 1] = temp

      try {
        await reorderTiposServicio(newTipos)
      } catch (error) {
        MySwal.fire({
          title: 'Error',
          text: 'No se pudo reordenar los tipos de servicio',
          icon: 'error'
        })
      }
    }
  }

  const handleMoveDown = async (tipo) => {
    const tipos = [...tiposServicio].sort((a, b) => a.orden - b.orden)
    const index = tipos.findIndex(t => t.id === tipo.id)

    if (index < tipos.length - 1) {
      // Intercambiar posiciones en el array
      const newTipos = [...tipos]
      const temp = newTipos[index]
      newTipos[index] = newTipos[index + 1]
      newTipos[index + 1] = temp

      try {
        await reorderTiposServicio(newTipos)
      } catch (error) {
        MySwal.fire({
          title: 'Error',
          text: 'No se pudo reordenar los tipos de servicio',
          icon: 'error'
        })
      }
    }
  }

  const openModal = () => {
    setEditingTipo(null)
    setFormData({ nombre: '', descripcion: '' })
    setShowModal(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tipos de Servicio</h1>
          <p className="text-gray-600">Configura los tipos de servicio disponibles en el sistema</p>
        </div>
        <button
          onClick={openModal}
          className="btn-primary"
          disabled={isLoading}
        >
          ➕ Nuevo Tipo
        </button>
      </div>

      {/* Lista de Tipos de Servicio */}
      <div className="card">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Tipos de Servicio ({tiposServicio.length})
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Usa los botones de flecha para reordenar. Los tipos activos aparecerán en los formularios.
          </p>
        </div>

        <div className="space-y-3">
          {tiposServicio
            .sort((a, b) => a.orden - b.orden)
            .map((tipo, index) => (
              <div
                key={tipo.id}
                className={`border rounded-lg p-4 transition-shadow shadow-sm ${
                  tipo.activo ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex flex-col space-y-1">
                      <button
                        onClick={() => handleMoveUp(tipo)}
                        disabled={index === 0 || isLoading}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Mover arriba"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => handleMoveDown(tipo)}
                        disabled={index === tiposServicio.length - 1 || isLoading}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Mover abajo"
                      >
                        ▼
                      </button>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500 font-mono">#{tipo.orden}</span>
                        <h3 className={`font-medium ${tipo.activo ? 'text-gray-900' : 'text-gray-500'}`}>
                          {tipo.nombre}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          tipo.activo 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {tipo.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      {tipo.descripcion && (
                        <p className={`text-sm mt-1 ${tipo.activo ? 'text-gray-600' : 'text-gray-400'}`}>
                          {tipo.descripcion}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleToggle(tipo)}
                      className={`text-sm font-medium px-3 py-1 rounded transition-colors ${
                        tipo.activo
                          ? 'text-orange-600 hover:text-orange-700 hover:bg-orange-50'
                          : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                      }`}
                      disabled={isLoading}
                    >
                      {tipo.activo ? 'Desactivar' : 'Activar'}
                    </button>
                    
                    <button
                      onClick={() => handleEdit(tipo)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-sm font-medium px-3 py-1 rounded transition-colors"
                      disabled={isLoading}
                    >
                      Editar
                    </button>
                    
                    {tipo.activo && (
                      <button
                        onClick={() => handleDelete(tipo)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 text-sm font-medium px-3 py-1 rounded transition-colors"
                        disabled={isLoading}
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <form onSubmit={handleSubmit}>
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingTipo ? 'Editar Tipo de Servicio' : 'Nuevo Tipo de Servicio'}
                </h3>
              </div>
              
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Ej: Mantenimiento Predictivo"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    className="input-field"
                    placeholder="Descripción del tipo de servicio"
                    rows={3}
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                  disabled={isLoading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isLoading}
                >
                  {isLoading ? 'Guardando...' : (editingTipo ? 'Actualizar' : 'Crear')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default TiposServicio