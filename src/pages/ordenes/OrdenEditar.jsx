import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import useOrdenesStore from '../../stores/ordenesStore'
import useAuthStore from '../../stores/authStore'
import useConfigStore from '../../stores/configStore'
import useTecnicosStore from '../../stores/tecnicosStore'
import notificationService from '../../services/notificationService'
import { getCurrentTimestamp } from '../../utils/dateUtils'

const OrdenEditar = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { ordenes, updateOrden, isLoading } = useOrdenesStore()
  const { user } = useAuthStore()
  const { getTiposServicioActivos, fetchTiposServicio } = useConfigStore()
  const { tecnicos, fetchTecnicos } = useTecnicosStore()
  const [orden, setOrden] = useState(null)

  const tiposServicioActivos = getTiposServicioActivos()

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm()

  useEffect(() => {
    // Cargar técnicos y tipos de servicio
    fetchTecnicos()
    fetchTiposServicio()

    // Buscar la orden
    const ordenEncontrada = ordenes.find(o => o.id === id)

    if (!ordenEncontrada) {
      notificationService.error('Orden no encontrada', 'No se pudo encontrar la orden solicitada')
      navigate('/ordenes')
      return
    }

    setOrden(ordenEncontrada)

    // Cargar valores en el formulario
    setValue('nombreProyecto', ordenEncontrada.nombreProyecto)
    setValue('descripcion', ordenEncontrada.descripcion)
    setValue('tipoServicio', ordenEncontrada.tipoServicio)
    setValue('ubicacion', ordenEncontrada.ubicacion)
    setValue('tecnicoAsignadoId', ordenEncontrada.tecnicoAsignadoId)
    setValue('prioridad', ordenEncontrada.prioridad)
    setValue('fechaVencimiento', ordenEncontrada.fechaVencimiento)
    setValue('observaciones', ordenEncontrada.observaciones || '')
  }, [id, ordenes, setValue, navigate, fetchTecnicos, fetchTiposServicio])

  const onSubmit = async (data) => {
    try {
      // Validar permisos
      if (user?.role !== 'admin' && user?.role !== 'supervisor') {
        notificationService.error('Sin permisos', 'No tienes permisos para editar órdenes')
        return
      }

      // Encontrar el técnico seleccionado
      const tecnicoSeleccionado = tecnicos.find(t => t.id === parseInt(data.tecnicoAsignadoId))

      const ordenActualizada = {
        ...orden,
        nombreProyecto: data.nombreProyecto,
        descripcion: data.descripcion,
        tipoServicio: data.tipoServicio,
        ubicacion: data.ubicacion,
        tecnicoAsignadoId: parseInt(data.tecnicoAsignadoId),
        tecnicoAsignado: tecnicoSeleccionado ? tecnicoSeleccionado.nombre : orden.tecnicoAsignado,
        prioridad: data.prioridad,
        fechaVencimiento: data.fechaVencimiento,
        observaciones: data.observaciones,
        fechaUltimaModificacion: getCurrentTimestamp(),
        modificadoPor: user.name
      }

      await updateOrden(id, ordenActualizada)

      notificationService.success(
        'Orden actualizada',
        `La orden ${id} ha sido actualizada exitosamente`,
        1500
      )

      setTimeout(() => {
        navigate(`/ordenes/${id}`)
      }, 1500)
    } catch (error) {
      console.error('Error al actualizar orden:', error)
      notificationService.error('Error', 'No se pudo actualizar la orden')
    }
  }

  if (!orden) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-corporate-blue mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando orden...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Editar Orden de Trabajo</h1>
          <p className="text-gray-600 mt-1">
            Orden: <span className="font-mono font-semibold">{orden.id}</span>
          </p>
        </div>
        <button
          onClick={() => navigate(`/ordenes/${id}`)}
          className="btn-secondary"
        >
          ← Volver
        </button>
      </div>

      {/* Warning sobre campos no editables */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-2xl">⚠️</span>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">Campos no editables</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>Los siguientes campos NO pueden modificarse por reglas de negocio:</p>
              <ul className="list-disc list-inside mt-1">
                <li>Tipo de visita ({orden.tipoVisita})</li>
                <li>Cliente ({orden.cliente})</li>
                <li>Orden de Compra ({orden.numeroOrdenCompra || 'Sin OC'})</li>
                <li>Materiales pre-asignados (desde inventario)</li>
                {orden.visitaTecnicaId && <li>Visita técnica origen (ID: {orden.visitaTecnicaId})</li>}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-6">
        {/* Información General */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 pb-2 border-b">
            Información General
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del Proyecto *
            </label>
            <input
              type="text"
              {...register('nombreProyecto', { required: 'Campo requerido', minLength: { value: 3, message: 'Mínimo 3 caracteres' } })}
              className="input-field"
              placeholder="Ej: Mantenimiento HVAC - Edificio Central"
            />
            {errors.nombreProyecto && (
              <p className="text-red-500 text-sm mt-1">{errors.nombreProyecto.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Servicio *
            </label>
            <select {...register('tipoServicio', { required: 'Campo requerido' })} className="input-field">
              {tiposServicioActivos.map((tipo) => (
                <option key={tipo.id} value={tipo.nombre}>
                  {tipo.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción *
            </label>
            <textarea
              {...register('descripcion', { required: 'Campo requerido', minLength: { value: 20, message: 'Mínimo 20 caracteres' } })}
              className="input-field"
              rows="4"
              placeholder="Describe el trabajo a realizar..."
            />
            {errors.descripcion && (
              <p className="text-red-500 text-sm mt-1">{errors.descripcion.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ubicación *
            </label>
            <input
              type="text"
              {...register('ubicacion', { required: 'Campo requerido' })}
              className="input-field"
              placeholder="Dirección del lugar de trabajo"
            />
            {errors.ubicacion && (
              <p className="text-red-500 text-sm mt-1">{errors.ubicacion.message}</p>
            )}
          </div>
        </div>

        {/* Asignación */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 pb-2 border-b">
            Asignación
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Técnico Asignado
            </label>
            <select
              {...register('tecnicoAsignadoId')}
              className="input-field"
            >
              <option value="">Asignar después...</option>
              {tecnicos.filter(t => t.activo).map((tecnico) => (
                <option key={tecnico.id} value={tecnico.id}>
                  {tecnico.nombre}
                </option>
              ))}
            </select>
            {errors.tecnicoAsignadoId && (
              <p className="text-red-500 text-sm mt-1">{errors.tecnicoAsignadoId.message}</p>
            )}
          </div>
        </div>

        {/* Prioridad y Fechas */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 pb-2 border-b">
            Prioridad y Fechas
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prioridad *
              </label>
              <select {...register('prioridad', { required: 'Campo requerido' })} className="input-field">
                <option value="baja">🟢 Baja</option>
                <option value="media">🟡 Media</option>
                <option value="alta">🟠 Alta</option>
                <option value="urgente">🔴 Urgente</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Vencimiento *
              </label>
              <input
                type="date"
                {...register('fechaVencimiento', { required: 'Campo requerido' })}
                className="input-field"
              />
              {errors.fechaVencimiento && (
                <p className="text-red-500 text-sm mt-1">{errors.fechaVencimiento.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Observaciones */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 pb-2 border-b">
            Observaciones Adicionales
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observaciones
            </label>
            <textarea
              {...register('observaciones')}
              className="input-field"
              rows="3"
              placeholder="Notas adicionales, instrucciones especiales, etc..."
            />
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={() => navigate(`/ordenes/${id}`)}
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
            {isLoading ? 'Guardando...' : '💾 Guardar Cambios'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default OrdenEditar
