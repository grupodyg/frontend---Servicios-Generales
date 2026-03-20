import { useState, useEffect, useMemo, forwardRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { motion, AnimatePresence } from 'framer-motion'
import usePresupuestosStore from '../../stores/presupuestosStore'
import useClientesStore from '../../stores/clientesStore'
import useAuthStore from '../../stores/authStore'
import useConfigStore from '../../stores/configStore'
import useMaterialesStore from '../../stores/materialesStore'
import useHerramientasStore from '../../stores/herramientasStore'
import useSpecialtyRatesStore from '../../stores/specialtyRatesStore'
import { canViewPrices, canEditPrices } from '../../utils/permissionsUtils'
import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'

const MySwal = withReactContent(Swal)

// ============================================================
// COMPONENTES DE UI REUTILIZABLES
// ============================================================

// Stepper visual para navegación
const Stepper = ({ currentStep, steps, onStepClick }) => (
  <div className="flex items-center justify-center mb-4 sm:mb-8 overflow-x-auto">
    {steps.map((step, index) => (
      <div key={step.id} className="flex items-center">
        <motion.button
          type="button"
          onClick={() => onStepClick(index)}
          className={`
            relative flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full
            transition-all duration-300 font-semibold text-xs sm:text-sm
            ${currentStep === index
              ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-500/30'
              : currentStep > index
                ? 'bg-emerald-500 text-white'
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
            }
          `}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {currentStep > index ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <span>{index + 1}</span>
          )}
        </motion.button>

        <div className="hidden md:flex flex-col ml-3 mr-8">
          <span className={`text-xs font-medium uppercase tracking-wider ${
            currentStep >= index ? 'text-blue-600' : 'text-gray-400'
          }`}>
            Paso {index + 1}
          </span>
          <span className={`text-sm font-semibold ${
            currentStep >= index ? 'text-gray-800' : 'text-gray-400'
          }`}>
            {step.title}
          </span>
        </div>

        {index < steps.length - 1 && (
          <div className={`hidden md:block w-16 h-0.5 mr-4 rounded-full transition-colors duration-300 ${
            currentStep > index ? 'bg-emerald-500' : 'bg-gray-200'
          }`} />
        )}
      </div>
    ))}
  </div>
)

// Combobox mejorado con animaciones
const SmartCombobox = ({
  items,
  onSelect,
  placeholder,
  showPrice = true,
  userRole,
  user,
  isEditing = false,
  icon,
  emptyMessage = "No se encontraron resultados"
}) => {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const filteredItems = useMemo(() => {
    if (!query) return items.slice(0, 8)
    return items.filter(item =>
      item.nombre?.toLowerCase().includes(query.toLowerCase()) ||
      item.codigo?.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 8)
  }, [items, query])

  return (
    <div className="relative">
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
          {icon || (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>
        <input
          type="text"
          className="w-full pl-10 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-800 placeholder-gray-400
                     focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 outline-none"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-2 w-full bg-white rounded-xl shadow-2xl shadow-gray-200/50 border border-gray-100 overflow-hidden"
          >
            {filteredItems.length > 0 ? (
              <div className="max-h-64 overflow-y-auto py-2">
                {filteredItems.map((item, idx) => (
                  <motion.div
                    key={item.id || idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="px-3 py-2 mx-2 rounded-lg cursor-pointer hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50
                               transition-all duration-150 group"
                    onClick={() => {
                      onSelect(item)
                      setQuery('')
                      setIsOpen(false)
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate group-hover:text-blue-700 transition-colors">
                          {item.nombre}
                        </p>
                        {item.codigo && (
                          <p className="text-xs text-gray-400">{item.codigo}</p>
                        )}
                      </div>
                      {showPrice && canViewPrices(user) && (
                        <span className="ml-3 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg">
                          S/ {(item.precio || item.precioUnitario || 0).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm">{emptyMessage}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Card de item agregado (con forwardRef para AnimatePresence)
const ItemCard = forwardRef(({ item, index, type, onRemove, onQuantityChange, onPriceChange, userRole, user, isEditing, register, watch }, ref) => {
  const typeConfig = {
    material: { bg: 'from-blue-50 to-indigo-50', border: 'border-blue-200', icon: '📦', color: 'blue' },
    herramienta: { bg: 'from-amber-50 to-orange-50', border: 'border-amber-200', icon: '🔧', color: 'amber' },
    manoObra: { bg: 'from-emerald-50 to-green-50', border: 'border-emerald-200', icon: '👷', color: 'emerald' }
  }

  const config = typeConfig[type] || typeConfig.material

  // Observar valores en tiempo real del formulario para recalcular subtotal
  const cantidadActual = watch(`items.${index}.cantidad`) || 0
  const precioActual = watch(`items.${index}.precioUnitario`) || 0
  const subtotal = cantidadActual * precioActual

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, x: -100 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={`relative bg-gradient-to-br ${config.bg} ${config.border} border rounded-2xl p-4 group`}
    >
      {/* Badge de tipo */}
      <div className="absolute -top-2 -left-2">
        <span className="flex items-center justify-center w-8 h-8 bg-white rounded-full shadow-md text-lg">
          {config.icon}
        </span>
      </div>

      {/* Botón eliminar */}
      <motion.button
        type="button"
        onClick={onRemove}
        className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white rounded-full shadow-lg
                   opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </motion.button>

      <div className="ml-4">
        {/* Campos ocultos para datos del item */}
        <input type="hidden" {...register(`items.${index}.tipo`)} defaultValue={item.tipo} />
        <input type="hidden" {...register(`items.${index}.descripcion`)} defaultValue={item.descripcion} />
        <input type="hidden" {...register(`items.${index}.codigo`)} defaultValue={item.codigo} />
        <input type="hidden" {...register(`items.${index}.unidad`)} defaultValue={item.unidad} />

        {/* Nombre del item */}
        <h4 className="font-semibold text-gray-800 mb-3 pr-6">{item.descripcion}</h4>

        {/* Grid de campos */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Cantidad */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Cantidad</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              defaultValue={item.cantidad || 1}
              className="w-full px-3 py-2 bg-white/70 border border-gray-200 rounded-lg text-sm font-medium
                         focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all outline-none"
              {...register(`items.${index}.cantidad`, { valueAsNumber: true, min: 0.01 })}
            />
          </div>

          {/* Unidad */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Unidad</label>
            <input
              type="text"
              readOnly
              className="w-full px-3 py-2 bg-gray-100/50 border border-gray-200 rounded-lg text-sm text-gray-600"
              value={item.unidad || 'unidad'}
            />
          </div>

          {/* Precio unitario - Siempre registrado, pero oculto para no-admins */}
          {canViewPrices(user) ? (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">P. Unitario</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">S/</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={item.precioUnitario || 0}
                  className="w-full pl-8 pr-3 py-2 bg-white/70 border border-gray-200 rounded-lg text-sm font-medium
                             focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all outline-none"
                  {...register(`items.${index}.precioUnitario`, { valueAsNumber: true, min: 0 })}
                />
              </div>
            </div>
          ) : (
            <input type="hidden" {...register(`items.${index}.precioUnitario`)} defaultValue={item.precioUnitario || 0} />
          )}

          {/* Subtotal - Solo visible para admins */}
          {canViewPrices(user) && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Subtotal</label>
              <div className={`px-3 py-2 bg-${config.color}-100/50 border border-${config.color}-200 rounded-lg`}>
                <span className="text-sm font-bold text-gray-800">S/ {subtotal.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
})

// Panel flotante de totales
const TotalesPanel = ({ totales, margenGanancia, userRole, user, isEditing }) => {
  if (!canViewPrices(user)) return null

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-4 sm:p-5 lg:sticky lg:top-4"
    >
      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
        <span className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </span>
        Resumen
      </h3>

      <div className="space-y-3">
        <div className="flex justify-between items-center py-2 border-b border-gray-100">
          <span className="text-sm text-gray-500">Materiales</span>
          <span className="font-medium">S/ {totales.subtotalMateriales.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-gray-100">
          <span className="text-sm text-gray-500">Herramientas</span>
          <span className="font-medium">S/ {totales.subtotalHerramientas.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-gray-100">
          <span className="text-sm text-gray-500">Mano de obra</span>
          <span className="font-medium">S/ {totales.subtotalManoObra.toFixed(2)}</span>
        </div>

        <div className="flex justify-between items-center py-2">
          <span className="text-sm font-medium text-gray-700">Subtotal</span>
          <span className="font-semibold">S/ {totales.subtotalItems.toFixed(2)}</span>
        </div>

        <div className="flex justify-between items-center py-2 text-emerald-600">
          <span className="text-sm">Margen ({margenGanancia}%)</span>
          <span className="font-medium">+S/ {totales.margenAmount.toFixed(2)}</span>
        </div>

        <div className="flex justify-between items-center py-2">
          <span className="text-sm text-gray-500">IGV (18%)</span>
          <span className="font-medium">S/ {totales.igv.toFixed(2)}</span>
        </div>

        <div className="pt-3 mt-2 border-t-2 border-gray-200">
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold text-gray-800">TOTAL</span>
            <span className="text-xl sm:text-2xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              S/ {totales.total.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

const PresupuestoNuevo = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const [currentStep, setCurrentStep] = useState(0)
  const [activeTab, setActiveTab] = useState('material')

  // Stores
  const { createPresupuesto, isLoading, presupuestos, agregarPrecios, fetchPresupuestos } = usePresupuestosStore()
  const { clientes, fetchClientes } = useClientesStore()
  const { user } = useAuthStore()
  const { getCondicionesPagoActivas, fetchCondicionesPago } = useConfigStore()
  const { fetchMateriales, materiales: materialesInventario } = useMaterialesStore()
  const { fetchHerramientas, herramientas: herramientasInventario } = useHerramientasStore()
  const { fetchTarifas, tarifas: tarifasEspecialidades } = useSpecialtyRatesStore()

  // Estados locales
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null)
  const [busquedaCliente, setBusquedaCliente] = useState('')

  // Modo edición
  const isEditing = window.location.pathname.includes('/editar')
  const presupuestoExistente = id ? presupuestos.find(p => String(p.id) === String(id)) : null

  // Pasos del wizard
  const steps = [
    { id: 'cliente', title: 'Cliente' },
    { id: 'items', title: 'Items' },
    { id: 'confirmar', title: 'Confirmar' }
  ]

  // Form
  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      validezDias: 30,
      condicionesPago: '',
      margenGanancia: user?.role === 'supervisor' ? 0 : 20,
      observaciones: '',
      items: []
    }
  })

  const { fields: itemsFields, append: appendItem, remove: removeItem } = useFieldArray({
    control,
    name: 'items'
  })

  // Usar useWatch para observar cambios en tiempo real
  const items = useWatch({ control, name: 'items' }) || []
  const margenGanancia = useWatch({ control, name: 'margenGanancia' }) || 0
  const condicionesPagoDisponibles = getCondicionesPagoActivas()

  // Effects
  useEffect(() => {
    fetchClientes()
    fetchMateriales()
    fetchHerramientas()
    fetchTarifas()
    fetchCondicionesPago()
    if (isEditing) fetchPresupuestos()
  }, [])

  useEffect(() => {
    if (condicionesPagoDisponibles.length > 0 && !watch('condicionesPago')) {
      setValue('condicionesPago', condicionesPagoDisponibles[0].nombre)
    }
  }, [condicionesPagoDisponibles])

  // Cargar datos en modo edición
  useEffect(() => {
    if (isEditing && presupuestoExistente) {
      // Buscar el cliente en la lista de clientes por nombre o usar clienteData
      let clienteParaSeleccionar = null

      // Obtener nombre del cliente de forma segura
      const nombreCliente = typeof presupuestoExistente.cliente === 'string'
        ? presupuestoExistente.cliente
        : (presupuestoExistente.cliente?.nombre || presupuestoExistente.clienteData?.nombre || '')

      // Primero intentar buscar en la lista de clientes
      if (clientes.length > 0 && nombreCliente) {
        clienteParaSeleccionar = clientes.find(c =>
          c.nombre === nombreCliente ||
          c.nombre === presupuestoExistente.clienteData?.nombre
        )
      }

      // Si no se encontró en la lista, usar clienteData del presupuesto
      if (!clienteParaSeleccionar && presupuestoExistente.clienteData) {
        clienteParaSeleccionar = presupuestoExistente.clienteData
      }

      // Si cliente es objeto con datos, usarlo directamente
      if (!clienteParaSeleccionar && typeof presupuestoExistente.cliente === 'object' && presupuestoExistente.cliente !== null) {
        clienteParaSeleccionar = presupuestoExistente.cliente
      }

      // Fallback: crear un objeto cliente mínimo con el nombre
      if (!clienteParaSeleccionar && nombreCliente) {
        clienteParaSeleccionar = { nombre: nombreCliente }
      }

      setClienteSeleccionado(clienteParaSeleccionar)
      setValue('validezDias', presupuestoExistente.validezDias)
      setValue('condicionesPago', presupuestoExistente.condicionesPago || condicionesPagoDisponibles[0]?.nombre)
      setValue('observaciones', presupuestoExistente.observaciones)
      setValue('margenGanancia', presupuestoExistente.margenGanancia || 20)

      if (presupuestoExistente.items) {
        setValue('items', presupuestoExistente.items)
      }
    }
  }, [isEditing, presupuestoExistente, clientes])

  // Filtrar clientes
  const clientesFiltrados = useMemo(() => {
    return clientes
      .filter(c => c.estado === 'activo')
      .filter(c =>
        !busquedaCliente ||
        c.nombre.toLowerCase().includes(busquedaCliente.toLowerCase()) ||
        c.ruc?.includes(busquedaCliente) ||
        c.dni?.includes(busquedaCliente)
      )
      .slice(0, 6)
  }, [clientes, busquedaCliente])

  // Preparar materiales para combobox (excluyendo los ya agregados)
  const materialesParaCombobox = useMemo(() => {
    const codigosAgregados = itemsFields
      .filter(i => i.tipo === 'material')
      .map(i => i.codigo)

    return (materialesInventario || [])
      .filter(m => !codigosAgregados.includes(m.codigo))
      .map(m => ({
        id: m.id,
        nombre: m.nombre,
        codigo: m.codigo,
        precio: m.precioUnitario,
        unidad: m.unidadMedida || m.unidad,
        precioUnitario: m.precioUnitario
      }))
  }, [materialesInventario, itemsFields])

  // Preparar herramientas para combobox (excluyendo las ya agregadas)
  const herramientasParaCombobox = useMemo(() => {
    const codigosAgregados = itemsFields
      .filter(i => i.tipo === 'herramienta')
      .map(i => i.codigo)

    return (herramientasInventario || [])
      .filter(h => h.estado === 'available' && !codigosAgregados.includes(h.codigo))
      .map(h => ({
        id: h.id,
        nombre: h.nombre,
        codigo: h.codigo,
        precio: h.valor || 0,
        unidad: 'unidad',
        precioUnitario: h.valor || 0
      }))
  }, [herramientasInventario, itemsFields])

  // Preparar mano de obra para combobox (excluyendo las ya agregadas)
  const manoDeObraParaCombobox = useMemo(() => {
    const codigosAgregados = itemsFields
      .filter(i => i.tipo === 'manoObra')
      .map(i => i.codigo)

    return (tarifasEspecialidades || [])
      .filter(t => t.estado === 'active' && !codigosAgregados.includes(`MO-${t.id}`))
      .map(t => {
        const usarTarifaHora = t.tarifaHora && t.tarifaHora > 0
        return {
          id: t.id,
          nombre: t.especialidad,
          codigo: `MO-${t.id}`,
          precio: usarTarifaHora ? t.tarifaHora : t.tarifaDiaria,
          unidad: usarTarifaHora ? 'hora' : 'día',
          precioUnitario: usarTarifaHora ? t.tarifaHora : t.tarifaDiaria,
          descripcion: t.descripcion
        }
      })
  }, [tarifasEspecialidades, itemsFields])

  // Calcular totales
  const totales = useMemo(() => {
    const subtotalMateriales = items.filter(i => i.tipo === 'material')
      .reduce((sum, item) => sum + ((item.cantidad || 0) * (item.precioUnitario || 0)), 0)
    const subtotalHerramientas = items.filter(i => i.tipo === 'herramienta')
      .reduce((sum, item) => sum + ((item.cantidad || 0) * (item.precioUnitario || 0)), 0)
    const subtotalManoObra = items.filter(i => i.tipo === 'manoObra')
      .reduce((sum, item) => sum + ((item.cantidad || 0) * (item.precioUnitario || 0)), 0)

    const subtotalItems = subtotalMateriales + subtotalHerramientas + subtotalManoObra
    const margenAmount = subtotalItems * (margenGanancia / 100)
    const subtotal = subtotalItems + margenAmount
    const igv = subtotal * 0.18
    const total = subtotal + igv

    return { subtotalMateriales, subtotalHerramientas, subtotalManoObra, subtotalItems, margenAmount, subtotal, igv, total }
  }, [items, margenGanancia])

  // Handlers
  const handleSelectCliente = (cliente) => {
    setClienteSeleccionado(cliente)
    setBusquedaCliente('')
  }

  const handleAddItem = (item, tipo) => {
    // Siempre registrar el precio real del inventario, independientemente del rol
    // Los supervisores no lo verán en la UI, pero se guarda para el administrador
    const precioReal = item.precio || item.precioUnitario || 0

    const newItem = {
      descripcion: item.nombre,
      codigo: item.codigo,
      cantidad: 1,
      unidad: item.unidad,
      precioUnitario: precioReal,
      subtotal: 0,
      tipo
    }

    appendItem(newItem)
  }

  const handleStepClick = (step) => {
    // Solo permitir ir a pasos anteriores o al siguiente si el actual está completo
    if (step < currentStep) {
      setCurrentStep(step)
    } else if (step === currentStep + 1) {
      if (currentStep === 0 && clienteSeleccionado) {
        setCurrentStep(step)
      } else if (currentStep === 1 && itemsFields.length > 0) {
        setCurrentStep(step)
      }
    }
  }

  const canProceed = () => {
    if (currentStep === 0) return !!clienteSeleccionado
    if (currentStep === 1) return itemsFields.length > 0
    return true
  }

  const onSubmit = async (data) => {
    if (!clienteSeleccionado && !isEditing) {
      MySwal.fire({
        title: 'Seleccione un cliente',
        text: 'Debe seleccionar un cliente para continuar',
        icon: 'warning',
        confirmButtonColor: '#1e40af'
      })
      setCurrentStep(0)
      return
    }

    if (itemsFields.length === 0) {
      MySwal.fire({
        title: 'Agregue items',
        text: 'Debe agregar al menos un item al presupuesto',
        icon: 'warning',
        confirmButtonColor: '#1e40af'
      })
      setCurrentStep(1)
      return
    }

    try {
      // Calcular subtotales de cada item antes de enviar
      const itemsConSubtotal = data.items.map(item => ({
        ...item,
        subtotal: (item.cantidad || 0) * (item.precioUnitario || 0)
      }))

      if (isEditing) {
        // Incluir campos de configuración al actualizar
        const configuracion = {
          validezDias: data.validezDias,
          condicionesPago: data.condicionesPago,
          observaciones: data.observaciones
        }
        await agregarPrecios(id, itemsConSubtotal, data.margenGanancia, configuracion)
        MySwal.fire({
          title: 'Presupuesto actualizado',
          text: 'Los cambios se guardaron correctamente',
          icon: 'success',
          confirmButtonColor: '#1e40af'
        })
        navigate('/presupuestos')
      } else {
        // Calcular fecha de vencimiento
        const fechaHoy = new Date()
        const fechaVencimiento = new Date(fechaHoy)
        fechaVencimiento.setDate(fechaVencimiento.getDate() + (data.validezDias || 30))

        const presupuestoData = {
          cliente: clienteSeleccionado.nombre,
          clienteData: {
            nombre: clienteSeleccionado.nombre,
            tipo: clienteSeleccionado.tipo,
            ruc: clienteSeleccionado.ruc || clienteSeleccionado.dni,
            email: clienteSeleccionado.email,
            telefono: clienteSeleccionado.telefono,
            direccion: clienteSeleccionado.direccion,
            contacto: clienteSeleccionado.contactoPrincipal?.nombre
          },
          fechaCotizacion: fechaHoy.toISOString().split('T')[0],
          fechaVencimiento: fechaVencimiento.toISOString().split('T')[0],
          validezDias: data.validezDias,
          condicionesPago: data.condicionesPago,
          margenGanancia: data.margenGanancia,
          subtotal: totales.subtotal,
          igv: totales.igv,
          total: totales.total,
          items: itemsConSubtotal,
          observaciones: data.observaciones,
          elaboradoPor: user.name,
          tienePreciosAsignados: user?.role !== 'supervisor',
          estado: 'pendiente'
        }

        const nuevo = await createPresupuesto(presupuestoData)

        MySwal.fire({
          title: 'Presupuesto creado',
          html: `<p class="text-gray-600">Se generó el presupuesto <span class="font-bold text-blue-600">${nuevo.numero}</span></p>`,
          icon: 'success',
          confirmButtonColor: '#1e40af'
        })

        navigate(user?.role === 'supervisor' ? '/presupuestos' : `/presupuestos/${nuevo.id}`)
      }
    } catch (error) {
      MySwal.fire({
        title: 'Error',
        text: isEditing ? 'No se pudo actualizar el presupuesto' : 'No se pudo crear el presupuesto',
        icon: 'error',
        confirmButtonColor: '#1e40af'
      })
    }
  }

  // ============================================================
  // RENDER DE CADA PASO
  // ============================================================

  const renderStep0 = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Seleccionar Cliente</h2>
        <p className="text-sm sm:text-base text-gray-500 mt-1">Busque y seleccione el cliente para este presupuesto</p>
      </div>

      {/* Buscador de clientes */}
      <div className="max-w-xl mx-auto">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            className="w-full pl-12 pr-4 py-4 bg-white border-2 border-gray-200 rounded-2xl text-gray-800 text-lg
                       focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
            placeholder="Buscar por nombre, RUC o DNI..."
            value={busquedaCliente}
            onChange={(e) => setBusquedaCliente(e.target.value)}
          />
        </div>

        {/* Lista de clientes */}
        <div className="mt-4 space-y-2">
          {clientesFiltrados.map((cliente, idx) => (
            <motion.div
              key={cliente.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => handleSelectCliente(cliente)}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                clienteSeleccionado?.id === cliente.id
                  ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-500/20'
                  : 'border-gray-100 bg-white hover:border-gray-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold ${
                    clienteSeleccionado?.id === cliente.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {cliente.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{cliente.nombre}</h3>
                    <p className="text-sm text-gray-500">
                      {cliente.tipo === 'empresa' ? `RUC: ${cliente.ruc}` : `DNI: ${cliente.dni}`}
                      {cliente.email && ` • ${cliente.email}`}
                    </p>
                  </div>
                </div>
                {clienteSeleccionado?.id === cliente.id && (
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            </motion.div>
          ))}

          {clientesFiltrados.length === 0 && busquedaCliente && (
            <div className="text-center py-8 text-gray-400">
              <svg className="w-16 h-16 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>No se encontraron clientes</p>
            </div>
          )}
        </div>
      </div>

      {/* Cliente seleccionado - Card de confirmación */}
      <AnimatePresence>
        {clienteSeleccionado && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="max-w-xl mx-auto mt-6 p-5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl text-white shadow-xl shadow-blue-500/30"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Cliente seleccionado</p>
                <h3 className="text-xl font-bold mt-1">{clienteSeleccionado.nombre}</h3>
                <p className="text-blue-100 text-sm mt-1">
                  {clienteSeleccionado.email} • {clienteSeleccionado.telefono}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setClienteSeleccionado(null)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )

  const renderStep1 = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Panel principal de items */}
        <div className="flex-1 space-y-6">
          {/* Tabs de categorías */}
          <div className="bg-gray-100 p-1 sm:p-1.5 rounded-xl inline-flex flex-wrap sm:flex-nowrap gap-0.5">
            {[
              { id: 'material', label: 'Materiales', icon: '📦' },
              { id: 'herramienta', label: 'Herramientas', icon: '🔧' },
              { id: 'manoObra', label: 'Mano de Obra', icon: '👷' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 flex items-center gap-1 sm:gap-2 ${
                  activeTab === tab.id
                    ? 'bg-white text-gray-800 shadow-md'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <span>{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Buscador según tab activo */}
          <div className="bg-white rounded-2xl p-3 sm:p-5 shadow-sm border border-gray-100">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">
              Agregar {activeTab === 'material' ? 'Material' : activeTab === 'herramienta' ? 'Herramienta' : 'Mano de Obra'}
            </h3>

            {activeTab === 'material' && (
              <SmartCombobox
                items={materialesParaCombobox}
                onSelect={(item) => handleAddItem(item, 'material')}
                placeholder="Buscar material por nombre o código..."
                showPrice={true}
                userRole={user?.role}
                user={user}
                isEditing={isEditing}
                icon={<span className="text-lg">📦</span>}
              />
            )}

            {activeTab === 'herramienta' && (
              <SmartCombobox
                items={herramientasParaCombobox}
                onSelect={(item) => handleAddItem(item, 'herramienta')}
                placeholder="Buscar herramienta..."
                showPrice={true}
                userRole={user?.role}
                user={user}
                isEditing={isEditing}
                icon={<span className="text-lg">🔧</span>}
              />
            )}

            {activeTab === 'manoObra' && (
              <SmartCombobox
                items={manoDeObraParaCombobox}
                onSelect={(item) => handleAddItem(item, 'manoObra')}
                placeholder="Buscar tipo de personal..."
                showPrice={true}
                userRole={user?.role}
                user={user}
                isEditing={isEditing}
                icon={<span className="text-lg">👷</span>}
              />
            )}
          </div>

          {/* Lista de items agregados */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">
                Items agregados ({itemsFields.length})
              </h3>
              {itemsFields.length > 0 && (user?.role !== 'supervisor' || isEditing) && (
                <span className="text-sm text-gray-500">
                  Total: <span className="font-semibold text-blue-600">S/ {totales.subtotalItems.toFixed(2)}</span>
                </span>
              )}
            </div>

            <AnimatePresence mode="popLayout">
              {itemsFields.length > 0 ? (
                itemsFields.map((field, index) => (
                  <ItemCard
                    key={field.id}
                    item={field}
                    index={index}
                    type={field.tipo}
                    onRemove={() => removeItem(index)}
                    userRole={user?.role}
                    user={user}
                    isEditing={isEditing}
                    register={register}
                    watch={watch}
                  />
                ))
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-gray-50 rounded-2xl p-12 text-center"
                >
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-medium text-gray-600 mb-1">Sin items</h4>
                  <p className="text-gray-400">Use el buscador de arriba para agregar items</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Panel lateral de totales */}
        <div className="lg:w-80">
          <TotalesPanel
            totales={totales}
            margenGanancia={margenGanancia}
            userRole={user?.role}
            user={user}
            isEditing={isEditing}
          />
        </div>
      </div>
    </motion.div>
  )

  const renderStep2 = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Revisar y Confirmar</h2>
        <p className="text-sm sm:text-base text-gray-500 mt-1">Verifique los datos antes de crear el presupuesto</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-4xl mx-auto">
        {/* Resumen del cliente */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Cliente</h3>
          {clienteSeleccionado && (
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white text-xl font-bold">
                {clienteSeleccionado.nombre.charAt(0)}
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">{clienteSeleccionado.nombre}</h4>
                <p className="text-sm text-gray-500">{clienteSeleccionado.ruc || clienteSeleccionado.dni}</p>
                <p className="text-sm text-gray-500">{clienteSeleccionado.email}</p>
              </div>
            </div>
          )}
        </div>

        {/* Configuración */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Configuración</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Validez</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  className="w-20 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium
                             focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all outline-none"
                  {...register('validezDias', { valueAsNumber: true })}
                />
                <span className="text-sm text-gray-500">días</span>
              </div>
            </div>

            {(user?.role !== 'supervisor' || isEditing) && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Condiciones de Pago</label>
                  <select
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm
                               focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all outline-none"
                    {...register('condicionesPago')}
                  >
                    {condicionesPagoDisponibles.map(c => (
                      <option key={c.id} value={c.nombre}>{c.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Margen de Ganancia</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.1"
                      className="w-20 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium
                                 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all outline-none"
                      {...register('margenGanancia', { valueAsNumber: true })}
                    />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Resumen de items */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Items ({items.length})</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {item.tipo === 'material' ? '📦' : item.tipo === 'herramienta' ? '🔧' : '👷'}
                  </span>
                  <span className="text-sm text-gray-700 truncate max-w-[150px]">{item.descripcion}</span>
                </div>
                {/* Admins ven precio, otros solo cantidad */}
                {canViewPrices(user) ? (
                  <span className="text-sm font-medium text-gray-600">
                    S/ {((item.cantidad || 0) * (item.precioUnitario || 0)).toFixed(2)}
                  </span>
                ) : (
                  <span className="text-sm font-medium text-blue-600">
                    x {item.cantidad || 1} {item.unidad || 'unid.'}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Total final */}
        {canViewPrices(user) ? (
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-4 sm:p-6 text-white">
            <h3 className="text-sm font-semibold text-blue-100 uppercase tracking-wider mb-4">Total</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-blue-100">
                <span>Subtotal</span>
                <span>S/ {totales.subtotalItems.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-blue-100">
                <span>Margen ({margenGanancia}%)</span>
                <span>+S/ {totales.margenAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-blue-100">
                <span>IGV (18%)</span>
                <span>S/ {totales.igv.toFixed(2)}</span>
              </div>
              <div className="pt-3 mt-3 border-t border-blue-400/30">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total Final</span>
                  <span className="text-xl sm:text-3xl font-black">S/ {totales.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3">Información de Precios</h3>
            <p className="text-sm text-gray-600">
              Los precios serán asignados automáticamente desde el inventario.
              El administrador revisará y aprobará el presupuesto.
            </p>
          </div>
        )}
      </div>

      {/* Observaciones */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Observaciones</h3>
          <textarea
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none
                       focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all outline-none"
            rows="3"
            placeholder="Notas adicionales, términos y condiciones..."
            {...register('observaciones')}
          />
        </div>
      </div>
    </motion.div>
  )

  // ============================================================
  // RENDER PRINCIPAL
  // ============================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-6 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            type="button"
            onClick={() => navigate('/presupuestos')}
            className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors mb-4"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver a presupuestos
          </button>

          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-800">
            {isEditing ? `Editar Presupuesto ${presupuestoExistente?.numero || ''}` : 'Nuevo Presupuesto'}
          </h1>
          <p className="text-gray-500 mt-1">
            {isEditing ? 'Modifica los datos del presupuesto' : 'Crea una nueva cotización en 3 simples pasos'}
          </p>
        </motion.div>

        {/* Stepper */}
        <Stepper
          currentStep={currentStep}
          steps={steps}
          onStepClick={handleStepClick}
        />

        {/* Contenido del paso actual */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl shadow-gray-200/50 p-3 sm:p-6 md:p-8 mb-4 sm:mb-6">
            <AnimatePresence mode="wait">
              {currentStep === 0 && renderStep0()}
              {currentStep === 1 && renderStep1()}
              {currentStep === 2 && renderStep2()}
            </AnimatePresence>
          </div>

          {/* Navegación */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-3"
          >
            <button
              type="button"
              onClick={() => currentStep > 0 ? setCurrentStep(currentStep - 1) : navigate('/presupuestos')}
              className="px-4 sm:px-6 py-2.5 sm:py-3 text-gray-600 font-medium hover:text-gray-800 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {currentStep === 0 ? 'Cancelar' : 'Anterior'}
            </button>

            {currentStep < 2 ? (
              <motion.button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setCurrentStep(currentStep + 1)
                }}
                disabled={!canProceed()}
                className={`w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-200 text-sm sm:text-base ${
                  canProceed()
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
                whileHover={canProceed() ? { scale: 1.02 } : {}}
                whileTap={canProceed() ? { scale: 0.98 } : {}}
              >
                Siguiente
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </motion.button>
            ) : (
              <motion.button
                type="submit"
                disabled={isLoading}
                className={`w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-200 text-sm sm:text-base ${
                  isLoading
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40'
                }`}
                whileHover={!isLoading ? { scale: 1.02 } : {}}
                whileTap={!isLoading ? { scale: 0.98 } : {}}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Guardando...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {isEditing ? 'Guardar Cambios' : 'Crear Presupuesto'}
                  </>
                )}
              </motion.button>
            )}
          </motion.div>
        </form>
      </div>
    </div>
  )
}

export default PresupuestoNuevo
