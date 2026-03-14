import React, { memo, useMemo } from 'react'
import { ESPECIALIDADES_PERSONAL } from '../hooks/useVisitaDetalle'

const TabPersonal = memo(({
  listaPersonal,
  nuevaPersona,
  setNuevaPersona,
  especialidadPersonalizada,
  setEspecialidadPersonalizada,
  mostrarInputEspecialidad,
  requerimientosAdicionales,
  setRequerimientosAdicionales,
  editMode,
  handleEspecialidadChange,
  handleAgregarPersona,
  handleEliminarPersona,
  handleGuardarPersonal
}) => {
  // Calcular total de dias
  const totalDias = useMemo(() => {
    return listaPersonal.reduce((sum, p) => sum + (p.diasEstimados || 0), 0)
  }, [listaPersonal])

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
          <h2 className="text-base sm:text-lg font-semibold">Personal Requerido</h2>
          {editMode && listaPersonal.length > 0 && (
            <button
              onClick={handleGuardarPersonal}
              className="btn-primary text-sm"
            >
              Guardar Personal
            </button>
          )}
        </div>

        {/* Formulario para agregar personal */}
        {editMode && (
          <div className="bg-gray-50 p-3 sm:p-4 rounded-lg mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Agregar Personal</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* Especialidad */}
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Especialidad</label>
                {!mostrarInputEspecialidad ? (
                  <select
                    className="input-field"
                    value={nuevaPersona.especialidad}
                    onChange={(e) => handleEspecialidadChange(e.target.value)}
                  >
                    <option value="">Seleccionar especialidad...</option>
                    {ESPECIALIDADES_PERSONAL.map((esp, idx) => (
                      <option key={idx} value={esp}>{esp}</option>
                    ))}
                  </select>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="input-field flex-1"
                      placeholder="Escribir especialidad personalizada..."
                      value={especialidadPersonalizada}
                      onChange={(e) => setEspecialidadPersonalizada(e.target.value)}
                    />
                    <button
                      onClick={() => {
                        handleEspecialidadChange('')
                        setEspecialidadPersonalizada('')
                      }}
                      className="btn-secondary text-sm"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>

              {/* Dias estimados */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Dias estimados</label>
                <input
                  type="number"
                  className="input-field"
                  min="1"
                  value={nuevaPersona.diasEstimados}
                  onChange={(e) => setNuevaPersona({ ...nuevaPersona, diasEstimados: e.target.value === '' ? '' : parseInt(e.target.value) || '' })}
                />
              </div>

              {/* Boton agregar */}
              <div className="flex items-end">
                <button
                  onClick={handleAgregarPersona}
                  className="btn-primary w-full"
                >
                  + Agregar
                </button>
              </div>
            </div>

            {/* Observaciones para la persona */}
            <div className="mt-3">
              <label className="block text-xs text-gray-500 mb-1">Observaciones (opcional)</label>
              <input
                type="text"
                className="input-field"
                placeholder="Observaciones sobre este personal..."
                value={nuevaPersona.observaciones}
                onChange={(e) => setNuevaPersona({ ...nuevaPersona, observaciones: e.target.value })}
              />
            </div>
          </div>
        )}

        {/* Lista de personal */}
        {listaPersonal && listaPersonal.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Especialidad
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dias Estimados
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Observaciones
                  </th>
                  {editMode && (
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {listaPersonal.map((persona) => (
                  <tr key={persona.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <span className="inline-flex items-center">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                        {persona.especialidad}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {persona.diasEstimados} dias
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {persona.observaciones || '-'}
                    </td>
                    {editMode && (
                      <td className="px-4 py-3 text-sm text-center">
                        <button
                          onClick={() => handleEliminarPersona(persona.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Eliminar"
                        >
                          <svg className="w-4 h-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                    Total: {listaPersonal.length} personas
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-center">
                    {totalDias} dias
                  </td>
                  <td colSpan={editMode ? 2 : 1}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">
            No se ha agregado personal requerido
          </p>
        )}

        {/* Requerimientos adicionales */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Requerimientos Adicionales</h3>
          {editMode ? (
            <textarea
              className="input-field"
              rows="3"
              value={requerimientosAdicionales}
              onChange={(e) => setRequerimientosAdicionales(e.target.value)}
              placeholder="EPP especial, certificaciones requeridas, horarios especiales, etc."
            />
          ) : (
            <p className="text-gray-600">
              {requerimientosAdicionales || 'Sin requerimientos adicionales especificados'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
})

TabPersonal.displayName = 'TabPersonal'

export default TabPersonal
