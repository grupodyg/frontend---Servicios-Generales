import React, { memo, useMemo } from 'react'
import { canViewPrices } from '../../../../utils/permissionsUtils'

const TabHerramientas = memo(({
  user,
  herramientas,
  herramientasInventario,
  nuevaHerramienta,
  setNuevaHerramienta,
  herramientaSeleccionadaInventario,
  inputHerramienta,
  mostrarDropdownHerramienta,
  editMode,
  handleInputHerramientaChange,
  handleSeleccionarHerramienta,
  handleFocusInputHerramienta,
  handleBlurInputHerramienta,
  handleAgregarHerramienta,
  handleEliminarHerramienta,
  handleGuardarHerramientas
}) => {
  // Filtrar herramientas del inventario basadas en el input
  const opcionesFiltradas = useMemo(() => {
    if (!inputHerramienta) return herramientasInventario.slice(0, 10)
    const busqueda = inputHerramienta.toLowerCase()
    return herramientasInventario.filter(h =>
      (h.name || h.nombre).toLowerCase().includes(busqueda)
    ).slice(0, 10)
  }, [inputHerramienta, herramientasInventario])

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Herramientas Requeridas</h2>
          {editMode && herramientas.length > 0 && (
            <button
              onClick={handleGuardarHerramientas}
              className="btn-primary text-sm"
            >
              Guardar Herramientas
            </button>
          )}
        </div>

        {/* Formulario para agregar herramienta */}
        {editMode && (
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Agregar Herramienta</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Input con autocomplete */}
              <div className="relative md:col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Nombre de la herramienta</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Buscar herramienta del inventario..."
                  value={inputHerramienta}
                  onChange={(e) => handleInputHerramientaChange(e.target.value)}
                  onFocus={handleFocusInputHerramienta}
                  onBlur={handleBlurInputHerramienta}
                />
                {herramientaSeleccionadaInventario && (
                  <span className="absolute right-2 top-7 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                    Stock: {herramientaSeleccionadaInventario.available_quantity || herramientaSeleccionadaInventario.cantidad || 0}
                  </span>
                )}

                {/* Dropdown de opciones */}
                {mostrarDropdownHerramienta && opcionesFiltradas.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {opcionesFiltradas.map((herramienta, idx) => (
                      <div
                        key={idx}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center"
                        onMouseDown={() => handleSeleccionarHerramienta(herramienta)}
                      >
                        <span>{herramienta.name || herramienta.nombre}</span>
                        <div className="flex gap-2">
                          {canViewPrices(user) && herramienta.valor > 0 && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                              S/ {herramienta.valor.toFixed(2)}
                            </span>
                          )}
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                            Stock: {herramienta.available_quantity || herramienta.cantidad || 0}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cantidad */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Cantidad</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    className="input-field flex-1"
                    min="1"
                    value={nuevaHerramienta.cantidad}
                    onChange={(e) => setNuevaHerramienta({ ...nuevaHerramienta, cantidad: parseInt(e.target.value) || 1 })}
                  />
                  <button
                    onClick={handleAgregarHerramienta}
                    className="btn-primary"
                  >
                    + Agregar
                  </button>
                </div>
              </div>
            </div>

            {herramientaSeleccionadaInventario && (
              <p className="text-xs text-gray-500 mt-2">
                <span className="text-amber-600">Nota:</span> La cantidad solicitada se validara contra el stock disponible.
              </p>
            )}
          </div>
        )}

        {/* Lista de herramientas */}
        {herramientas && herramientas.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Herramienta
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cantidad
                  </th>
                  {canViewPrices(user) && (
                    <>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Valor Unit.
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Subtotal
                      </th>
                    </>
                  )}
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Origen
                  </th>
                  {editMode && (
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {herramientas.map((herramienta) => (
                  <tr key={herramienta.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {herramienta.nombre}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-center">
                      {herramienta.cantidad}
                    </td>
                    {canViewPrices(user) && (
                      <>
                        <td className="px-4 py-3 text-sm text-gray-700 text-right">
                          {herramienta.valor > 0 ? `S/ ${herramienta.valor.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium text-right">
                          {herramienta.valor > 0 ? `S/ ${(herramienta.valorTotal || herramienta.valor * herramienta.cantidad).toFixed(2)}` : '-'}
                        </td>
                      </>
                    )}
                    <td className="px-4 py-3 text-sm text-center">
                      {herramienta.inventarioId ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          Inventario
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          Manual
                        </span>
                      )}
                    </td>
                    {editMode && (
                      <td className="px-4 py-3 text-sm text-center">
                        <button
                          onClick={() => handleEliminarHerramienta(herramienta.id)}
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
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                      Total: {herramientas.length} herramientas
                    </td>
                    <td></td>
                    <td></td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                      S/ {herramientas.reduce((acc, h) => acc + (h.valorTotal || (h.valor || 0) * h.cantidad), 0).toFixed(2)}
                    </td>
                    <td colSpan={editMode ? 2 : 1}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">
            No se han agregado herramientas requeridas
          </p>
        )}
      </div>
    </div>
  )
})

TabHerramientas.displayName = 'TabHerramientas'

export default TabHerramientas
