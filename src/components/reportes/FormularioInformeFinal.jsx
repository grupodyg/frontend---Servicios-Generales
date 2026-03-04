import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { getToday } from '../../utils/dateUtils'
import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'

const MySwal = withReactContent(Swal)

const FormularioInformeFinal = ({ ordenData, reportes, materialesUtilizados, onGenerar, onCancelar }) => {
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors }
  } = useForm({
    defaultValues: {
      asunto: ordenData?.nombreProyecto || ordenData?.descripcion || '',
      area: '',
      fechaInicio: ordenData?.fechaCreacion || '',
      fechaFin: getToday(),
      intervenciones: reportes.map(rep => ({
        fecha: rep.fecha,
        descripcion: rep.descripcion,
        estatus: 'Finalizado',
        observaciones: rep.observaciones || 'Ninguna'
      })),
      equiposYMaquinas: [],
      materialesInsumos: materialesUtilizados.map(mat => ({
        nombre: mat.nombre,
        cantidad: mat.cantidad,
        unidad: mat.unidad
      })),
      equiposSeguridad: [
        'Guantes de seguridad',
        'Cascos de seguridad',
        'Zapatos de seguridad',
        'Uniforme de trabajo',
        'Barbiquejo',
        'Arnés de seguridad'
      ],
      procesoIntervencion: '',
      planificador: {
        nombre: '',
        firma: ''
      },
      ejecutor: {
        nombre: '',
        firma: ''
      },
      solicitante: {
        nombre: '',
        firma: ''
      }
    }
  })

  const { fields: intervencionFields, append: appendIntervencion, remove: removeIntervencion } = useFieldArray({
    control,
    name: 'intervenciones'
  })

  const { fields: equiposFields, append: appendEquipo, remove: removeEquipo } = useFieldArray({
    control,
    name: 'equiposYMaquinas'
  })

  const { fields: materialesFields, append: appendMaterial, remove: removeMaterial } = useFieldArray({
    control,
    name: 'materialesInsumos'
  })

  const { fields: seguridadFields, append: appendSeguridad, remove: removeSeguridad } = useFieldArray({
    control,
    name: 'equiposSeguridad'
  })

  const onSubmit = (data) => {
    onGenerar(data)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              Formulario de Informe Final
            </h2>
            <button
              type="button"
              onClick={onCancelar}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Complete la información adicional para generar el informe final
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-8">
          {/* Información General */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              1. Información General del Proyecto
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Asunto *
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="2"
                  {...register('asunto', { required: 'El asunto es requerido' })}
                />
                {errors.asunto && (
                  <p className="mt-1 text-sm text-red-600">{errors.asunto.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Área *
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  {...register('area', { required: 'El área es requerida' })}
                />
                {errors.area && (
                  <p className="mt-1 text-sm text-red-600">{errors.area.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de Inicio *
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  {...register('fechaInicio', { required: 'La fecha de inicio es requerida' })}
                />
                {errors.fechaInicio && (
                  <p className="mt-1 text-sm text-red-600">{errors.fechaInicio.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de Fin *
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  {...register('fechaFin', { required: 'La fecha de fin es requerida' })}
                />
                {errors.fechaFin && (
                  <p className="mt-1 text-sm text-red-600">{errors.fechaFin.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Esquema de Trabajo */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                2. Esquema de Trabajo (Intervenciones)
              </h3>
              <button
                type="button"
                onClick={() => appendIntervencion({ fecha: '', descripcion: '', estatus: 'Finalizado', observaciones: '' })}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
              >
                + Agregar
              </button>
            </div>

            <div className="space-y-3">
              {intervencionFields.map((field, index) => (
                <div key={field.id} className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Fecha
                      </label>
                      <input
                        type="date"
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                        {...register(`intervenciones.${index}.fecha`)}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Descripción
                      </label>
                      <textarea
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                        rows="2"
                        {...register(`intervenciones.${index}.descripcion`)}
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Estatus
                        </label>
                        <input
                          type="text"
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                          {...register(`intervenciones.${index}.estatus`)}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeIntervencion(index)}
                        className="px-2 py-1 text-red-600 hover:bg-red-50 rounded-md"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Equipos y Máquinas */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                3. Equipos y Máquinas Empleados
              </h3>
              <button
                type="button"
                onClick={() => appendEquipo({ nombre: '' })}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
              >
                + Agregar
              </button>
            </div>

            <div className="space-y-2">
              {equiposFields.map((field, index) => (
                <div key={field.id} className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Ej: ESCALERA DE 14 PASOS"
                    {...register(`equiposYMaquinas.${index}.nombre`)}
                  />
                  <button
                    type="button"
                    onClick={() => removeEquipo(index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Materiales e Insumos */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                4. Materiales e Insumos
              </h3>
              <button
                type="button"
                onClick={() => appendMaterial({ nombre: '', cantidad: 1, unidad: 'UND' })}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
              >
                + Agregar
              </button>
            </div>

            <div className="space-y-2">
              {materialesFields.map((field, index) => (
                <div key={field.id} className="flex gap-2">
                  <input
                    type="number"
                    className="w-20 px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Cant."
                    {...register(`materialesInsumos.${index}.cantidad`)}
                  />
                  <input
                    type="text"
                    className="w-20 px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Unidad"
                    {...register(`materialesInsumos.${index}.unidad`)}
                  />
                  <input
                    type="text"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Nombre del material"
                    {...register(`materialesInsumos.${index}.nombre`)}
                  />
                  <button
                    type="button"
                    onClick={() => removeMaterial(index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Equipos de Seguridad */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                5. Equipos de Seguridad Colectivo
              </h3>
              <button
                type="button"
                onClick={() => appendSeguridad('')}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
              >
                + Agregar
              </button>
            </div>

            <div className="space-y-2">
              {seguridadFields.map((field, index) => (
                <div key={field.id} className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                    {...register(`equiposSeguridad.${index}`)}
                  />
                  <button
                    type="button"
                    onClick={() => removeSeguridad(index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Proceso de Intervención */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              6. Proceso de Intervención
            </h3>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="8"
              placeholder="Describa el proceso de intervención detalladamente..."
              {...register('procesoIntervencion', { required: 'El proceso de intervención es requerido' })}
            />
            {errors.procesoIntervencion && (
              <p className="mt-1 text-sm text-red-600">{errors.procesoIntervencion.message}</p>
            )}
          </div>

          {/* Aprobaciones */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              7. Aprobaciones
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  V.B. Planificador *
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Nombre completo"
                  {...register('planificador.nombre', { required: 'Requerido' })}
                />
                {errors.planificador?.nombre && (
                  <p className="mt-1 text-sm text-red-600">{errors.planificador.nombre.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  V.B. Ejecutor *
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Nombre completo"
                  {...register('ejecutor.nombre', { required: 'Requerido' })}
                />
                {errors.ejecutor?.nombre && (
                  <p className="mt-1 text-sm text-red-600">{errors.ejecutor.nombre.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  V.B. Solicitante *
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Nombre completo"
                  {...register('solicitante.nombre', { required: 'Requerido' })}
                />
                {errors.solicitante?.nombre && (
                  <p className="mt-1 text-sm text-red-600">{errors.solicitante.nombre.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancelar}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Generar Informe PDF
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default FormularioInformeFinal