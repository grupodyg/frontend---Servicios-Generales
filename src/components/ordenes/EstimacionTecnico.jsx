import { useState } from 'react'
import { useForm } from 'react-hook-form'
import useOrdenesStore from '../../stores/ordenesStore'
import useNotificacionesStore from '../../stores/notificacionesStore'
import notificationService from '../../services/notificationService'

const EstimacionTecnico = ({ orden, onClose }) => {
  const { actualizarEstimacion } = useOrdenesStore()
  const { notificarOrdenPendienteAprobacion } = useNotificacionesStore()
  const [materiales, setMateriales] = useState([])
  const [materialInput, setMaterialInput] = useState({ nombre: '', cantidad: '', unidad: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm()

  const agregarMaterial = () => {
    if (materialInput.nombre && materialInput.cantidad && materialInput.unidad) {
      setMateriales([...materiales, { ...materialInput, id: Date.now() }])
      setMaterialInput({ nombre: '', cantidad: '', unidad: '' })
    }
  }

  const eliminarMaterial = (id) => {
    setMateriales(materiales.filter(m => m.id !== id))
  }

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true)
      
      const estimacion = {
        materiales: materiales,
        tiempo: {
          cantidad: data.tiempoCantidad,
          unidad: data.tiempoUnidad,
          descripcion: `${data.tiempoCantidad} ${data.tiempoUnidad}`
        }
      }

      await actualizarEstimacion(orden.id, estimacion)
      
      // Notificar al administrador/supervisor
      notificarOrdenPendienteAprobacion(
        orden.id,
        orden.tecnicoAsignado.split(' - ')[0] // Obtener solo el nombre
      )
      
      await notificationService.success(
        '¡Estimación enviada!',
        'Tu estimación ha sido enviada para aprobación',
        2000
      )
      
      onClose()
    } catch (error) {
      await notificationService.error(
        'Error',
        'No se pudo enviar la estimación'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Estimación para Orden {orden.id}
        </h3>
        <p className="text-sm text-gray-600">
          Cliente: {orden.cliente} | Tipo: {orden.tipoServicio}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Lista de Materiales */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">
            Lista de Materiales Estimados
          </h4>
          
          {/* Input para agregar materiales */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <div className="md:col-span-2">
              <input
                type="text"
                placeholder="Nombre del material"
                className="input-field"
                value={materialInput.nombre}
                onChange={(e) => setMaterialInput({ ...materialInput, nombre: e.target.value })}
              />
            </div>
            <div>
              <input
                type="number"
                placeholder="Cantidad"
                className="input-field"
                value={materialInput.cantidad}
                onChange={(e) => setMaterialInput({ ...materialInput, cantidad: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <select
                className="input-field flex-1"
                value={materialInput.unidad}
                onChange={(e) => setMaterialInput({ ...materialInput, unidad: e.target.value })}
              >
                <option value="">Unidad</option>
                <option value="unidades">Unidades</option>
                <option value="metros">Metros</option>
                <option value="kg">Kilogramos</option>
                <option value="litros">Litros</option>
                <option value="galones">Galones</option>
                <option value="piezas">Piezas</option>
              </select>
              <button
                type="button"
                onClick={agregarMaterial}
                className="btn-primary px-3"
                disabled={!materialInput.nombre || !materialInput.cantidad || !materialInput.unidad}
              >
                +
              </button>
            </div>
          </div>

          {/* Lista de materiales agregados */}
          {materiales.length > 0 ? (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="space-y-2">
                {materiales.map((material) => (
                  <div key={material.id} className="flex items-center justify-between bg-white p-3 rounded border border-gray-200">
                    <div className="flex-1">
                      <span className="font-medium">{material.nombre}</span>
                      <span className="text-gray-600 ml-2">
                        ({material.cantidad} {material.unidad})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => eliminarMaterial(material.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-sm text-gray-600">
                Total de materiales: {materiales.length}
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800">
                Agrega los materiales necesarios para este trabajo
              </p>
            </div>
          )}
        </div>

        {/* Tiempo Estimado */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">
            Tiempo Estimado de Ejecución
          </h4>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cantidad *
              </label>
              <input
                type="number"
                min="1"
                className={`input-field ${errors.tiempoCantidad ? 'border-red-500' : ''}`}
                {...register('tiempoCantidad', { 
                  required: 'La cantidad es requerida',
                  min: { value: 1, message: 'Debe ser mayor a 0' }
                })}
              />
              {errors.tiempoCantidad && (
                <p className="mt-1 text-sm text-red-600">{errors.tiempoCantidad.message}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unidad *
              </label>
              <select
                className={`input-field ${errors.tiempoUnidad ? 'border-red-500' : ''}`}
                {...register('tiempoUnidad', { required: 'La unidad es requerida' })}
              >
                <option value="">Seleccionar...</option>
                <option value="horas">Horas</option>
                <option value="días">Días</option>
                <option value="semanas">Semanas</option>
              </select>
              {errors.tiempoUnidad && (
                <p className="mt-1 text-sm text-red-600">{errors.tiempoUnidad.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Notas adicionales */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notas adicionales (opcional)
          </label>
          <textarea
            className="input-field"
            rows="3"
            placeholder="Consideraciones especiales, riesgos identificados, etc."
            {...register('notas')}
          />
        </div>

        {/* Acciones */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={isSubmitting || materiales.length === 0}
          >
            {isSubmitting ? 'Enviando...' : 'Enviar Estimación'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default EstimacionTecnico