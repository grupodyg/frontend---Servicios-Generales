import { useState, useEffect } from 'react'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import useConfigStore from '../../stores/configStore'
import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'

const MySwal = withReactContent(Swal)

const CondicionesPago = () => {
  const {
    condicionesPago,
    isLoading,
    fetchCondicionesPago,
    getCondicionesPagoActivas,
    createCondicionPago,
    updateCondicionPago,
    deleteCondicionPago,
    reorderCondicionesPago,
    toggleCondicionPago
  } = useConfigStore()

  // Cargar condiciones de pago al montar el componente
  useEffect(() => {
    fetchCondicionesPago()
  }, [fetchCondicionesPago])

  const [showModal, setShowModal] = useState(false)
  const [editingCondicion, setEditingCondicion] = useState(null)
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: ''
  })

  const condicionesActivas = getCondicionesPagoActivas()

  const resetForm = () => {
    setFormData({
      nombre: '',
      descripcion: ''
    })
    setEditingCondicion(null)
  }

  const handleOpenModal = (condicion = null) => {
    if (condicion) {
      setEditingCondicion(condicion)
      setFormData({
        nombre: condicion.nombre,
        descripcion: condicion.descripcion
      })
    } else {
      resetForm()
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    resetForm()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.nombre.trim()) {
      MySwal.fire({
        title: 'Error',
        text: 'El nombre es requerido',
        icon: 'error',
        confirmButtonColor: '#1e40af'
      })
      return
    }

    try {
      if (editingCondicion) {
        await updateCondicionPago(editingCondicion.id, formData)
        MySwal.fire({
          title: '¡Actualizada!',
          text: 'Condición de pago actualizada correctamente',
          icon: 'success',
          confirmButtonColor: '#1e40af',
          timer: 2000
        })
      } else {
        await createCondicionPago(formData)
        MySwal.fire({
          title: '¡Creada!',
          text: 'Condición de pago creada correctamente',
          icon: 'success',
          confirmButtonColor: '#1e40af',
          timer: 2000
        })
      }
      handleCloseModal()
    } catch (error) {
      MySwal.fire({
        title: 'Error',
        text: 'No se pudo guardar la condición de pago',
        icon: 'error',
        confirmButtonColor: '#1e40af'
      })
    }
  }

  const handleDelete = async (condicion) => {
    const result = await MySwal.fire({
      title: '¿Estás seguro?',
      text: `Se desactivará la condición "${condicion.nombre}"`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, desactivar',
      cancelButtonText: 'Cancelar'
    })

    if (result.isConfirmed) {
      try {
        await deleteCondicionPago(condicion.id)
        MySwal.fire({
          title: '¡Desactivada!',
          text: 'Condición de pago desactivada correctamente',
          icon: 'success',
          confirmButtonColor: '#1e40af',
          timer: 2000
        })
      } catch (error) {
        MySwal.fire({
          title: 'Error',
          text: 'No se pudo desactivar la condición de pago',
          icon: 'error',
          confirmButtonColor: '#1e40af'
        })
      }
    }
  }

  const handleToggle = async (condicion) => {
    try {
      await toggleCondicionPago(condicion.id)
    } catch (error) {
      MySwal.fire({
        title: 'Error',
        text: 'No se pudo cambiar el estado de la condición',
        icon: 'error',
        confirmButtonColor: '#1e40af'
      })
    }
  }

  const moveCondicion = async (dragIndex, hoverIndex) => {
    const draggedCondicion = condicionesActivas[dragIndex]
    const newCondiciones = [...condicionesActivas]
    newCondiciones.splice(dragIndex, 1)
    newCondiciones.splice(hoverIndex, 0, draggedCondicion)
    
    try {
      await reorderCondicionesPago(newCondiciones)
    } catch (error) {
      MySwal.fire({
        title: 'Error',
        text: 'No se pudo reordenar las condiciones',
        icon: 'error',
        confirmButtonColor: '#1e40af'
      })
    }
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Condiciones de Pago</h1>
            <p className="text-sm text-gray-600">Configurar las condiciones de pago disponibles para presupuestos</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="btn-primary self-start sm:self-auto"
          >
            + Nueva Condición
          </button>
        </div>

        {/* Lista de Condiciones */}
        <div className="card">
          <div className="space-y-4">
            {condicionesPago.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No hay condiciones de pago configuradas</p>
              </div>
            ) : (
              condicionesPago
                .sort((a, b) => a.orden - b.orden)
                .map((condicion, index) => (
                  <CondicionItem
                    key={condicion.id}
                    condicion={condicion}
                    index={index}
                    moveCondicion={moveCondicion}
                    onEdit={() => handleOpenModal(condicion)}
                    onDelete={() => handleDelete(condicion)}
                    onToggle={() => handleToggle(condicion)}
                    isActive={condicion.activo}
                  />
                ))
            )}
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingCondicion ? 'Editar Condición' : 'Nueva Condición'}
                </h3>
              </div>
              
              <form onSubmit={handleSubmit} className="px-6 py-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="ej: Pago a 45 días"
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
                      rows="3"
                      placeholder="Descripción detallada de la condición de pago..."
                      value={formData.descripcion}
                      onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 mt-6">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="btn-secondary"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`btn-primary ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isLoading ? 'Guardando...' : (editingCondicion ? 'Actualizar' : 'Crear')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DndProvider>
  )
}

// Componente para cada item draggable
const CondicionItem = ({ condicion, index, moveCondicion, onEdit, onDelete, onToggle, isActive }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'condicion',
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  const [, drop] = useDrop({
    accept: 'condicion',
    hover: (draggedItem) => {
      if (draggedItem.index !== index) {
        moveCondicion(draggedItem.index, index)
        draggedItem.index = index
      }
    },
  })

  return (
    <div
      ref={(node) => drag(drop(node))}
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg cursor-move transition-all gap-3 ${
        isDragging ? 'opacity-50' : ''
      } ${
        isActive
          ? 'border-gray-200 bg-white'
          : 'border-gray-100 bg-gray-50'
      }`}
    >
      <div className="flex items-center space-x-3 sm:space-x-4">
        <div className="text-gray-400">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </div>
        <div className={isActive ? '' : 'opacity-60'}>
          <h3 className="font-medium text-gray-900">{condicion.nombre}</h3>
          {condicion.descripcion && (
            <p className="text-sm text-gray-600">{condicion.descripcion}</p>
          )}
        </div>
      </div>
      
      <div className="flex items-center space-x-2 self-end sm:self-auto">
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          isActive 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-600'
        }`}>
          {isActive ? 'Activo' : 'Inactivo'}
        </span>
        
        <button
          onClick={onToggle}
          className={`p-2 rounded-lg transition-colors ${
            isActive 
              ? 'text-orange-600 hover:bg-orange-50' 
              : 'text-green-600 hover:bg-green-50'
          }`}
          title={isActive ? 'Desactivar' : 'Activar'}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </button>
        
        <button
          onClick={onEdit}
          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          title="Editar"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        
        <button
          onClick={onDelete}
          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Eliminar"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default CondicionesPago