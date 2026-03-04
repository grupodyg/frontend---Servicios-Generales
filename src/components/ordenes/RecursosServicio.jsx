import { useState, useEffect, useMemo } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import useMaterialesStore from '../../stores/materialesStore'
import useTecnicosStore from '../../stores/tecnicosStore'
import useHerramientasStore from '../../stores/herramientasStore'
import useAuthStore from '../../stores/authStore'
import { canViewPrices, canEditPrices } from '../../utils/permissionsUtils'

const RecursosServicio = ({ recursos = {}, onRecursosChange, ordenId, readOnly = false }) => {
  const { materiales = [], fetchMateriales } = useMaterialesStore()
  const { tecnicos = [], fetchTecnicos } = useTecnicosStore()
  const { herramientas: herramientasInventario = [], fetchHerramientas } = useHerramientasStore()
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState('materiales')

  // Estado para búsqueda de herramientas
  const [busquedaHerramienta, setBusquedaHerramienta] = useState('')
  const [mostrarDropdownHerramienta, setMostrarDropdownHerramienta] = useState(false)
  
  // Ensure recursos has default structure
  const safeRecursos = {
    materiales: recursos?.materiales || [],
    herramientas: recursos?.herramientas || [],
    manoObra: {
      diasEstimados: recursos?.manoObra?.diasEstimados || 3,
      numeroPersonas: recursos?.manoObra?.numeroPersonas || 2,
      personal: recursos?.manoObra?.personal || []
    }
  }

  const {
    register,
    control,
    watch,
    setValue,
    handleSubmit,
    getValues
  } = useForm({
    defaultValues: safeRecursos
  })

  const { fields: materialesFields, append: appendMaterial, remove: removeMaterial } = useFieldArray({
    control,
    name: 'materiales'
  })

  const { fields: herramientasFields, append: appendHerramienta, remove: removeHerramienta } = useFieldArray({
    control,
    name: 'herramientas'
  })

  const { fields: personalFields, append: appendPersonal, remove: removePersonal } = useFieldArray({
    control,
    name: 'manoObra.personal'
  })

  const watchedValues = watch()

  useEffect(() => {
    try {
      if (typeof fetchMateriales === 'function') fetchMateriales()
      if (typeof fetchTecnicos === 'function') fetchTecnicos()
      if (typeof fetchHerramientas === 'function') fetchHerramientas()
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }, [fetchMateriales, fetchTecnicos, fetchHerramientas])

  // Filtrar herramientas del inventario basadas en la búsqueda y que tengan stock disponible
  const herramientasFiltradas = useMemo(() => {
    // Filtrar solo herramientas con cantidad disponible > 0
    const herramientasConStock = herramientasInventario.filter(h => {
      const cantidad = h.cantidad || h.available_quantity || 0
      return cantidad > 0
    })

    if (!busquedaHerramienta) return herramientasConStock.slice(0, 10)
    const busqueda = busquedaHerramienta.toLowerCase()
    return herramientasConStock.filter(h =>
      (h.nombre || h.name || '').toLowerCase().includes(busqueda)
    ).slice(0, 10)
  }, [busquedaHerramienta, herramientasInventario])

  // Serializar valores para detectar cambios profundos (incluyendo cambios en cantidades)
  const watchedValuesSerialized = JSON.stringify(watchedValues)

  useEffect(() => {
    // No actualizar si está en modo solo lectura (orden completada)
    if (readOnly) return

    if (onRecursosChange && typeof onRecursosChange === 'function') {
      // Debounce reducido para actualizar más rápido el costo estimado
      const timeoutId = setTimeout(() => {
        onRecursosChange(watchedValues)
      }, 100)

      return () => clearTimeout(timeoutId)
    }
  }, [watchedValuesSerialized, onRecursosChange, readOnly])

  const agregarMaterialInventario = (material) => {
    // Verificar si el material ya existe en la lista usando watchedValues (valores actuales)
    const materialesActuales = watchedValues.materiales || []
    const existingIndex = materialesActuales.findIndex(m => m.id === material.id)

    if (existingIndex >= 0) {
      // Si ya existe, incrementar la cantidad
      const currentCantidad = parseFloat(materialesActuales[existingIndex]?.cantidad) || 1
      const newCantidad = currentCantidad + 1

      // Validar que no exceda el stock disponible
      if (newCantidad > material.stockActual) {
        alert(`Stock máximo disponible: ${material.stockActual} ${material.unidadMedida || material.unidad || 'unidades'}`)
        return
      }

      setValue(`materiales.${existingIndex}.cantidad`, newCantidad)
    } else {
      // Si no existe, agregar nuevo
      appendMaterial({
        id: material.id,
        nombre: material.nombre,
        cantidad: 1,
        unidad: material.unidadMedida || material.unidad,
        precio: material.precioUnitario,
        origen: 'inventario'
      })
    }
  }

  const agregarMaterialPersonalizado = () => {
    appendMaterial({
      nombre: '',
      cantidad: 1,
      unidad: 'unidad',
      precio: 0,
      origen: 'personalizado'
    })
  }

  const agregarHerramientaPersonalizada = () => {
    appendHerramienta({
      nombre: '',
      cantidad: 1,
      unidad: 'unidad',
      precio: 0,
      observaciones: '',
      origen: 'personalizado'
    })
  }

  const agregarHerramientaInventario = (herramienta) => {
    // Verificar si la herramienta ya existe en la lista usando watchedValues
    const herramientasActuales = watchedValues.herramientas || []
    const existingIndex = herramientasActuales.findIndex(h => h.id === herramienta.id)
    const stockDisponible = herramienta.cantidad || herramienta.available_quantity || 0

    if (existingIndex >= 0) {
      // Si ya existe, incrementar la cantidad
      const currentCantidad = parseFloat(herramientasActuales[existingIndex]?.cantidad) || 1
      const newCantidad = currentCantidad + 1

      // Validar que no exceda el stock disponible
      if (newCantidad > stockDisponible) {
        alert(`Stock máximo disponible: ${stockDisponible} unidades`)
        setBusquedaHerramienta('')
        setMostrarDropdownHerramienta(false)
        return
      }

      setValue(`herramientas.${existingIndex}.cantidad`, newCantidad)
    } else {
      // Si no existe, agregar nuevo
      appendHerramienta({
        id: herramienta.id,
        nombre: herramienta.nombre || herramienta.name,
        cantidad: 1,
        unidad: 'unidad',
        precio: herramienta.valor || 0,
        observaciones: '',
        origen: 'inventario',
        stockDisponible: stockDisponible
      })
    }
    setBusquedaHerramienta('')
    setMostrarDropdownHerramienta(false)
  }

  const agregarPersonal = () => {
    appendPersonal({
      tecnicoId: '',
      nombre: '',
      rol: 'tecnico',
      horasDiarias: 8
    })
  }

  const calcularTotalMateriales = () => {
    return watchedValues?.materiales?.reduce((total, material) => {
      const cantidad = parseFloat(material?.cantidad) || 0
      const precio = parseFloat(material?.precio) || 0
      return total + (cantidad * precio)
    }, 0) || 0
  }

  const calcularTotalHerramientas = () => {
    return watchedValues?.herramientas?.reduce((total, herramienta) => {
      const cantidad = parseFloat(herramienta?.cantidad) || 0
      const precio = parseFloat(herramienta?.precio) || 0
      return total + (cantidad * precio)
    }, 0) || 0
  }

  const calcularTotalHorasPersonal = () => {
    const diasEstimados = parseFloat(watchedValues?.manoObra?.diasEstimados) || 0
    return watchedValues?.manoObra?.personal?.reduce((total, persona) => {
      const horasDiarias = parseFloat(persona?.horasDiarias) || 0
      return total + (horasDiarias * diasEstimados)
    }, 0) || 0
  }

  const tabs = [
    { id: 'materiales', name: 'Materiales', icon: '📦' },
    { id: 'herramientas', name: 'Herramientas', icon: '🔧' },
    { id: 'manoobra', name: 'Mano de Obra', icon: '👷' }
  ]

  // Add error boundary
  if (!ordenId) {
    return (
      <div className="card">
        <p className="text-center text-gray-500">Cargando recursos del servicio...</p>
      </div>
    )
  }

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Recursos del Servicio
      </h2>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'materiales' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-md font-medium text-gray-900">Lista de Materiales</h3>
            <div className="space-x-2">
              <button
                type="button"
                onClick={agregarMaterialPersonalizado}
                className="btn-secondary text-sm"
                disabled={readOnly}
                title={readOnly ? 'Orden completada - Solo lectura' : ''}
              >
                + Material Personalizado
              </button>
            </div>
          </div>

          {/* Materiales del inventario */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-3">Seleccionar del Inventario</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-48 overflow-y-auto">
              {materiales && Array.isArray(materiales) && materiales.filter(m => m?.stockActual > 0).map(material => {
                const materialesActuales = watchedValues.materiales || []
                const existingIndex = materialesActuales.findIndex(m => m.id === material.id)
                const cantidadActual = existingIndex >= 0 ? (parseFloat(materialesActuales[existingIndex]?.cantidad) || 0) : 0

                return (
                  <div key={material.id} className={`bg-white p-3 rounded border ${existingIndex >= 0 ? 'border-green-300 bg-green-50' : ''}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-sm text-gray-900">{material.nombre}</p>
                        <p className="text-xs text-gray-500">Stock: {material.stockActual} {material.unidadMedida || material.unidad}</p>
                        {canViewPrices(user) && (
                          <p className="text-xs text-blue-600">S/{material.precioUnitario}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => agregarMaterialInventario(material)}
                        disabled={readOnly}
                        className={`ml-2 px-2 py-1 rounded text-xs ${
                          readOnly
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : existingIndex >= 0
                              ? 'bg-green-600 text-white hover:bg-green-700'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {existingIndex >= 0 ? `+1 (${cantidadActual})` : '+'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Lista de materiales agregados */}
          <div className="space-y-3">
            {materialesFields.map((field, index) => (
              <div key={field.id} className="bg-gray-50 p-4 rounded-lg border">
                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-4">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Material
                    </label>
                    <input
                      type="text"
                      className="input-field text-sm"
                      disabled={readOnly}
                      {...register(`materiales.${index}.nombre`, { required: true })}
                      placeholder="Nombre del material"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Cantidad
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="input-field text-sm"
                      disabled={readOnly}
                      {...register(`materiales.${index}.cantidad`, {
                        required: true,
                        valueAsNumber: true
                      })}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Unidad
                    </label>
                    <select className="input-field text-sm" disabled={readOnly} {...register(`materiales.${index}.unidad`)}>
                      <option value="unidad">Unidad</option>
                      <option value="metro">Metro</option>
                      <option value="kg">Kilogramo</option>
                      <option value="litro">Litro</option>
                      <option value="caja">Caja</option>
                      <option value="rollo">Rollo</option>
                    </select>
                  </div>
                  {canViewPrices(user) && (
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Precio Unit.
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="input-field text-sm"
                        disabled={readOnly}
                        {...register(`materiales.${index}.precio`, {
                          required: true,
                          valueAsNumber: true
                        })}
                      />
                    </div>
                  )}
                  {canViewPrices(user) && (
                    <div className="col-span-1">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Subtotal
                      </label>
                      <p className="text-sm font-medium text-gray-900 py-2">
                        S/{((watchedValues.materiales?.[index]?.cantidad || 0) *
                            (watchedValues.materiales?.[index]?.precio || 0)).toFixed(2)}
                      </p>
                    </div>
                  )}
                  <div className="col-span-1">
                    <button
                      type="button"
                      onClick={() => removeMaterial(index)}
                      disabled={readOnly}
                      className={`py-2 ${readOnly ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 hover:text-red-700'}`}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Total de materiales */}
          {canViewPrices(user) && (
            <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
              <div className="flex justify-between items-center">
                <span className="font-medium text-blue-900">Total Materiales:</span>
                <span className="text-xl font-bold text-blue-600">
                  S/{calcularTotalMateriales().toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'herramientas' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-md font-medium text-gray-900">Herramientas Necesarias</h3>
            <button
              type="button"
              onClick={agregarHerramientaPersonalizada}
              className="btn-secondary text-sm"
              disabled={readOnly}
              title={readOnly ? 'Orden completada - Solo lectura' : ''}
            >
              + Herramienta Manual
            </button>
          </div>

          {/* Buscar herramienta del inventario */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-900 mb-3">Buscar en Inventario</h4>
            <div className="relative">
              <input
                type="text"
                className="input-field"
                placeholder={readOnly ? 'Solo lectura' : 'Escriba para buscar herramientas...'}
                value={busquedaHerramienta}
                onChange={(e) => setBusquedaHerramienta(e.target.value)}
                onFocus={() => !readOnly && setMostrarDropdownHerramienta(true)}
                onBlur={() => setTimeout(() => setMostrarDropdownHerramienta(false), 200)}
                disabled={readOnly}
              />

              {/* Dropdown de resultados */}
              {mostrarDropdownHerramienta && herramientasFiltradas.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {herramientasFiltradas.map((herramienta) => (
                    <div
                      key={herramienta.id}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center"
                      onMouseDown={() => agregarHerramientaInventario(herramienta)}
                    >
                      <div>
                        <span className="text-sm font-medium">{herramienta.nombre || herramienta.name}</span>
                        {canViewPrices(user) && (
                          <span className="text-xs text-green-600 ml-2">S/{herramienta.valor || 0}</span>
                        )}
                      </div>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                        Stock: {herramienta.cantidad || herramienta.available_quantity || 0}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {mostrarDropdownHerramienta && herramientasFiltradas.length === 0 && busquedaHerramienta && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3">
                  <p className="text-sm text-gray-500 text-center">No se encontraron herramientas</p>
                </div>
              )}
            </div>
          </div>

          {/* Lista de herramientas agregadas */}
          <div className="space-y-3">
            {herramientasFields.map((field, index) => (
              <div key={field.id} className="bg-gray-50 p-4 rounded-lg border">
                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Herramienta
                    </label>
                    <input
                      type="text"
                      className="input-field text-sm"
                      disabled={readOnly}
                      {...register(`herramientas.${index}.nombre`, { required: true })}
                      placeholder="Nombre de la herramienta"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Cantidad
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="input-field text-sm"
                      disabled={readOnly}
                      {...register(`herramientas.${index}.cantidad`, {
                        required: true,
                        valueAsNumber: true
                      })}
                    />
                  </div>
                  {canViewPrices(user) && (
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Precio Unit.
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="input-field text-sm"
                        disabled={readOnly}
                        {...register(`herramientas.${index}.precio`, {
                          required: true,
                          valueAsNumber: true
                        })}
                      />
                    </div>
                  )}
                  {canViewPrices(user) && (
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Subtotal
                      </label>
                      <p className="text-sm font-medium text-gray-900 py-2">
                        S/{((watchedValues.herramientas?.[index]?.cantidad || 0) *
                            (watchedValues.herramientas?.[index]?.precio || 0)).toFixed(2)}
                      </p>
                    </div>
                  )}
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Observaciones
                    </label>
                    <input
                      type="text"
                      className="input-field text-sm"
                      disabled={readOnly}
                      {...register(`herramientas.${index}.observaciones`)}
                      placeholder="Opcional"
                    />
                  </div>
                  <div className="col-span-1">
                    <button
                      type="button"
                      onClick={() => removeHerramienta(index)}
                      disabled={readOnly}
                      className={`py-2 ${readOnly ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 hover:text-red-700'}`}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {herramientasFields.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>No se han agregado herramientas.</p>
              <p className="text-sm">Busca en el inventario o agrega una herramienta manual.</p>
            </div>
          )}

          {/* Total de herramientas */}
          {herramientasFields.length > 0 && canViewPrices(user) && (
            <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-500">
              <div className="flex justify-between items-center">
                <span className="font-medium text-yellow-900">Total Herramientas:</span>
                <span className="text-xl font-bold text-yellow-600">
                  S/{calcularTotalHerramientas().toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'manoobra' && (
        <div className="space-y-6">
          <h3 className="text-md font-medium text-gray-900">Planificación de Mano de Obra</h3>
          
          {/* Estimación de tiempo */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="font-medium text-amber-900 mb-3">Estimación del Servicio</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Días Estimados
                </label>
                <input
                  type="number"
                  min="1"
                  className="input-field"
                  disabled={readOnly}
                  {...register('manoObra.diasEstimados', {
                    required: true,
                    valueAsNumber: true
                  })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número de Personas
                </label>
                <input
                  type="number"
                  min="1"
                  className="input-field"
                  disabled={readOnly}
                  {...register('manoObra.numeroPersonas', {
                    required: true,
                    valueAsNumber: true
                  })}
                />
              </div>
            </div>
            <div className="mt-3 p-3 bg-white rounded border">
              <p className="text-sm font-medium text-gray-900">
                Demora del servicio: {watchedValues.manoObra?.diasEstimados || 0} días con {watchedValues.manoObra?.numeroPersonas || 0} personas
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Total de horas estimadas: {calcularTotalHorasPersonal()} horas
              </p>
            </div>
          </div>

          {/* Asignación de personal */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-medium text-gray-900">Personal Asignado</h4>
              <button
                type="button"
                onClick={agregarPersonal}
                className="btn-secondary text-sm"
                disabled={readOnly}
                title={readOnly ? 'Orden completada - Solo lectura' : ''}
              >
                + Asignar Personal
              </button>
            </div>

            <div className="space-y-3">
              {personalFields.map((field, index) => (
                <div key={field.id} className="bg-gray-50 p-4 rounded-lg border">
                  <div className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-4">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Técnico
                      </label>
                      <select
                        className="input-field text-sm"
                        disabled={readOnly}
                        {...register(`manoObra.personal.${index}.tecnicoId`)}
                        onChange={(e) => {
                          if (readOnly) return
                          const tecnico = tecnicos.find(t => t.id === e.target.value)
                          if (tecnico) {
                            setValue(`manoObra.personal.${index}.nombre`, tecnico.nombre)
                          }
                        }}
                      >
                        <option value="">Seleccionar técnico</option>
                        {tecnicos && Array.isArray(tecnicos) && tecnicos.map(tecnico => (
                          <option key={tecnico.id} value={tecnico.id}>
                            {tecnico.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-3">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Nombre
                      </label>
                      <input
                        type="text"
                        className="input-field text-sm"
                        disabled={readOnly}
                        {...register(`manoObra.personal.${index}.nombre`)}
                        placeholder="Nombre del trabajador"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Rol
                      </label>
                      <select className="input-field text-sm" disabled={readOnly} {...register(`manoObra.personal.${index}.rol`)}>
                        <option value="tecnico">Técnico</option>
                        <option value="supervisor">Supervisor</option>
                        <option value="auxiliar">Auxiliar</option>
                        <option value="especialista">Especialista</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Horas/Día
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="12"
                        className="input-field text-sm"
                        disabled={readOnly}
                        {...register(`manoObra.personal.${index}.horasDiarias`, {
                          required: true,
                          valueAsNumber: true
                        })}
                      />
                    </div>
                    <div className="col-span-1">
                      <button
                        type="button"
                        onClick={() => removePersonal(index)}
                        disabled={readOnly}
                        className={`py-2 ${readOnly ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 hover:text-red-700'}`}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {personalFields.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>No se ha asignado personal.</p>
                <p className="text-sm">Haz clic en "Asignar Personal" para comenzar.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default RecursosServicio