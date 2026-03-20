import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import useOrdenesStore from '../../stores/ordenesStore'
import useAuthStore from '../../stores/authStore'
import useConfigStore from '../../stores/configStore'
import useTecnicosStore from '../../stores/tecnicosStore'
import useNotificacionesStore from '../../stores/notificacionesStore'
import useClientesStore from '../../stores/clientesStore'
import useVisitasTecnicasStore from '../../stores/visitasTecnicasStore'
import useMaterialesStore from '../../stores/materialesStore'
import useHerramientasStore from '../../stores/herramientasStore'
import { canViewPrices } from '../../utils/permissionsUtils'
import PhotoUpload from '../../components/ui/PhotoUpload'
import { openInBestMapApp } from '../../utils/mapUtils'
import notificationService from '../../services/notificationService'
import { getToday } from '../../utils/dateUtils'
import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'

const MySwal = withReactContent(Swal)

const OrdenNueva = () => {
  const navigate = useNavigate()
  const { createOrden, isLoading } = useOrdenesStore()
  const { user } = useAuthStore()
  const { getTiposServicioActivos, fetchTiposServicio } = useConfigStore()
  const { getNombresTecnicos, tecnicos, fetchTecnicos } = useTecnicosStore()
  const { notificarAsignacionTecnico } = useNotificacionesStore()
  const { clientes, fetchClientes, actualizarEstadisticasCliente } = useClientesStore()
  const { visitas, fetchVisitas, marcarVisitaComoUsada } = useVisitasTecnicasStore()
  const { materiales, fetchMateriales } = useMaterialesStore()
  const { herramientas, fetchHerramientas } = useHerramientasStore()
  const [photos, setPhotos] = useState([])
  const [isEmergency, setIsEmergency] = useState(false)
  const [clienteSeleccionado, setClienteSeleccionado] = useState('')
  const [materialesSeleccionados, setMaterialesSeleccionados] = useState([])
  const [herramientasSeleccionadas, setHerramientasSeleccionadas] = useState([])
  const [activeInventoryTab, setActiveInventoryTab] = useState('materiales')
  const [visitaSeleccionada, setVisitaSeleccionada] = useState(null)

  // Estados para listas editables de visita técnica
  const [materialesVisitaEditables, setMaterialesVisitaEditables] = useState([])
  const [herramientasVisitaEditables, setHerramientasVisitaEditables] = useState([])
  const [personalVisitaEditable, setPersonalVisitaEditable] = useState([])

  // Estados para selector de materiales con dropdown
  const [materialesRequeridosLista, setMaterialesRequeridosLista] = useState([])
  const [inputMaterialRequerido, setInputMaterialRequerido] = useState('')
  const [mostrarDropdownMateriales, setMostrarDropdownMateriales] = useState(false)

  // Estados para formularios de agregar nuevos elementos
  const [nuevoMaterial, setNuevoMaterial] = useState({ nombre: '', cantidad: 1, unidad: '', precioUnitario: 0, stockActual: 999, materialId: null })
  const [nuevaHerramienta, setNuevaHerramienta] = useState('')
  const [nuevoPersonal, setNuevoPersonal] = useState({ especialidad: '', diasEstimados: '', descripcion: '' })

  // Estados para selector de herramientas sin visita
  const [inputHerramientaSinVisita, setInputHerramientaSinVisita] = useState('')

  // Estado para selector de materiales sin visita
  const [inputMaterialSinVisita, setInputMaterialSinVisita] = useState('')
  
  const tiposServicioActivos = getTiposServicioActivos()
  const tecnicosNombres = getNombresTecnicos()

  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([
          fetchClientes(),
          fetchVisitas(),
          fetchMateriales(),
          fetchHerramientas(),
          fetchTecnicos(),
          fetchTiposServicio()
        ])
      } catch (error) {
        console.error('Error cargando datos:', error)
      }
    }

    loadData()
  }, [fetchClientes, fetchVisitas, fetchMateriales, fetchHerramientas, fetchTecnicos, fetchTiposServicio, getTiposServicioActivos, getNombresTecnicos])

  const form = useForm({
    defaultValues: {
      prioridad: 'media',
      tipoServicio: tiposServicioActivos.length > 0 ? tiposServicioActivos[0].nombre : '',
      tipoVisita: 'sin_visita',
      visitaTecnicaOrigen: ''
    }
  })
  
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = form

  const tipoServicio = watch('tipoServicio')
  const prioridad = watch('prioridad')
  const tipoVisita = watch('tipoVisita')
  const visitaTecnicaOrigen = watch('visitaTecnicaOrigen')

  // Cuando se activa emergencia, forzar prioridad a 'alta' si la actual no es válida
  useEffect(() => {
    if (isEmergency && prioridad !== 'alta' && prioridad !== 'urgente') {
      setValue('prioridad', 'alta')
    }
  }, [isEmergency, prioridad, setValue])

  // Filtrar visitas técnicas aprobadas sin orden generada
  const visitasCompletadas = visitas.filter(v => v.estado === 'aprobada' && !v.ordenGenerada)

  // Los tipos de servicio y técnicos ahora vienen de la configuración

  // Obtener lista de clientes activos - DEBE IR ANTES de los useCallback
  const clientesActivos = clientes.filter(c => c.estado === 'activo')

  // Función memoizada para autocompletar campos
  const autocompletarCampos = useCallback((visita) => {
    // Verificar si el cliente de la visita existe en la lista de clientes activos
    const clienteExiste = clientesActivos.some(c => c.nombre === visita.cliente)
    
    // Sincronizar estado del cliente
    setClienteSeleccionado(visita.cliente)
    
    // Cargar fotos de la visita técnica si existen
    const cargarFotosDesdeLocalStorage = (visitaId) => {
      try {
        const clave = `visita-fotos-${visitaId}`
        const fotos = localStorage.getItem(clave)
        return fotos ? JSON.parse(fotos) : {}
      } catch (error) {
        console.error('Error cargando fotos desde localStorage:', error)
        return {}
      }
    }
    
    // Cargar fotos guardadas de la visita técnica
    const fotosCategorias = cargarFotosDesdeLocalStorage(visita.id)
    const todasLasFotos = []
    
    // Convertir fotos por categoría a array simple
    Object.values(fotosCategorias).forEach(categoria => {
      if (Array.isArray(categoria)) {
        todasLasFotos.push(...categoria)
      }
    })
    
    // Si hay fotos antiguas en el formato anterior
    if (visita.estadoLugar?.fotos && Array.isArray(visita.estadoLugar.fotos)) {
      todasLasFotos.push(...visita.estadoLugar.fotos)
    }
    
    // Establecer las fotos cargadas
    if (todasLasFotos.length > 0) {
      // Asegurar que todas las fotos tengan un ID único
      const fotosConId = todasLasFotos.slice(0, 5).map((foto, index) => ({
        ...foto,
        id: foto.id || `loaded-photo-${visita.id}-${Date.now()}-${index}`
      }))
      setPhotos(fotosConId)
    }
    
    // Cargar listas editables desde la visita técnica
    if (visita.materialesEstimados && Array.isArray(visita.materialesEstimados)) {
      // Enriquecer materiales con información del stock del inventario
      const materialesEnriquecidos = visita.materialesEstimados.map(mat => {
        const materialInventario = (materiales || []).find(m =>
          m.nombre?.toLowerCase() === mat.nombre?.toLowerCase()
        )
        return {
          ...mat,
          stockActual: materialInventario?.stockActual || mat.stockActual || 999,
          precioUnitario: mat.precioUnitario || materialInventario?.precioUnitario || 0,
          materialId: materialInventario?.id || mat.materialId || null
        }
      })
      setMaterialesVisitaEditables(materialesEnriquecidos)
    } else {
      setMaterialesVisitaEditables([])
    }

    if (visita.herramientasRequeridas && Array.isArray(visita.herramientasRequeridas)) {
      // Normalizar herramientas: convertir strings a objetos si es necesario
      const herramientasNormalizadas = visita.herramientasRequeridas.map((h, index) => {
        if (typeof h === 'string') {
          return { id: Date.now() + index, nombre: h, cantidad: 1 }
        }
        return { ...h, cantidad: h.cantidad || 1 }
      })
      setHerramientasVisitaEditables(herramientasNormalizadas)
    } else {
      setHerramientasVisitaEditables([])
    }
    
    if (visita.listaPersonal && Array.isArray(visita.listaPersonal)) {
      setPersonalVisitaEditable([...visita.listaPersonal])
    } else {
      setPersonalVisitaEditable([])
    }
    
    // Determinar tipo de servicio basado en la descripción
    let tipoServicioDetectado = ''
    if (visita.descripcionServicio?.toLowerCase().includes('hvac')) {
      tipoServicioDetectado = 'Mantenimiento Preventivo'
    } else if (visita.descripcionServicio?.toLowerCase().includes('eléctrico')) {
      tipoServicioDetectado = 'Reparación Correctiva'
    } else if (visita.descripcionServicio?.toLowerCase().includes('refrigeración')) {
      tipoServicioDetectado = 'Mantenimiento Correctivo'
    } else if (tiposServicioActivos.length > 0) {
      tipoServicioDetectado = tiposServicioActivos[0].nombre
    }
    
    // Crear descripción detallada incluyendo información adicional
    let descripcionCompleta = `Trabajo basado en visita técnica ${visita.id}: ${visita.descripcionServicio}`
    
    if (visita.nombreProyecto) {
      descripcionCompleta += `\n\nProyecto: ${visita.nombreProyecto}`
    }
    
    if (visita.estadoLugar?.descripcion) {
      descripcionCompleta += `\n\nEstado del lugar: ${visita.estadoLugar.descripcion}`
    }
    
    if (visita.herramientasRequeridas && visita.herramientasRequeridas.length > 0) {
      descripcionCompleta += `\n\nHerramientas requeridas: ${visita.herramientasRequeridas.join(', ')}`
    }
    
    if (visita.personalRequerido) {
      const personal = visita.listaPersonal || []
      if (personal.length > 0) {
        descripcionCompleta += `\n\nPersonal requerido:`
        personal.forEach(p => {
          descripcionCompleta += `\n- ${p.especialidad}: ${p.diasEstimados} días`
        })
      } else if (visita.personalRequerido.especialidades && visita.personalRequerido.especialidades.length > 0) {
        descripcionCompleta += `\n\nPersonal requerido: ${visita.personalRequerido.especialidades.join(', ')} (${visita.personalRequerido.diasEstimados} días)`
      }
    }
    
    // Usar setValue para autocompletar los campos del formulario
    setValue('nombreProyecto', visita.nombreProyecto || `Proyecto - ${visita.cliente}`, { shouldValidate: true, shouldDirty: true })
    setValue('cliente', visita.cliente, { shouldValidate: true, shouldDirty: true })
    setValue('tipoServicio', tipoServicioDetectado, { shouldValidate: true, shouldDirty: true })
    setValue('descripcion', descripcionCompleta, { shouldValidate: true, shouldDirty: true })
    setValue('ubicacion', visita.direccion, { shouldValidate: true, shouldDirty: true })
    setValue('tecnicoAsignado', visita.tecnicoAsignado, { shouldValidate: true, shouldDirty: true })
    setValue('costoEstimado', visita.costoEstimado?.costoTotal || 0, { shouldValidate: true, shouldDirty: true })
    
    // Nota: La orden de compra de la visita aprobada es solo un número de referencia,
    // no el documento mismo. El usuario puede subir el documento si lo tiene.
    
    if (!clienteExiste) {
      console.warn(`Cliente "${visita.cliente}" de la visita técnica no existe en la lista de clientes activos`)
    }
  }, [setValue, tiposServicioActivos, clientesActivos, materiales])
  
  // Función memoizada para limpiar campos
  const limpiarCampos = useCallback(() => {
    setClienteSeleccionado('')
    setValue('nombreProyecto', '')
    setValue('cliente', '')
    setValue('descripcion', '')
    setValue('ubicacion', '')
    setValue('tecnicoAsignado', '')
    setValue('costoEstimado', '')
    setOrdenCompraFile(null)
    setPhotos([])

    // Limpiar listas editables de visita técnica
    setMaterialesVisitaEditables([])
    setHerramientasVisitaEditables([])
    setPersonalVisitaEditable([])
  }, [setValue])

  // Cargar datos de visita técnica seleccionada y autocompletar campos
  useEffect(() => {
    if (visitaTecnicaOrigen) {
      const visita = visitasCompletadas.find(v => v.id === visitaTecnicaOrigen)
      if (visita && visita !== visitaSeleccionada) { // Evitar re-procesar la misma visita
        setVisitaSeleccionada(visita)
        autocompletarCampos(visita)
      }
    } else if (visitaTecnicaOrigen === '' && visitaSeleccionada) {
      // Solo limpiar cuando se deselecciona completamente y había una visita seleccionada
      setVisitaSeleccionada(null)
      limpiarCampos()
    }
  }, [visitaTecnicaOrigen]) // Solo depender de visitaTecnicaOrigen para evitar bucles
  
  // Crear lista completa de clientes incluyendo el de la visita técnica si no existe
  const clientesParaSelect = [...clientesActivos]
  if (visitaSeleccionada && visitaSeleccionada.cliente) {
    const clienteExiste = clientesActivos.some(c => c.nombre === visitaSeleccionada.cliente)
    if (!clienteExiste) {
      // Agregar cliente temporal de la visita técnica
      clientesParaSelect.push({
        id: `temp-${visitaSeleccionada.id}`,
        nombre: visitaSeleccionada.cliente,
        email: visitaSeleccionada.email || '',
        telefono: visitaSeleccionada.telefono || '',
        tipo: 'empresa', // Asumir empresa por defecto
        ruc: 'De visita técnica',
        categoria: 'regular',
        estado: 'activo'
      })
    }
  }
  
  // Obtener cliente seleccionado
  const getClienteSeleccionado = () => {
    return clientesParaSelect.find(c => c.nombre === clienteSeleccionado)
  }

  // Handlers para selector de materiales requeridos
  const materialesFiltrados = (materiales || []).filter(material =>
    material?.nombre?.toLowerCase().includes(inputMaterialRequerido.toLowerCase()) ||
    (material?.codigo?.toLowerCase().includes(inputMaterialRequerido.toLowerCase()))
  )

  const handleSeleccionarMaterialRequerido = (material) => {
    const nombreMaterial = typeof material === 'object' ? material.nombre : material
    if (!materialesRequeridosLista.includes(nombreMaterial)) {
      const nuevaLista = [...materialesRequeridosLista, nombreMaterial]
      setMaterialesRequeridosLista(nuevaLista)
      setValue('materialesRequeridos', nuevaLista.join('\n'))
    }
    setInputMaterialRequerido('')
    setMostrarDropdownMateriales(false)
  }

  const handleEliminarMaterialRequerido = (index) => {
    const nuevaLista = materialesRequeridosLista.filter((_, i) => i !== index)
    setMaterialesRequeridosLista(nuevaLista)
    setValue('materialesRequeridos', nuevaLista.join('\n'))
  }

  const onSubmit = async (data) => {
    try {
      // Validación para órdenes con visita técnica
      if (data.tipoVisita === 'con_visita') {
        if (!data.visitaTecnicaOrigen) {
          MySwal.fire({
            title: 'Error',
            text: 'Para órdenes con visita técnica debe seleccionar una visita técnica de origen',
            icon: 'error',
            confirmButtonColor: '#1e40af'
          })
          return
        }
        
      }
      
      // Validación para órdenes sin visita técnica
      if (data.tipoVisita === 'sin_visita') {
        const confirmResult = await MySwal.fire({
          title: 'Confirmar Orden Sin Visita Técnica',
          text: '¿Está seguro de crear esta orden sin visita técnica previa?',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#1e40af',
          cancelButtonColor: '#ef4444',
          confirmButtonText: 'Sí, crear sin visita',
          cancelButtonText: 'Cancelar'
        })
        
        if (!confirmResult.isConfirmed) {
          return
        }
      }
      
      // Crear orden de trabajo
      const clienteObj = getClienteSeleccionado()
      
      // Convertir archivo a base64 si existe
      
      const ordenData = {
        ...data,
        cliente: clienteSeleccionado || data.cliente,
        clienteId: clienteObj?.id,
        solicitadoPor: user.name,
        numeroOrdenCompra: data.ordenCompraNumero || null,
        estado: isEmergency ? 'urgente' : 'pendiente',
        esEmergencia: isEmergency,
        // Incluir archivo de orden de compra si existe
        // Incluir inventario solo si es sin_visita y se seleccionaron elementos
        ...(tipoVisita === 'sin_visita' && (materialesSeleccionados.length > 0 || herramientasSeleccionadas.length > 0) && {
          materialesSeleccionados: materialesSeleccionados,
          herramientasSeleccionadas: herramientasSeleccionadas
        }),
        // Vincular con visita técnica si corresponde
        ...(tipoVisita === 'con_visita' && visitaTecnicaOrigen !== 'nueva' && visitaSeleccionada && {
          visitaTecnicaId: visitaTecnicaOrigen,
          basadoEnVisitaTecnica: true,
          // Usar las listas editables (modificadas por el usuario)
          materialesEstimados: materialesVisitaEditables,
          herramientasRequeridas: herramientasVisitaEditables,
          listaPersonal: personalVisitaEditable,
          coordenadasGPS: visitaSeleccionada.coordenadasGPS || null,
          nombreProyecto: visitaSeleccionada.nombreProyecto || null
        })
      }

      const newOrden = await createOrden(ordenData)

      // Si la orden se basó en una visita técnica, marcar la visita como usada
      if (data.tipoVisita === 'con_visita' && visitaTecnicaOrigen && visitaTecnicaOrigen !== 'nueva') {
        await marcarVisitaComoUsada(visitaTecnicaOrigen, newOrden.id)
      }

      // TODO: Las estadísticas del cliente se calculan en el backend mediante consultas SQL
      
      // Si se asignó un técnico, enviar notificación
      if (data.tecnicoAsignado) {
        // Encontrar el ID del técnico basado en el nombre
        const tecnicoObj = tecnicos.find(t => t.nombre === data.tecnicoAsignado)
        if (tecnicoObj) {
          // Guardar notificación en el store
          notificarAsignacionTecnico(
            tecnicoObj.id,
            newOrden.id,
            { tipoServicio: data.tipoServicio, cliente: data.cliente }
          )
          
          // Mostrar notificación visual
          await notificationService.tecnicoAsignado(
            data.tecnicoAsignado,
            newOrden.id,
            data.tipoServicio
          )
        }
      } else {
        // Si no se asignó técnico, mostrar notificación estándar
        MySwal.fire({
          title: '¡Orden creada!',
          text: `Orden ${newOrden.id} creada exitosamente`,
          icon: 'success',
          confirmButtonColor: '#1e40af'
        })
      }

      navigate('/ordenes')
    } catch (error) {
      console.error('❌ Error al crear orden:', error)
      MySwal.fire({
        title: 'Error',
        text: error.message || 'No se pudo crear la orden',
        icon: 'error',
        confirmButtonColor: '#1e40af'
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Nueva Orden de Trabajo</h1>
          <p className="text-sm sm:text-base text-gray-600">Crear una nueva orden de mantenimiento</p>
        </div>

        {/* Emergency Toggle */}
        <div className="flex items-center space-x-3 self-start sm:self-auto">
          <span className="text-sm font-medium text-gray-700">Emergencia</span>
          <button
            type="button"
            onClick={() => setIsEmergency(!isEmergency)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isEmergency ? 'bg-red-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isEmergency ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Emergency Alert */}
      {isEmergency && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-400 text-xl">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Modo Emergencia Activado
              </h3>
              <p className="text-sm text-red-700 mt-1">
                Esta orden será marcada como urgente y notificada inmediatamente al equipo técnico.
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Información General */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Información General
            </h2>
            
            <div className="space-y-4">
              {/* Tipo de Visita - PRIMERO */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Visita *
                </label>
                <select
                  className={`input-field ${errors.tipoVisita ? 'border-red-500' : ''}`}
                  {...register('tipoVisita', { required: 'El tipo de visita es requerido' })}
                >
                  <option value="sin_visita">💻 Sin Visita Técnica</option>
                  <option value="con_visita">🔧 Con Visita Técnica</option>
                </select>
                {errors.tipoVisita && (
                  <p className="mt-1 text-sm text-red-600">{errors.tipoVisita.message}</p>
                )}
              </div>
              
              {/* Selector de Visita Técnica de Origen - SEGUNDO */}
              {tipoVisita === 'con_visita' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Visita Técnica de Origen *
                  </label>
                  <select
                    className={`input-field ${errors.visitaTecnicaOrigen ? 'border-red-500' : ''}`}
                    {...register('visitaTecnicaOrigen', { 
                      required: tipoVisita === 'con_visita' ? 'Debe seleccionar una visita técnica de origen' : false 
                    })}
                  >
                    <option value="">Seleccionar visita técnica...</option>
                    <optgroup label="Visitas aprobadas disponibles">
                      {visitasCompletadas.map((visita) => (
                        <option key={visita.id} value={visita.id}>
                          {visita.id} - {visita.cliente} - {visita.nombreProyecto || 'Sin nombre'}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  {errors.visitaTecnicaOrigen && (
                    <p className="mt-1 text-sm text-red-600">{errors.visitaTecnicaOrigen.message}</p>
                  )}
                  
                  {visitasCompletadas.length === 0 && (
                    <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-sm text-amber-700 font-medium">
                        No hay visitas técnicas disponibles
                      </p>
                      <p className="mt-1 text-xs text-amber-600">
                        Para usar una visita existente, debe estar <strong>aprobada</strong> y sin orden generada.
                        Verifique en el módulo de <strong>Aprobaciones</strong> si tiene visitas pendientes de aprobar.
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Información de la visita seleccionada */}
              {visitaSeleccionada && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
                  <h3 className="text-sm font-medium text-green-800 mb-2">✅ Visita Técnica Seleccionada - Información Cargada</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-green-600 font-medium">Proyecto:</span>
                      <p className="text-green-800">{visitaSeleccionada.nombreProyecto || 'Sin nombre'}</p>
                    </div>
                    <div>
                      <span className="text-green-600 font-medium">Técnico:</span>
                      <p className="text-green-800">{visitaSeleccionada.tecnicoAsignado}</p>
                    </div>
                    <div>
                      <span className="text-green-600 font-medium">Fecha visita:</span>
                      <p className="text-green-800">{new Date(visitaSeleccionada.fechaVisita).toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  {/* Detalles adicionales cargados */}
                  <div className="mt-3 pt-3 border-t border-green-200 space-y-2">
                    {visitaSeleccionada.materialesEstimados?.length > 0 && (
                      <div className="flex items-center text-sm">
                        <svg className="w-4 h-4 text-green-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <span className="text-green-700">{visitaSeleccionada.materialesEstimados.length} materiales estimados cargados</span>
                      </div>
                    )}
                    
                    {visitaSeleccionada.herramientasRequeridas?.length > 0 && (
                      <div className="flex items-center text-sm">
                        <svg className="w-4 h-4 text-green-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-green-700">{visitaSeleccionada.herramientasRequeridas.length} herramientas requeridas incluidas</span>
                      </div>
                    )}
                    
                    {photos.length > 0 && (
                      <div className="flex items-center text-sm">
                        <svg className="w-4 h-4 text-green-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-green-700">{photos.length} fotos cargadas de la visita técnica</span>
                      </div>
                    )}
                    
                    {visitaSeleccionada.listaPersonal?.length > 0 && (
                      <div className="flex items-center text-sm">
                        <svg className="w-4 h-4 text-green-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span className="text-green-700">{visitaSeleccionada.listaPersonal.length} tipos de personal especificados</span>
                      </div>
                    )}
                  </div>
                  
                  {visitaSeleccionada.coordenadasGPS?.latitud && (
                    <div className="mt-3 pt-3 border-t border-green-200">
                      <span className="text-green-600 font-medium">Ubicación GPS:</span>
                      <button
                        type="button"
                        onClick={() => {
                          const lat = visitaSeleccionada.coordenadasGPS.latitud
                          const lng = visitaSeleccionada.coordenadasGPS.longitud
                          openInBestMapApp(lat, lng, visitaSeleccionada.nombreProyecto || visitaSeleccionada.cliente)
                        }}
                        className="ml-2 text-green-600 hover:text-green-800 underline text-sm"
                      >
                        📍 Ver en mapa
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Nombre del Proyecto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Proyecto *
                  {visitaSeleccionada && <span className="text-green-600 text-xs ml-2">(Autocompletado desde visita técnica)</span>}
                </label>
                <input
                  type="text"
                  {...register('nombreProyecto', {
                    required: 'El nombre del proyecto es requerido',
                    minLength: { value: 3, message: 'Mínimo 3 caracteres' }
                  })}
                  className={`input-field ${errors.nombreProyecto ? 'border-red-500' : ''}`}
                  placeholder="Ej: Mantenimiento HVAC - Edificio Central"
                />
                {errors.nombreProyecto && (
                  <p className="text-red-500 text-sm mt-1">{errors.nombreProyecto.message}</p>
                )}
              </div>

              {/* Cliente - TERCERO */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cliente *
                  {visitaSeleccionada && <span className="text-green-600 text-xs ml-2">(Autocompletado desde visita técnica)</span>}
                </label>
                <select
                  className={`input-field ${errors.cliente ? 'border-red-500' : ''}`}
                  value={watch('cliente') || ''}
                  onChange={(e) => {
                    setClienteSeleccionado(e.target.value)
                    setValue('cliente', e.target.value, { shouldValidate: true })
                  }}
                >
                  <option value="">Seleccionar cliente...</option>
                  {clientesParaSelect.map((cliente) => (
                    <option key={cliente.id} value={cliente.nombre}>
                      {cliente.nombre} - {cliente.tipo === 'empresa' ? `RUC: ${cliente.ruc}` : `DNI: ${cliente.dni}`}
                      {String(cliente.id).startsWith('temp-') && ' (De visita técnica)'}
                    </option>
                  ))}
                </select>
                <input type="hidden" {...register('cliente', { required: 'El cliente es requerido' })} />
                {errors.cliente && (
                  <p className="mt-1 text-sm text-red-600">{errors.cliente.message}</p>
                )}
                
                {/* Información del cliente seleccionado */}
                {getClienteSeleccionado() && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Cliente seleccionado:</strong> {getClienteSeleccionado().nombre}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      {getClienteSeleccionado().email} • {getClienteSeleccionado().telefono}
                    </p>
                    <span className={`inline-block mt-2 px-2 py-1 text-xs font-medium rounded-full ${
                      getClienteSeleccionado().categoria === 'premium' ? 'bg-purple-100 text-purple-800' :
                      getClienteSeleccionado().categoria === 'regular' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {getClienteSeleccionado().categoria}
                    </span>
                  </div>
                )}
                
                {clientesParaSelect.length === 0 && (
                  <p className="mt-1 text-sm text-amber-600">
                    ⚠️ No hay clientes activos registrados. Contacta al administrador para agregar clientes.
                  </p>
                )}
              </div>

              {/* Tipo de Servicio - CUARTO */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Servicio *
                  {visitaSeleccionada && <span className="text-green-600 text-xs ml-2">(Autocompletado desde visita técnica)</span>}
                </label>
                <select
                  className={`input-field ${errors.tipoServicio ? 'border-red-500' : ''}`}
                  {...register('tipoServicio', { required: 'El tipo de servicio es requerido' })}
                >
                  {tiposServicioActivos.length === 0 ? (
                    <option value="">No hay tipos de servicio configurados</option>
                  ) : (
                    tiposServicioActivos.map((tipo) => (
                      <option key={tipo.id} value={tipo.nombre}>
                        {tipo.nombre}
                        {tipo.descripcion && ` - ${tipo.descripcion}`}
                      </option>
                    ))
                  )}
                </select>
                {errors.tipoServicio && (
                  <p className="mt-1 text-sm text-red-600">{errors.tipoServicio.message}</p>
                )}
                {tiposServicioActivos.length === 0 && (
                  <p className="mt-1 text-sm text-amber-600">
                    ⚠️ No hay tipos de servicio configurados. Contacta al administrador.
                  </p>
                )}
              </div>


              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prioridad *
                </label>
                <select
                  className={`input-field ${errors.prioridad ? 'border-red-500' : ''} ${
                    prioridad === 'urgente' ? 'border-purple-500 bg-purple-50 font-semibold' :
                    prioridad === 'alta' ? 'border-red-300 bg-red-50' :
                    prioridad === 'media' ? 'border-yellow-300 bg-yellow-50' :
                    'border-green-300 bg-green-50'
                  }`}
                  {...register('prioridad', { required: 'La prioridad es requerida' })}
                >
                  {!isEmergency && <option value="baja">🟢 Baja</option>}
                  {!isEmergency && <option value="media">🟡 Media</option>}
                  <option value="alta">🔴 Alta</option>
                  <option value="urgente">🚨 Urgente</option>
                </select>
                {errors.prioridad && (
                  <p className="mt-1 text-sm text-red-600">{errors.prioridad.message}</p>
                )}
              </div>

              {/* Orden de Compra */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Orden de Compra (Número)
                </label>
                <input
                  type="number"
                  className={`input-field ${errors.ordenCompraNumero ? 'border-red-500' : ''}`}
                  placeholder="Ingrese número de orden de compra"
                  {...register('ordenCompraNumero')}
                />
                {errors.ordenCompraNumero && (
                  <p className="mt-1 text-sm text-red-600">{errors.ordenCompraNumero.message}</p>
                )}
              </div>

              {/* Ubicación - QUINTO */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ubicación *
                  {visitaSeleccionada && <span className="text-green-600 text-xs ml-2">(Autocompletado desde visita técnica)</span>}
                </label>
                <input
                  type="text"
                  className={`input-field ${errors.ubicacion ? 'border-red-500' : ''}`}
                  placeholder="Ubicación específica del trabajo"
                  {...register('ubicacion', { required: 'La ubicación es requerida' })}
                />
                {errors.ubicacion && (
                  <p className="mt-1 text-sm text-red-600">{errors.ubicacion.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Detalles Técnicos */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Detalles Técnicos
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Técnico Asignado
                  {visitaSeleccionada && <span className="text-green-600 text-xs ml-2">(Autocompletado desde visita técnica)</span>}
                </label>
                <select
                  className="input-field"
                  {...register('tecnicoAsignado')}
                >
                  <option value="">Asignar después</option>
                  {tecnicosNombres.map((tecnico) => (
                    <option key={tecnico} value={tecnico}>{tecnico}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Vencimiento *
                </label>
                <input
                  type="date"
                  className={`input-field ${errors.fechaVencimiento ? 'border-red-500' : ''}`}
                  min={getToday()}
                  {...register('fechaVencimiento', { required: 'La fecha de vencimiento es requerida' })}
                />
                {errors.fechaVencimiento && (
                  <p className="mt-1 text-sm text-red-600">{errors.fechaVencimiento.message}</p>
                )}
              </div>

              {user?.role === 'admin' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Costo Estimado (S/)
                    {visitaSeleccionada && <span className="text-green-600 text-xs ml-2">(Autocompletado desde visita técnica)</span>}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input-field"
                    placeholder="0.00"
                    {...register('costoEstimado', { 
                      valueAsNumber: true,
                      min: { value: 0, message: 'El costo no puede ser negativo' }
                    })}
                  />
                  {errors.costoEstimado && (
                    <p className="mt-1 text-sm text-red-600">{errors.costoEstimado.message}</p>
                  )}
                </div>
              )}

              {/* Conditional Fields for Emergency */}
              {isEmergency && (
                <div className="bg-red-50 p-3 sm:p-4 rounded-lg border border-red-200">
                  <label className="block text-sm font-medium text-red-700 mb-1">
                    Justificación de Emergencia *
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
                    rows="3"
                    placeholder="Explique por qué esta orden es una emergencia..."
                    {...register('justificacionEmergencia', {
                      required: isEmergency ? 'La justificación es requerida para emergencias' : false
                    })}
                  />
                  {errors.justificacionEmergencia && (
                    <p className="mt-1 text-sm text-red-600">{errors.justificacionEmergencia.message}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Descripción */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Descripción del Trabajo
          </h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción Detallada *
              {visitaSeleccionada && <span className="text-green-600 text-xs ml-2">(Autocompletado desde visita técnica)</span>}
            </label>
            <textarea
              className={`input-field ${errors.descripcion ? 'border-red-500' : ''}`}
              rows="4"
              placeholder="Describa detalladamente el trabajo a realizar..."
              {...register('descripcion', { 
                required: 'La descripción es requerida',
                minLength: { value: 20, message: 'La descripción debe tener al menos 20 caracteres' }
              })}
            />
            {errors.descripcion && (
              <p className="mt-1 text-sm text-red-600">{errors.descripcion.message}</p>
            )}
          </div>

          {/* Observaciones Adicionales */}
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

        {/* Materiales Requeridos - Mostrar según tipo de visita */}
        {tipoVisita === 'con_visita' && visitaTecnicaOrigen === 'nueva' ? (
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Materiales Requeridos
            </h2>

            <div className="bg-blue-50 p-3 rounded-lg mb-4">
              <p className="text-sm text-blue-700">
                💡 <strong>Información:</strong> Seleccione materiales del inventario o escriba nombres personalizados.
              </p>
            </div>

            <div className="space-y-4">
              {/* Input con dropdown */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Buscar y Agregar Material
                </label>
                <div className="relative">
                  <input
                    type="text"
                    className="input-field pr-8"
                    placeholder="Busque por nombre o código..."
                    value={inputMaterialRequerido}
                    onChange={(e) => {
                      setInputMaterialRequerido(e.target.value)
                      setMostrarDropdownMateriales(true)
                    }}
                    onFocus={() => setMostrarDropdownMateriales(true)}
                    onBlur={() => setTimeout(() => setMostrarDropdownMateriales(false), 200)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && inputMaterialRequerido.trim()) {
                        e.preventDefault()
                        handleSeleccionarMaterialRequerido(inputMaterialRequerido)
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarDropdownMateriales(!mostrarDropdownMateriales)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown */}
                  {mostrarDropdownMateriales && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                      {materialesFiltrados.length > 0 && (
                        <>
                          {materialesFiltrados.slice(0, 10).map((material) => (
                            <button
                              key={material.id}
                              type="button"
                              onClick={() => handleSeleccionarMaterialRequerido(material)}
                              className="w-full px-4 py-3 text-left hover:bg-blue-50 border-b text-sm"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center flex-1">
                                  <span className="text-blue-600 mr-2">📦</span>
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-900">{material.nombre}</div>
                                    <div className="text-xs text-gray-500">
                                      {material.codigo} • Stock: {material.stockActual} {material.unidadMedida}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </>
                      )}

                      {inputMaterialRequerido && !materialesFiltrados.some(m => m.nombre.toLowerCase() === inputMaterialRequerido.toLowerCase()) && (
                        <button
                          type="button"
                          onClick={() => handleSeleccionarMaterialRequerido(inputMaterialRequerido)}
                          className="w-full px-4 py-2 text-left hover:bg-green-50 text-sm"
                        >
                          <div className="flex items-center">
                            <span className="text-green-600 mr-2">✏️</span>
                            <span className="font-medium">Agregar: "{inputMaterialRequerido}"</span>
                            <span className="text-xs text-gray-500 ml-2">(personalizado)</span>
                          </div>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Lista de materiales seleccionados */}
              {materialesRequeridosLista.length > 0 && (
                <div className="border rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Materiales Agregados ({materialesRequeridosLista.length})
                  </h3>
                  <div className="space-y-2">
                    {materialesRequeridosLista.map((material, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <div className="flex items-center">
                          <span className="text-blue-600 mr-2">📦</span>
                          <span className="text-sm">{material}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleEliminarMaterialRequerido(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hidden field para react-hook-form */}
              <input
                type="hidden"
                {...register('materialesRequeridos')}
              />
            </div>
          </div>
        ) : tipoVisita === 'con_visita' && visitaSeleccionada ? (
          <div className="card">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Inventario de la Visita Técnica
              </h2>
              <span className="text-sm text-gray-500">
                {materialesVisitaEditables.length} {materialesVisitaEditables.length === 1 ? 'material' : 'materiales'}
              </span>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-blue-400 text-xl">📋</span>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Materiales de la visita técnica
                  </h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Ajusta la cantidad de cada material (límite: stock disponible). Puedes agregar o eliminar materiales según las necesidades.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Lista de materiales - Solo cantidad editable */}
            <div className="space-y-2 mb-4">
              {materialesVisitaEditables.map((material, index) => (
                <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 rounded-lg border gap-2">
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 items-center">
                    {/* Nombre - Solo lectura */}
                    <div>
                      <span className="text-sm font-medium text-gray-900">{material.nombre}</span>
                    </div>
                    {/* Cantidad - Editable con limite de stock */}
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="1"
                        max={material.stockActual || 999}
                        className="w-20 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={material.cantidad}
                        onChange={(e) => {
                          const nuevaCantidad = parseInt(e.target.value) || 1
                          const maxStock = material.stockActual || 999
                          const cantidadFinal = Math.min(Math.max(1, nuevaCantidad), maxStock)
                          const newMateriales = [...materialesVisitaEditables]
                          newMateriales[index].cantidad = cantidadFinal
                          newMateriales[index].subtotal = cantidadFinal * (material.precioUnitario || 0)
                          setMaterialesVisitaEditables(newMateriales)
                        }}
                      />
                      <span className="text-xs text-gray-500">
                        / {material.stockActual || '?'} disp.
                      </span>
                    </div>
                    {/* Unidad - Solo lectura */}
                    <div>
                      <span className="text-sm text-gray-600">{material.unidad || 'unidad'}</span>
                    </div>
                    {/* Subtotal - Calculado automaticamente */}
                    <div>
                      {canViewPrices(user) && (
                        <span className="text-sm font-semibold text-gray-900">
                          S/ {((material.cantidad || 0) * (material.precioUnitario || 0)).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newMateriales = materialesVisitaEditables.filter((_, i) => i !== index)
                      setMaterialesVisitaEditables(newMateriales)
                    }}
                    className="ml-0 sm:ml-2 p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded self-end sm:self-auto"
                    title="Eliminar material"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            
            {/* Formulario para agregar nuevo material */}
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-3 sm:p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Agregar nuevo material</h4>

              {/* Opción 1: Desde inventario */}
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <div className="flex-shrink-0">
                  <span className="text-gray-400 text-lg">📦</span>
                </div>
                <select
                  className="input-field text-sm flex-1 min-w-[200px]"
                  value={nuevoMaterial.nombre}
                  onChange={(e) => {
                    const materialSeleccionado = (materiales || []).find(m => m.nombre === e.target.value)
                    if (materialSeleccionado) {
                      setNuevoMaterial({
                        nombre: materialSeleccionado.nombre,
                        cantidad: 1,
                        unidad: materialSeleccionado.unidadMedida || 'unidad',
                        precioUnitario: materialSeleccionado.precioUnitario || 0,
                        stockActual: materialSeleccionado.stockActual || 999,
                        materialId: materialSeleccionado.id
                      })
                    } else {
                      setNuevoMaterial({...nuevoMaterial, nombre: e.target.value})
                    }
                  }}
                >
                  <option value="">Seleccionar del inventario...</option>
                  {(materiales || []).filter(m => m.stockActual > 0).map((material) => (
                    <option key={material.id} value={material.nombre}>
                      {material.nombre} - Stock: {material.stockActual} {material.unidadMedida}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  max={nuevoMaterial.stockActual || 999}
                  placeholder="Cant."
                  className="input-field text-sm w-20"
                  value={nuevoMaterial.cantidad}
                  onChange={(e) => {
                    const cant = Math.min(parseInt(e.target.value) || 1, nuevoMaterial.stockActual || 999)
                    setNuevoMaterial({
                      ...nuevoMaterial,
                      cantidad: cant
                    })
                  }}
                />
                <span className="text-sm text-gray-500">
                  {nuevoMaterial.unidad || 'unidad'}
                </span>
                {canViewPrices(user) && nuevoMaterial.precioUnitario > 0 && (
                  <span className="text-sm font-medium text-gray-700">
                    S/ {((nuevoMaterial.cantidad || 0) * (nuevoMaterial.precioUnitario || 0)).toFixed(2)}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (nuevoMaterial.nombre && nuevoMaterial.nombre.trim()) {
                      const nuevoMaterialCompleto = {
                        id: Date.now(),
                        nombre: nuevoMaterial.nombre,
                        cantidad: nuevoMaterial.cantidad || 1,
                        unidad: nuevoMaterial.unidad || 'unidad',
                        precioUnitario: nuevoMaterial.precioUnitario || 0,
                        stockActual: nuevoMaterial.stockActual || 999,
                        materialId: nuevoMaterial.materialId || null
                      }
                      setMaterialesVisitaEditables([...materialesVisitaEditables, nuevoMaterialCompleto])
                      setNuevoMaterial({ nombre: '', cantidad: 1, unidad: '', precioUnitario: 0, stockActual: 999, materialId: null })
                    }
                  }}
                  className="btn-primary px-3 py-1 text-sm"
                  disabled={!nuevoMaterial.nombre || !nuevoMaterial.nombre.trim()}
                >
                  Agregar
                </button>
              </div>

              {/* Opción 2: Entrada manual */}
              <div className="flex flex-wrap items-center gap-3 border-t border-gray-200 pt-3">
                <div className="flex-shrink-0">
                  <span className="text-gray-400 text-lg">✏️</span>
                </div>
                <input
                  type="text"
                  className="input-field text-sm flex-1 min-w-[200px]"
                  placeholder="O escribir nombre de material manualmente..."
                  value={inputMaterialSinVisita}
                  onChange={(e) => setInputMaterialSinVisita(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && inputMaterialSinVisita.trim()) {
                      e.preventDefault()
                      const nuevoMaterialManual = {
                        id: Date.now(),
                        nombre: inputMaterialSinVisita.trim(),
                        cantidad: 1,
                        unidad: 'unidad',
                        precioUnitario: 0,
                        stockActual: 999,
                        materialId: null
                      }
                      setMaterialesVisitaEditables([...materialesVisitaEditables, nuevoMaterialManual])
                      setInputMaterialSinVisita('')
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (inputMaterialSinVisita.trim()) {
                      const nuevoMaterialManual = {
                        id: Date.now(),
                        nombre: inputMaterialSinVisita.trim(),
                        cantidad: 1,
                        unidad: 'unidad',
                        precioUnitario: 0,
                        stockActual: 999,
                        materialId: null
                      }
                      setMaterialesVisitaEditables([...materialesVisitaEditables, nuevoMaterialManual])
                      setInputMaterialSinVisita('')
                    }
                  }}
                  className="btn-secondary px-3 py-1 text-sm"
                  disabled={!inputMaterialSinVisita.trim()}
                >
                  Agregar manual
                </button>
              </div>
            </div>
            
            {/* Total de materiales */}
            {materialesVisitaEditables.length > 0 && canViewPrices(user) && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>Total estimado de materiales:</strong> S/ {materialesVisitaEditables.reduce((total, m) => total + ((m.cantidad || 0) * (m.precioUnitario || 0)), 0).toFixed(2)}
                </p>
              </div>
            )}
          </div>
        ) : tipoVisita === 'sin_visita' ? (
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Selección de Inventario
            </h2>
            
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 sm:p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-amber-400 text-xl">📦</span>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-amber-800">
                    Inventario para órdenes sin visita técnica
                  </h3>
                  <p className="text-sm text-amber-700 mt-1">
                    Seleccione los materiales y herramientas del inventario que el técnico llevará para realizar el trabajo.
                    Estos elementos se descontarán del inventario al completar la orden.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Tabs para Materiales y Herramientas */}
            <div className="mb-6">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto" aria-label="Tabs">
                  <button
                    type="button"
                    onClick={() => setActiveInventoryTab('materiales')}
                    className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                      activeInventoryTab === 'materiales'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    🧱 Materiales
                    {materialesSeleccionados.length > 0 && (
                      <span className="ml-2 bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded-full">
                        {materialesSeleccionados.length}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveInventoryTab('herramientas')}
                    className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                      activeInventoryTab === 'herramientas'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    🔧 Herramientas
                    {herramientasSeleccionadas.length > 0 && (
                      <span className="ml-2 bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded-full">
                        {herramientasSeleccionadas.length}
                      </span>
                    )}
                  </button>
                </nav>
              </div>
            </div>
            
            {/* Contenido de las tabs */}
            {activeInventoryTab === 'materiales' && (
              <div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <span className="text-blue-400 text-xl">🧱</span>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">
                        Materiales del inventario
                      </h3>
                      <p className="text-sm text-blue-700 mt-1">
                        Seleccione los materiales que el técnico necesitará para completar el trabajo.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Combobox para agregar materiales */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Agregar Material
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <div className="flex-shrink-0 hidden sm:block">
                      <span className="text-gray-400 text-lg">📦</span>
                    </div>
                    <select
                      className="input-field text-sm flex-1 min-w-0"
                      value={inputMaterialSinVisita}
                      onChange={(e) => setInputMaterialSinVisita(e.target.value)}
                    >
                      <option value="">Seleccionar material...</option>
                      {(materiales || []).filter(m => m.stockActual > 0).map((material) => (
                        <option key={material.id} value={material.id}>
                          {material.nombre} - Stock: {material.stockActual} {material.unidadMedida}{canViewPrices(user) ? ` - S/ ${material.precioUnitario}` : ''}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        if (inputMaterialSinVisita) {
                          const materialSeleccionado = (materiales || []).find(m => m.id === parseInt(inputMaterialSinVisita))
                          if (materialSeleccionado && !materialesSeleccionados.find(m => m.id === materialSeleccionado.id)) {
                            setMaterialesSeleccionados([
                              ...materialesSeleccionados,
                              {
                                id: materialSeleccionado.id,
                                nombre: materialSeleccionado.nombre,
                                cantidad: 1,
                                unidad: materialSeleccionado.unidadMedida || '',
                                precioUnitario: materialSeleccionado.precioUnitario,
                                stockActual: materialSeleccionado.stockActual
                              }
                            ])
                            setInputMaterialSinVisita('')
                          }
                        }
                      }}
                      className="btn-primary px-4 py-2 text-sm whitespace-nowrap w-full sm:w-auto"
                      disabled={!inputMaterialSinVisita || materialesSeleccionados.find(m => m.id === parseInt(inputMaterialSinVisita))}
                    >
                      Agregar
                    </button>
                  </div>
                </div>

                {/* Lista de materiales seleccionados */}
                {materialesSeleccionados.length > 0 && (
                  <div className="border rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">
                      Materiales Agregados ({materialesSeleccionados.length})
                    </h3>
                    <div className="space-y-3">
                      {materialesSeleccionados.map((material, index) => (
                        <div key={material.id} className="bg-gray-50 p-3 rounded">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center min-w-0 flex-1">
                              <span className="text-blue-600 mr-2 sm:mr-3 flex-shrink-0">📦</span>
                              <span className="text-sm font-medium truncate">{material.nombre}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setMaterialesSeleccionados(materialesSeleccionados.filter(m => m.id !== material.id))
                              }}
                              className="text-red-600 hover:text-red-800 flex-shrink-0"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 ml-6 sm:ml-8">
                            <div className="flex items-center space-x-2">
                              <label className="text-xs text-gray-600">Cantidad:</label>
                              <input
                                type="number"
                                min="1"
                                max={material.stockActual}
                                value={material.cantidad}
                                onChange={(e) => {
                                  const nuevaCantidad = parseInt(e.target.value) || 1
                                  if (nuevaCantidad <= material.stockActual) {
                                    const nuevosMateriales = [...materialesSeleccionados]
                                    nuevosMateriales[index].cantidad = nuevaCantidad
                                    setMaterialesSeleccionados(nuevosMateriales)
                                  }
                                }}
                                className="w-16 px-2 py-1 text-sm border border-gray-300 rounded"
                              />
                              <span className="text-xs text-gray-600">{material.unidad}</span>
                            </div>
                            <span className="text-xs text-gray-500">
                              Stock: {material.stockActual}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {canViewPrices(user) && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-sm font-medium text-gray-700">
                          Total: S/ {materialesSeleccionados.reduce((total, m) => total + (m.cantidad * m.precioUnitario), 0).toFixed(2)}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {materialesSeleccionados.length === 0 && (
                  <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                    <span className="text-4xl mb-2 block">📦</span>
                    <p className="text-sm">Seleccione materiales del inventario</p>
                  </div>
                )}
              </div>
            )}
            
            {activeInventoryTab === 'herramientas' && (
              <div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <span className="text-blue-400 text-xl">🔧</span>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">
                        Herramientas del inventario
                      </h3>
                      <p className="text-sm text-blue-700 mt-1">
                        Seleccione las herramientas que el técnico necesitará para completar el trabajo.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Combobox para agregar herramientas */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Agregar Herramienta
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <div className="flex-shrink-0 hidden sm:block">
                      <span className="text-gray-400 text-lg">🛠️</span>
                    </div>
                    <select
                      className="input-field text-sm flex-1 min-w-0"
                      value={inputHerramientaSinVisita}
                      onChange={(e) => setInputHerramientaSinVisita(e.target.value)}
                    >
                      <option value="">Seleccionar herramienta...</option>
                      {(herramientas || [])
                        .filter(h => h.estado === 'available' && h.cantidad > 0)
                        .map((herramienta) => (
                          <option key={herramienta.id} value={herramienta.id}>
                            {herramienta.nombre}
                            {herramienta.marca && ` - ${herramienta.marca}`}
                            {herramienta.modelo && ` ${herramienta.modelo}`}
                            {` - Disponibles: ${herramienta.cantidad}`}
                            {herramienta.ubicacion && ` - ${herramienta.ubicacion}`}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        if (inputHerramientaSinVisita) {
                          const herramientaSeleccionada = (herramientas || []).find(
                            h => h.id === parseInt(inputHerramientaSinVisita)
                          )

                          if (herramientaSeleccionada && !herramientasSeleccionadas.find(h => h.id === herramientaSeleccionada.id)) {
                            setHerramientasSeleccionadas([
                              ...herramientasSeleccionadas,
                              {
                                id: herramientaSeleccionada.id,
                                nombre: herramientaSeleccionada.nombre,
                                codigo: herramientaSeleccionada.codigo,
                                marca: herramientaSeleccionada.marca,
                                modelo: herramientaSeleccionada.modelo,
                                cantidadDisponible: herramientaSeleccionada.cantidad,
                                ubicacion: herramientaSeleccionada.ubicacion,
                                valor: herramientaSeleccionada.valor || 0,
                                cantidadSolicitada: 1
                              }
                            ])
                            setInputHerramientaSinVisita('')
                          }
                        }
                      }}
                      className="btn-primary px-4 py-2 text-sm whitespace-nowrap w-full sm:w-auto"
                      disabled={!inputHerramientaSinVisita || herramientasSeleccionadas.find(h => h.id === parseInt(inputHerramientaSinVisita))}
                    >
                      Agregar
                    </button>
                  </div>
                </div>

                {/* Lista de herramientas seleccionadas */}
                {herramientasSeleccionadas.length > 0 && (
                  <div className="border rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">
                      Herramientas Agregadas ({herramientasSeleccionadas.length})
                    </h3>
                    <div className="space-y-3">
                      {herramientasSeleccionadas.map((herramienta, index) => (
                        <div key={herramienta.id} className="bg-gray-50 p-3 rounded-md border border-gray-200">
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900 flex items-center">
                                <span className="text-blue-600 mr-2">🛠️</span>
                                {herramienta.nombre}
                              </p>
                              {(herramienta.marca || herramienta.modelo) && (
                                <p className="text-xs text-gray-500 mt-1 ml-6">
                                  {herramienta.marca} {herramienta.modelo}
                                </p>
                              )}
                              <p className="text-xs text-gray-400 mt-1 ml-6">
                                Código: {herramienta.codigo} • Disponibles: {herramienta.cantidadDisponible}
                                {herramienta.ubicacion && ` • ${herramienta.ubicacion}`}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setHerramientasSeleccionadas(
                                  herramientasSeleccionadas.filter(h => h.id !== herramienta.id)
                                )
                              }}
                              className="text-red-600 hover:text-red-800 ml-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>

                          {/* Campo para editar cantidad solicitada */}
                          <div className="mt-2 flex items-center space-x-2 ml-6">
                            <label className="text-xs text-gray-600">Cantidad:</label>
                            <input
                              type="number"
                              min="1"
                              max={herramienta.cantidadDisponible}
                              value={herramienta.cantidadSolicitada}
                              onChange={(e) => {
                                const nuevasCantidades = [...herramientasSeleccionadas]
                                nuevasCantidades[index].cantidadSolicitada = parseInt(e.target.value) || 1
                                setHerramientasSeleccionadas(nuevasCantidades)
                              }}
                              className="input-field text-sm w-20"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {herramientasSeleccionadas.length === 0 && (
                  <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                    <span className="text-4xl mb-2 block">🛠️</span>
                    <p className="text-sm">Seleccione herramientas del listado</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}

        {/* Herramientas de la Visita Técnica */}
        {tipoVisita === 'con_visita' && (
          <div className="card">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Herramientas de la Visita Técnica
              </h2>
              <span className="text-sm text-gray-500">
                {herramientasVisitaEditables.length} {herramientasVisitaEditables.length === 1 ? 'herramienta' : 'herramientas'}
              </span>
            </div>
            
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 sm:p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-orange-400 text-xl">🔧</span>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-orange-800">
                    Herramientas requeridas
                  </h3>
                  <p className="text-sm text-orange-700 mt-1">
                    Ajusta la cantidad de cada herramienta según las necesidades del trabajo.
                  </p>
                </div>
              </div>
            </div>

            {/* Lista de herramientas - Solo cantidad editable */}
            <div className="space-y-2 mb-4">
              {herramientasVisitaEditables.map((herramienta, index) => (
                <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 rounded-lg border group gap-2">
                  <div className="flex items-center flex-1 min-w-0">
                    <div className="flex-shrink-0 mr-3">
                      <span className="text-gray-600 text-lg">🛠️</span>
                    </div>
                    {/* Nombre - Solo lectura */}
                    <span className="text-sm font-medium text-gray-900 flex-1 truncate">
                      {typeof herramienta === 'string' ? herramienta : herramienta.nombre}
                    </span>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-2 ml-9 sm:ml-0">
                    {/* Cantidad - Editable */}
                    <div className="flex items-center space-x-2">
                      <label className="text-xs text-gray-500">Cant:</label>
                      <input
                        type="number"
                        min="1"
                        className="w-16 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={typeof herramienta === 'string' ? 1 : (herramienta.cantidad || 1)}
                        onChange={(e) => {
                          const nuevaCantidad = Math.max(1, parseInt(e.target.value) || 1)
                          const newHerramientas = [...herramientasVisitaEditables]
                          if (typeof herramienta === 'string') {
                            newHerramientas[index] = { id: Date.now(), nombre: herramienta, cantidad: nuevaCantidad }
                          } else {
                            newHerramientas[index] = { ...herramienta, cantidad: nuevaCantidad }
                          }
                          setHerramientasVisitaEditables(newHerramientas)
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newHerramientas = herramientasVisitaEditables.filter((_, i) => i !== index)
                        setHerramientasVisitaEditables(newHerramientas)
                      }}
                      className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Eliminar herramienta"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Formulario para agregar nueva herramienta */}
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-3 sm:p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Agregar nueva herramienta</h4>

              {/* Opción 1: Desde inventario */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center mb-3">
                <div className="flex-shrink-0 hidden sm:block">
                  <span className="text-gray-400 text-lg">🛠️</span>
                </div>
                <select
                  className="input-field text-sm flex-1 min-w-0"
                  value={typeof nuevaHerramienta === 'object' ? nuevaHerramienta.nombre || '' : nuevaHerramienta}
                  onChange={(e) => setNuevaHerramienta(e.target.value)}
                >
                  <option value="">Seleccionar del inventario...</option>
                  {(herramientas || []).filter(h => h.estado === 'available' || h.estado === 'active').map((h) => (
                    <option key={h.id} value={h.nombre}>
                      {h.nombre} {h.marca ? `- ${h.marca}` : ''} (Disp: {h.cantidad || 1})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    const nombreHerramienta = typeof nuevaHerramienta === 'object'
                      ? nuevaHerramienta.nombre
                      : nuevaHerramienta
                    if (nombreHerramienta && nombreHerramienta.trim()) {
                      const herramientaInventario = (herramientas || []).find(h => h.nombre === nombreHerramienta.trim())
                      const nuevaHerramientaObj = {
                        id: Date.now(),
                        nombre: nombreHerramienta.trim(),
                        cantidad: 1,
                        inventarioId: herramientaInventario?.id || null
                      }
                      setHerramientasVisitaEditables([...herramientasVisitaEditables, nuevaHerramientaObj])
                      setNuevaHerramienta('')
                    }
                  }}
                  className="btn-primary px-3 py-1 text-sm"
                  disabled={!nuevaHerramienta || (typeof nuevaHerramienta === 'string' && !nuevaHerramienta.trim())}
                >
                  Agregar
                </button>
              </div>

              {/* Opción 2: Entrada manual */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center border-t border-gray-200 pt-3">
                <div className="flex-shrink-0 hidden sm:block">
                  <span className="text-gray-400 text-lg">✏️</span>
                </div>
                <input
                  type="text"
                  className="input-field text-sm flex-1 min-w-0"
                  placeholder="O escribir nombre de herramienta manualmente..."
                  value={inputHerramientaSinVisita}
                  onChange={(e) => setInputHerramientaSinVisita(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && inputHerramientaSinVisita.trim()) {
                      e.preventDefault()
                      const nuevaHerramientaObj = {
                        id: Date.now(),
                        nombre: inputHerramientaSinVisita.trim(),
                        cantidad: 1,
                        inventarioId: null
                      }
                      setHerramientasVisitaEditables([...herramientasVisitaEditables, nuevaHerramientaObj])
                      setInputHerramientaSinVisita('')
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (inputHerramientaSinVisita.trim()) {
                      const nuevaHerramientaObj = {
                        id: Date.now(),
                        nombre: inputHerramientaSinVisita.trim(),
                        cantidad: 1,
                        inventarioId: null
                      }
                      setHerramientasVisitaEditables([...herramientasVisitaEditables, nuevaHerramientaObj])
                      setInputHerramientaSinVisita('')
                    }
                  }}
                  className="btn-secondary px-3 py-1 text-sm w-full sm:w-auto"
                  disabled={!inputHerramientaSinVisita.trim()}
                >
                  Agregar manual
                </button>
              </div>
            </div>
            
            {herramientasVisitaEditables.length === 0 && !visitaSeleccionada && (
              <div className="text-center py-4 text-gray-500">
                <p className="text-sm">Seleccione una visita técnica o agregue herramientas manualmente</p>
              </div>
            )}
          </div>
        )}

        {/* Personal de la Visita Técnica */}
        {tipoVisita === 'con_visita' && (
          <div className="card">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Personal de la Visita Técnica
              </h2>
              <span className="text-sm text-gray-500">
                {personalVisitaEditable.length} {personalVisitaEditable.length === 1 ? 'especialista' : 'especialistas'}
              </span>
            </div>
            
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 sm:p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-purple-400 text-xl">👥</span>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-purple-800">
                    Especialidades de personal editables
                  </h3>
                  <p className="text-sm text-purple-700 mt-1">
                    Ajusta los requisitos de personal y tiempo estimado según las necesidades del proyecto.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Lista de personal editable */}
            <div className="space-y-3 mb-4">
              {personalVisitaEditable.map((personal, index) => (
                <div key={index} className="p-3 sm:p-4 bg-gray-50 rounded-lg border group">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="flex items-start flex-1 min-w-0">
                      <div className="flex-shrink-0 mr-3">
                        <span className="text-blue-600 text-lg">👨‍🔧</span>
                      </div>
                      <div className="flex-1 space-y-2 min-w-0">
                        <input
                          type="text"
                          className="w-full text-sm border-0 bg-transparent font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white rounded px-2 py-1"
                          value={personal.especialidad}
                          onChange={(e) => {
                            const newPersonal = [...personalVisitaEditable]
                            newPersonal[index].especialidad = e.target.value
                            setPersonalVisitaEditable(newPersonal)
                          }}
                          placeholder="Especialidad (ej: Técnico HVAC, Electricista...)"
                        />
                        <input
                          type="text"
                          className="w-full text-sm border-0 bg-transparent text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white rounded px-2 py-1"
                          value={personal.descripcion || ''}
                          onChange={(e) => {
                            const newPersonal = [...personalVisitaEditable]
                            newPersonal[index].descripcion = e.target.value
                            setPersonalVisitaEditable(newPersonal)
                          }}
                          placeholder="Descripción opcional del trabajo específico"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3 ml-9 sm:ml-0 flex-shrink-0">
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min="0.5"
                          step="0.5"
                          className="w-16 text-sm border-0 bg-transparent font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white rounded px-2 py-1 text-center"
                          value={personal.diasEstimados}
                          onChange={(e) => {
                            const newPersonal = [...personalVisitaEditable]
                            newPersonal[index].diasEstimados = parseFloat(e.target.value) || 0
                            setPersonalVisitaEditable(newPersonal)
                          }}
                          placeholder="0"
                        />
                        <span className="text-sm text-gray-600">días</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newPersonal = personalVisitaEditable.filter((_, i) => i !== index)
                          setPersonalVisitaEditable(newPersonal)
                        }}
                        className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Formulario para agregar nuevo personal */}
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-3 sm:p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Agregar nueva especialidad</h4>
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <div className="flex-shrink-0 hidden sm:block">
                    <span className="text-gray-400 text-lg">👨‍🔧</span>
                  </div>
                  <div className="flex-1 space-y-3">
                    <input
                      type="text"
                      placeholder="Especialidad (ej: Técnico HVAC, Electricista, Soldador...)"
                      className="input-field text-sm w-full"
                      value={nuevoPersonal.especialidad}
                      onChange={(e) => setNuevoPersonal({...nuevoPersonal, especialidad: e.target.value})}
                    />
                    <input
                      type="text"
                      placeholder="Descripción del trabajo (opcional)"
                      className="input-field text-sm w-full"
                      value={nuevoPersonal.descripcion}
                      onChange={(e) => setNuevoPersonal({...nuevoPersonal, descripcion: e.target.value})}
                    />
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min="0.5"
                          step="0.5"
                          placeholder="Días"
                          className="input-field text-sm w-20"
                          value={nuevoPersonal.diasEstimados}
                          onChange={(e) => setNuevoPersonal({...nuevoPersonal, diasEstimados: e.target.value})}
                        />
                        <span className="text-sm text-gray-600">días estimados</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (nuevoPersonal.especialidad.trim()) {
                            setPersonalVisitaEditable([...personalVisitaEditable, {
                              especialidad: nuevoPersonal.especialidad.trim(),
                              descripcion: nuevoPersonal.descripcion.trim(),
                              diasEstimados: parseFloat(nuevoPersonal.diasEstimados) || 1
                            }])
                            setNuevoPersonal({ especialidad: '', diasEstimados: '', descripcion: '' })
                          }
                        }}
                        className="btn-primary px-3 py-1 text-sm"
                      >
                        ✅ Agregar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Total de días */}
            {personalVisitaEditable.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Total estimado:</strong> {' '}
                  {personalVisitaEditable.reduce((total, p) => total + (parseFloat(p.diasEstimados) || 0), 0)} días de trabajo
                </p>
              </div>
            )}
            
            {personalVisitaEditable.length === 0 && !visitaSeleccionada && (
              <div className="text-center py-4 text-gray-500">
                <p className="text-sm">Seleccione una visita técnica o agregue especialistas manualmente</p>
              </div>
            )}
          </div>
        )}

        {/* Fotos */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Fotografías (Opcional)
          </h2>
          
          {/* Nota informativa sobre restricciones */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-blue-400 text-xl">ℹ️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Información sobre fotografías
                </h3>
                <div className="text-sm text-blue-700 mt-1">
                  <p className="mb-2">Las fotografías se pueden adjuntar en la creación, pero se aplicarán las siguientes restricciones después:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>Proyectos con visita técnica:</strong> Fotografías adicionales solo después de la primera visita</li>
                    <li><strong>Proyectos sin visita técnica:</strong> Fotografías adicionales solo después de iniciar el proyecto</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          
          <PhotoUpload
            photos={photos}
            onPhotosChange={setPhotos}
            label="Agregar fotos del área de trabajo"
            maxPhotos={5}
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => navigate('/ordenes')}
            className="btn-secondary"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className={`btn-primary ${isEmergency ? 'bg-red-600 hover:bg-red-700' : ''} ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? 'Creando...' : isEmergency ? '🚨 Crear Emergencia' : 'Crear Orden'}
          </button>
        </div>
      </form>
      
    </div>
  )
}

export default OrdenNueva