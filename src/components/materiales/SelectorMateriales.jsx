import { useState, useEffect, useRef } from 'react'
import useMaterialesStore from '../../stores/materialesStore'
import useAuthStore from '../../stores/authStore'
import { canViewPrices } from '../../utils/permissionsUtils'

const SelectorMateriales = ({ materialesSeleccionados = [], onMaterialesChange }) => {
  const { materiales, fetchMateriales, categorias, fetchCategorias, isLoading } = useMaterialesStore()
  const { user } = useAuthStore()
  const [busqueda, setBusqueda] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas')
  const [materialesLocal, setMaterialesLocal] = useState(materialesSeleccionados)
  const debounceTimer = useRef(null)

  // Cargar categorías y materiales iniciales
  useEffect(() => {
    const loadInitialData = async () => {
      await fetchCategorias()
      await fetchMateriales({ status: 'available' })
    }
    loadInitialData()
  }, [fetchCategorias, fetchMateriales])

  useEffect(() => {
    setMaterialesLocal(materialesSeleccionados)
  }, [materialesSeleccionados])

  // Filtro de categoría instantáneo (sin debounce)
  useEffect(() => {
    const filters = {
      status: 'available'
    }

    if (categoriaFiltro && categoriaFiltro !== 'todas') {
      filters.category_id = categoriaFiltro
    }

    if (busqueda) {
      filters.search = busqueda
    }

    fetchMateriales(filters)
  }, [categoriaFiltro, fetchMateriales])

  // Búsqueda de texto con debounce reducido
  useEffect(() => {
    // Limpiar el timer anterior
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    // Solo aplicar debounce si hay búsqueda
    if (busqueda) {
      debounceTimer.current = setTimeout(() => {
        const filters = {
          status: 'available',
          search: busqueda
        }

        if (categoriaFiltro && categoriaFiltro !== 'todas') {
          filters.category_id = categoriaFiltro
        }

        fetchMateriales(filters)
      }, 300) // Reducido a 300ms para mejor UX
    }

    // Cleanup function
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [busqueda, categoriaFiltro, fetchMateriales])

  // Filtrar materiales que tengan stock disponible
  const materialesFiltrados = (materiales || []).filter(m => m?.stockActual > 0)

  const handleAgregarMaterial = (material) => {
    const materialExistente = materialesLocal.find(m => m.id === material.id)

    if (materialExistente) {
      // Verificar que no se exceda el stock disponible
      if (materialExistente.cantidad >= material.stockActual) {
        alert(`Stock máximo disponible: ${material.stockActual} ${material.unidad || 'unidades'}`)
        return
      }
      // Si ya existe, incrementar cantidad
      const nuevosMaterieles = materialesLocal.map(m =>
        m.id === material.id
          ? { ...m, cantidad: m.cantidad + 1 }
          : m
      )
      setMaterialesLocal(nuevosMaterieles)
      onMaterialesChange(nuevosMaterieles)
    } else {
      // Verificar que haya stock disponible
      if (material.stockActual < 1) {
        alert('Este material no tiene stock disponible')
        return
      }
      // Si no existe, agregar nuevo
      const nuevoMaterial = {
        ...material,
        cantidad: 1
      }
      const nuevosMaterieles = [...materialesLocal, nuevoMaterial]
      setMaterialesLocal(nuevosMaterieles)
      onMaterialesChange(nuevosMaterieles)
    }
  }

  const handleActualizarCantidad = (id, cantidad) => {
    if (cantidad <= 0) {
      handleEliminarMaterial(id)
      return
    }

    const material = (materiales || []).find(m => m.id === id)
    if (material && cantidad > material.stockActual) {
      alert(`Stock máximo disponible: ${material.stockActual} ${material.unidad}`)
      return
    }

    const nuevosMaterieles = materialesLocal.map(m => 
      m.id === id ? { ...m, cantidad } : m
    )
    setMaterialesLocal(nuevosMaterieles)
    onMaterialesChange(nuevosMaterieles)
  }

  const handleEliminarMaterial = (id) => {
    const nuevosMaterieles = materialesLocal.filter(m => m.id !== id)
    setMaterialesLocal(nuevosMaterieles)
    onMaterialesChange(nuevosMaterieles)
  }

  const calcularTotal = () => {
    return materialesLocal.reduce((total, material) => {
      return total + (material.precioUnitario * material.cantidad)
    }, 0)
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Buscar Material
          </label>
          <input
            type="text"
            className="input-field"
            placeholder="Buscar por nombre o descripción..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Categoría
          </label>
          <select
            className="input-field"
            value={categoriaFiltro}
            onChange={(e) => setCategoriaFiltro(e.target.value)}
          >
            <option value="todas">Todas las categorías</option>
            {(categorias || []).map(cat => (
              <option key={cat.id} value={cat.id}>{cat.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista de materiales disponibles */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-sm font-semibold text-gray-700">
            Materiales Disponibles en Inventario
          </h3>
          {isLoading && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          )}
        </div>

        <div className="max-h-64 overflow-y-auto">
          {!isLoading && materialesFiltrados.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              No se encontraron materiales disponibles
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {materialesFiltrados.map(material => {
                const yaAgregado = materialesLocal.find(m => m.id === material.id)
                
                return (
                  <div key={material.id} className="px-4 py-3 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-gray-900">{material.nombre}</h4>
                          <span className="text-xs text-gray-500">({material.id})</span>
                        </div>
                        <p className="text-sm text-gray-600">{material.descripcion}</p>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-xs text-gray-500">
                            Stock: {material.stockActual} {material.unidad}
                          </span>
                          {canViewPrices(user) && (
                            <span className="text-xs text-gray-500">
                              Precio: S/ {material.precioUnitario.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => handleAgregarMaterial(material)}
                        className={`ml-4 px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                          yaAgregado
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {yaAgregado ? `+1 (${yaAgregado.cantidad})` : 'Agregar'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Materiales seleccionados */}
      {materialesLocal.length > 0 && (
        <div className="border border-blue-200 rounded-lg overflow-hidden bg-blue-50">
          <div className="bg-blue-100 px-4 py-2 border-b border-blue-200">
            <h3 className="text-sm font-semibold text-blue-900">
              Materiales Seleccionados ({materialesLocal.length})
            </h3>
          </div>
          
          <div className="p-4 space-y-3">
            {materialesLocal.map(material => (
              <div key={material.id} className="bg-white rounded-lg p-3 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{material.nombre}</h4>
                    {canViewPrices(user) && (
                      <p className="text-sm text-gray-600">
                        S/ {material.precioUnitario.toFixed(2)} x {material.cantidad} =
                        <span className="font-semibold ml-1">
                          S/ {(material.precioUnitario * material.cantidad).toFixed(2)}
                        </span>
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <input
                      type="number"
                      min="1"
                      max={Math.max(1, material.stockActual || 1)}
                      value={material.cantidad}
                      onChange={(e) => handleActualizarCantidad(material.id, parseInt(e.target.value) || 0)}
                      className="w-20 px-2 py-1 border border-gray-300 rounded-md text-center"
                    />
                    <span className="text-sm text-gray-500">{material.unidad}</span>
                    <button
                      type="button"
                      onClick={() => handleEliminarMaterial(material.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Total */}
            {canViewPrices(user) && (
              <div className="border-t border-blue-200 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">Total Estimado:</span>
                  <span className="text-xl font-bold text-blue-600">
                    S/ {calcularTotal().toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default SelectorMateriales