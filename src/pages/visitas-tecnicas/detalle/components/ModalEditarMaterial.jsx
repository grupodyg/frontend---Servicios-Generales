import React, { memo } from 'react'

const ModalEditarMaterial = memo(({
  materialEditando,
  setMaterialEditando,
  mostrarModalEditarMaterial,
  handleCerrarModalEditarMaterial,
  handleGuardarMaterialEditado
}) => {
  if (!mostrarModalEditarMaterial || !materialEditando) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3">
      <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full">
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Editar Material</h3>

        <div className="space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input
              type="text"
              className="input-field"
              value={materialEditando.nombre}
              onChange={(e) => setMaterialEditando({ ...materialEditando, nombre: e.target.value })}
            />
          </div>

          {/* Cantidad */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
            <input
              type="number"
              className="input-field"
              min="1"
              value={materialEditando.cantidad}
              onChange={(e) => setMaterialEditando({ ...materialEditando, cantidad: parseInt(e.target.value) || 1 })}
            />
          </div>

          {/* Unidad */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
            <select
              className="input-field"
              value={materialEditando.unidad}
              onChange={(e) => setMaterialEditando({ ...materialEditando, unidad: e.target.value })}
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

          {/* Precio unitario */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Precio unitario (S/.)</label>
            <input
              type="number"
              className="input-field"
              min="0"
              step="0.01"
              value={materialEditando.precioUnitario}
              onChange={(e) => setMaterialEditando({ ...materialEditando, precioUnitario: parseFloat(e.target.value) || 0 })}
            />
          </div>

          {/* Subtotal calculado */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">Subtotal:</p>
            <p className="text-lg font-bold text-gray-900">
              S/. {(materialEditando.cantidad * materialEditando.precioUnitario).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Botones */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-4 sm:mt-6">
          <button
            onClick={handleCerrarModalEditarMaterial}
            className="btn-secondary w-full sm:w-auto"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardarMaterialEditado}
            className="btn-primary w-full sm:w-auto"
          >
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  )
})

ModalEditarMaterial.displayName = 'ModalEditarMaterial'

export default ModalEditarMaterial
