import React, { memo, useMemo } from 'react'
import { MATERIALES_COMUNES } from '../hooks/useVisitaDetalle'
import { canViewPrices } from '../../../../utils/permissionsUtils'

const TabMateriales = memo(({
  user,
  visitaActual,
  materiales,
  nuevoMaterial,
  setNuevoMaterial,
  inputMaterial,
  mostrarDropdown,
  materialDelInventario,
  editMode,
  handleInputMaterialChange,
  handleSeleccionarMaterial,
  handleFocusInput,
  handleBlurInput,
  handleAgregarMaterial,
  handleEliminarMaterial,
  handleAbrirModalEditarMaterial
}) => {
  // Combinar materiales del inventario con materiales comunes
  const opcionesMateriales = useMemo(() => {
    const materialesInventario = materiales?.map(m => ({
      ...m,
      esInventario: true
    })) || []

    const materialesComunes = MATERIALES_COMUNES.map(nombre => ({
      nombre,
      name: nombre,
      esInventario: false
    }))

    return [...materialesInventario, ...materialesComunes]
  }, [materiales])

  // Filtrar opciones basadas en el input
  const opcionesFiltradas = useMemo(() => {
    if (!inputMaterial) return opcionesMateriales.slice(0, 10)
    const busqueda = inputMaterial.toLowerCase()
    return opcionesMateriales.filter(m =>
      (m.name || m.nombre).toLowerCase().includes(busqueda)
    ).slice(0, 10)
  }, [inputMaterial, opcionesMateriales])

  // Calcular totales
  const totales = useMemo(() => {
    const items = visitaActual.materialesEstimados || []
    const totalItems = items.length
    const totalCosto = items.reduce((sum, m) => sum + (m.cantidad * (m.precioUnitario || 0)), 0)
    return { totalItems, totalCosto }
  }, [visitaActual.materialesEstimados])

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Materiales Estimados</h2>

        {/* Formulario para agregar material */}
        {editMode && (
          <div className="bg-gray-50 p-3 sm:p-4 rounded-lg mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Agregar Material</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* Input con autocomplete */}
              <div className="relative md:col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Nombre del material</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Buscar o escribir material..."
                  value={inputMaterial}
                  onChange={(e) => handleInputMaterialChange(e.target.value)}
                  onFocus={handleFocusInput}
                  onBlur={handleBlurInput}
                />
                {materialDelInventario && (
                  <span className="absolute right-2 top-7 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                    Inventario
                  </span>
                )}

                {/* Dropdown de opciones */}
                {mostrarDropdown && opcionesFiltradas.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {opcionesFiltradas.map((material, idx) => (
                      <div
                        key={idx}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center"
                        onMouseDown={() => handleSeleccionarMaterial(material)}
                      >
                        <span>{material.name || material.nombre}</span>
                        {material.esInventario && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                            Stock: {material.quantity || material.available_quantity || 0}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cantidad */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Cantidad</label>
                <input
                  type="number"
                  className="input-field"
                  min="1"
                  value={nuevoMaterial.cantidad}
                  onChange={(e) => setNuevoMaterial({ ...nuevoMaterial, cantidad: parseInt(e.target.value) || 1 })}
                />
              </div>

              {/* Unidad */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Unidad</label>
                <select
                  className="input-field"
                  value={nuevoMaterial.unidad}
                  onChange={(e) => setNuevoMaterial({ ...nuevoMaterial, unidad: e.target.value })}
                >
                  <option value="unidad">Unidad</option>
                  <option value="metro">Metro</option>
                  <option value="kg">Kilogramo</option>
                  <option value="litro">Litro</option>
                  <option value="rollo">Rollo</option>
                  <option value="caja">Caja</option>
                  <option value="bolsa">Bolsa</option>
                </select>
              </div>
            </div>

            {/* Precio unitario */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mt-3">
              {canViewPrices(user) && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Precio unitario (S/.)</label>
                  <input
                    type="number"
                    className="input-field"
                    min="0"
                    step="0.01"
                    value={nuevoMaterial.precioUnitario}
                    onChange={(e) => setNuevoMaterial({ ...nuevoMaterial, precioUnitario: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              )}
              <div className="flex items-end">
                <button
                  onClick={handleAgregarMaterial}
                  className="btn-primary w-full"
                >
                  + Agregar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lista de materiales */}
        {visitaActual.materialesEstimados && visitaActual.materialesEstimados.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Material
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cantidad
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unidad
                  </th>
                  {canViewPrices(user) && (
                    <>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        P. Unit.
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Subtotal
                      </th>
                    </>
                  )}
                  {editMode && (
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {visitaActual.materialesEstimados.map((material) => (
                  <tr key={material.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {material.nombre}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-center">
                      {material.cantidad}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 text-center">
                      {material.unidad}
                    </td>
                    {canViewPrices(user) && (
                      <>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">
                          S/. {(material.precioUnitario || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                          S/. {(material.cantidad * (material.precioUnitario || 0)).toFixed(2)}
                        </td>
                      </>
                    )}
                    {editMode && (
                      <td className="px-4 py-3 text-sm text-center">
                        <button
                          onClick={() => handleAbrirModalEditarMaterial(material)}
                          className="text-blue-600 hover:text-blue-800 mr-2"
                          title="Editar"
                        >
                          <svg className="w-4 h-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleEliminarMaterial(material.id)}
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
              {canViewPrices(user) && (
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={editMode ? 4 : 4} className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                      Total ({totales.totalItems} items):
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                      S/. {totales.totalCosto.toFixed(2)}
                    </td>
                    {editMode && <td></td>}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">
            No se han agregado materiales estimados
          </p>
        )}
      </div>
    </div>
  )
})

TabMateriales.displayName = 'TabMateriales'

export default TabMateriales
