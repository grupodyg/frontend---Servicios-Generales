import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import useVisitasTecnicasStore from '../../../../stores/visitasTecnicasStore'
import useAuthStore from '../../../../stores/authStore'
import usePresupuestosStore from '../../../../stores/presupuestosStore'
import useMaterialesStore from '../../../../stores/materialesStore'
import useHerramientasStore from '../../../../stores/herramientasStore'
import useTecnicosStore from '../../../../stores/tecnicosStore'
import useSpecialtyRatesStore from '../../../../stores/specialtyRatesStore'
import { usePDFGenerator } from '../../../../utils/pdfGenerator.jsx'
import { isAdmin, isAdminOrSupervisor, isTecnico } from '../../../../utils/roleUtils'
import { getCurrentTimestamp } from '../../../../utils/dateUtils'
import {
  VISITA_ESTADOS,
  ESTADOS_EDITABLE_TECNICO,
  ESTADOS_EDITABLE_SI_RECHAZADO,
  ESTADOS_COMPLETABLES,
  ESTADOS_FIRMABLES,
  getEstadoLabel
} from '../../../../constants/visitasTecnicasConstants'
import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'

const MySwal = withReactContent(Swal)

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2000,
  timerProgressBar: true,
})

// Listas predefinidas
export const MATERIALES_COMUNES = [
  'Filtros HVAC', 'Refrigerante R-410A', 'Refrigerante R-22', 'Termostatos',
  'Ductos de aire', 'Rejillas de ventilación', 'Serpentines de evaporador',
  'Compresores', 'Válvulas de expansión', 'Sensores de temperatura',
  'Cables eléctricos 12 AWG', 'Cables eléctricos 14 AWG', 'Interruptores 15A',
  'Interruptores 20A', 'Tomacorrientes', 'Cajas de conexión', 'Conduit eléctrico',
  'Breakers', 'Tableros eléctricos', 'Contactores', 'Relés', 'Fusibles',
  'Tuberías PVC 1/2"', 'Tuberías PVC 3/4"', 'Tuberías PVC 1"', 'Codos PVC',
  'Tees PVC', 'Válvulas de bola', 'Válvulas de compuerta', 'Llaves de paso',
  'Pegamento PVC', 'Cinta teflón', 'Empaquetaduras', 'Grifería',
  'Perfiles metálicos', 'Soldadura 6013', 'Soldadura 7018', 'Pernos hexagonales',
  'Tuercas', 'Arandelas', 'Ángulos de acero', 'Pintura anticorrosiva',
  'Thinner', 'Discos de corte', 'Tornillos autorroscantes', 'Tornillos hexagonales',
  'Silicona', 'Adhesivos', 'Cintas aislantes', 'Abrazaderas', 'Otros (especificar)'
]

export const ESPECIALIDADES_PERSONAL = [
  'Técnico HVAC', 'Técnico Eléctrico', 'Técnico de Plomería', 'Técnico Estructural',
  'Técnico General', 'Soldador Especializado', 'Técnico en Refrigeración',
  'Técnico en Automatización', 'Técnico en Seguridad', 'Ayudante General',
  'Supervisor de Campo', 'Especialista en Gases Medicinales',
  'Técnico en Sistemas contra Incendios', 'Técnico en Telecomunicaciones',
  'Operador de Equipos', 'Otros (especificar)'
]

const useVisitaDetalle = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  // Stores con selectores optimizados (Opción C)
  const user = useAuthStore(state => state.user)

  const updateVisitaTecnica = useVisitasTecnicasStore(state => state.updateVisitaTecnica)
  const fetchVisitaById = useVisitasTecnicasStore(state => state.fetchVisitaById)
  const fetchVisitas = useVisitasTecnicasStore(state => state.fetchVisitas)
  const isLoading = useVisitasTecnicasStore(state => state.isLoading)
  const aceptarVisitaTecnica = useVisitasTecnicasStore(state => state.aceptarVisitaTecnica)
  const rechazarVisitaTecnica = useVisitasTecnicasStore(state => state.rechazarVisitaTecnica)
  const uploadVisitaPhoto = useVisitasTecnicasStore(state => state.uploadVisitaPhoto)

  const createPresupuesto = usePresupuestosStore(state => state.createPresupuesto)
  const presupuestos = usePresupuestosStore(state => state.presupuestos)
  const fetchPresupuestos = usePresupuestosStore(state => state.fetchPresupuestos)

  const materiales = useMaterialesStore(state => state.materiales)
  const fetchMateriales = useMaterialesStore(state => state.fetchMateriales)

  const herramientasInventario = useHerramientasStore(state => state.herramientas) || []
  const fetchHerramientas = useHerramientasStore(state => state.fetchHerramientas)

  const tecnicos = useTecnicosStore(state => state.tecnicos)
  const fetchTecnicos = useTecnicosStore(state => state.fetchTecnicos)

  const tarifas = useSpecialtyRatesStore(state => state.tarifas)
  const fetchTarifas = useSpecialtyRatesStore(state => state.fetchTarifas)
  const getTarifaPorEspecialidad = useSpecialtyRatesStore(state => state.getTarifaPorEspecialidad)

  const { generateVisitaTecnicaReport } = usePDFGenerator()

  // Estados principales
  const [visitaActual, setVisitaActual] = useState(null)
  const [activeTab, setActiveTab] = useState('estado')
  const [editMode, setEditMode] = useState(false)
  const [tecnicosAsignados, setTecnicosAsignados] = useState([])

  // Estado del lugar
  const [estadoLugar, setEstadoLugar] = useState({
    descripcion: '',
    observaciones: '',
    fotos: []
  })
  const [mostrarFotografias, setMostrarFotografias] = useState(false)

  // Materiales
  const [nuevoMaterial, setNuevoMaterial] = useState({
    nombre: '',
    cantidad: 1,
    unidad: 'unidad',
    precioUnitario: 0
  })
  const [inputMaterial, setInputMaterial] = useState('')
  const [mostrarDropdown, setMostrarDropdown] = useState(false)
  const [materialDelInventario, setMaterialDelInventario] = useState(false)
  const [materialEditando, setMaterialEditando] = useState(null)
  const [mostrarModalEditarMaterial, setMostrarModalEditarMaterial] = useState(false)

  // Herramientas
  const [herramientas, setHerramientas] = useState([])
  const [nuevaHerramienta, setNuevaHerramienta] = useState({ nombre: '', cantidad: 1 })
  const [herramientaSeleccionadaInventario, setHerramientaSeleccionadaInventario] = useState(null)
  const [inputHerramienta, setInputHerramienta] = useState('')
  const [mostrarDropdownHerramienta, setMostrarDropdownHerramienta] = useState(false)

  // Personal
  const [listaPersonal, setListaPersonal] = useState([])
  const [nuevaPersona, setNuevaPersona] = useState({
    especialidad: '',
    diasEstimados: '',
    observaciones: ''
  })
  const [especialidadPersonalizada, setEspecialidadPersonalizada] = useState('')
  const [mostrarInputEspecialidad, setMostrarInputEspecialidad] = useState(false)
  const [requerimientosAdicionales, setRequerimientosAdicionales] = useState('')

  // Completado
  const [datosCompletado, setDatosCompletado] = useState({
    nombreProyecto: '',
    coordenadasGPS: { latitud: null, longitud: null },
    firmaTecnico: null
  })
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [showSignaturePad, setShowSignaturePad] = useState(false)

  // Inicializar canvas cuando se muestra
  useEffect(() => {
    if (showSignaturePad && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      ctx.strokeStyle = '#000'
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
    }
  }, [showSignaturePad])

  // Cargar datos de la visita - Opción B: Fix de dependencias
  useEffect(() => {
    const fetchVisitaActual = async () => {
      try {
        const { fetchVisitas: storeeFetchVisitas } = useVisitasTecnicasStore.getState()
        await storeeFetchVisitas()

        // Cargar datos relacionados en paralelo
        // fetchTarifas solo para admin (specialty-rates es admin-only)
        await Promise.all([
          fetchMateriales(),
          fetchHerramientas(),
          fetchPresupuestos(),
          fetchTecnicos(),
          isAdmin(user) ? fetchTarifas() : Promise.resolve()
        ]).catch(err => console.error('Error cargando datos relacionados:', err))

        const { visitas } = useVisitasTecnicasStore.getState()
        const visitaEncontrada = visitas.find(v => v.id === id)

        if (visitaEncontrada) {
          setVisitaActual(visitaEncontrada)

          if (visitaEncontrada.tecnicosAsignados?.length > 0) {
            setTecnicosAsignados(visitaEncontrada.tecnicosAsignados)
          }

          if (visitaEncontrada.estadoLugar?.descripcion) {
            setEstadoLugar(visitaEncontrada.estadoLugar)
          }

          if (visitaEncontrada.herramientasRequeridas?.length > 0) {
            const herramientasConvertidas = visitaEncontrada.herramientasRequeridas.map((h, index) => {
              if (typeof h === 'string') {
                return { id: Date.now() + index, nombre: h, cantidad: 1, unidad: 'unidad', valor: 0, valorTotal: 0 }
              }
              return {
                ...h,
                valor: h.valor || 0,
                valorTotal: h.valorTotal || (h.valor || 0) * (h.cantidad || 1)
              }
            })
            setHerramientas(herramientasConvertidas)
          }

          if (visitaEncontrada.listaPersonal?.length > 0) {
            setListaPersonal(visitaEncontrada.listaPersonal)
          }

          if (visitaEncontrada.requerimientosAdicionales) {
            setRequerimientosAdicionales(visitaEncontrada.requerimientosAdicionales)
          }

          if (visitaEncontrada.nombreProyecto || visitaEncontrada.firmaTecnico || visitaEncontrada.coordenadasGPS) {
            setDatosCompletado({
              nombreProyecto: visitaEncontrada.nombreProyecto || '',
              coordenadasGPS: visitaEncontrada.coordenadasGPS || { latitud: null, longitud: null },
              firmaTecnico: visitaEncontrada.firmaTecnico || null
            })
          }
        }
      } catch (error) {
        console.error('Error al cargar visita:', error)
      }
    }

    fetchVisitaActual()
  }, [id]) // Opción B: Removido setVisitaActual de las dependencias

  // Enriquecer herramientas existentes con valores del inventario
  useEffect(() => {
    if (herramientas.length > 0 && herramientasInventario?.length > 0) {
      const herramientasEnriquecidas = herramientas.map(h => {
        // Si ya tiene valor, no modificar
        if (h.valor > 0) return h

        // Buscar en inventario por nombre
        const herramientaInv = herramientasInventario.find(
          inv => (inv.nombre || inv.name || '').toLowerCase() === (h.nombre || '').toLowerCase()
        )

        if (herramientaInv) {
          const valorUnitario = herramientaInv.valor || 0
          return {
            ...h,
            valor: valorUnitario,
            valorTotal: valorUnitario * (h.cantidad || 1),
            inventarioId: h.inventarioId || herramientaInv.id
          }
        }
        return h
      })

      // Solo actualizar si hubo cambios
      const hayCambios = herramientasEnriquecidas.some((h, i) => h.valor !== herramientas[i].valor)
      if (hayCambios) {
        setHerramientas(herramientasEnriquecidas)
      }
    }
  }, [herramientasInventario]) // Solo cuando cambie el inventario

  // Funciones de permiso
  const puedeEditar = useCallback(() => {
    if (!visitaActual) return false

    if (isAdminOrSupervisor(user)) {
      return true
    }

    if (isTecnico(user)) {
      if (ESTADOS_EDITABLE_TECNICO.includes(visitaActual.estado)) {
        return true
      }
      if (ESTADOS_EDITABLE_SI_RECHAZADO.includes(visitaActual.estado) &&
          visitaActual.aprobacion?.tipo === 'rechazada') {
        return true
      }
      if (ESTADOS_EDITABLE_SI_RECHAZADO.includes(visitaActual.estado) &&
          !visitaActual.aprobacion) {
        return true
      }
    }

    return false
  }, [visitaActual, user])

  const puedeEditarFirma = useCallback(() => {
    if (!visitaActual) return false
    if (isTecnico(user)) {
      return ESTADOS_FIRMABLES.includes(visitaActual.estado)
    }
    return false
  }, [visitaActual, user])

  // Handler: Guardar Estado del Lugar
  const handleGuardarEstadoLugar = useCallback(async () => {
    try {
      MySwal.fire({
        title: 'Guardando...',
        text: 'Subiendo fotos y guardando cambios',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => MySwal.showLoading()
      })

      let fotosActualizadas = [...(estadoLugar.fotos || [])]
      const fotosNuevas = fotosActualizadas.filter(foto => foto.file && foto.url?.startsWith('blob:'))

      if (fotosNuevas.length > 0) {
        for (let i = 0; i < fotosNuevas.length; i++) {
          const foto = fotosNuevas[i]
          try {
            const fotoSubida = await uploadVisitaPhoto(visitaActual.id, foto.file)
            const indexFoto = fotosActualizadas.findIndex(f => f.id === foto.id)
            if (indexFoto !== -1) {
              if (foto.url?.startsWith('blob:')) {
                URL.revokeObjectURL(foto.url)
              }
              fotosActualizadas[indexFoto] = {
                ...fotoSubida,
                comentario: foto.comentario || ''
              }
            }
          } catch (uploadError) {
            console.error(`Error subiendo foto ${foto.name}:`, uploadError)
          }
        }
      }

      const estadoLugarActualizado = {
        descripcion: estadoLugar.descripcion,
        observaciones: estadoLugar.observaciones,
        fotos: fotosActualizadas.map(foto => ({
          id: foto.id,
          url: foto.url,
          nombre: foto.nombre || foto.name,
          name: foto.name || foto.nombre,
          size: foto.size || null,
          comentario: foto.comentario || ''
        }))
      }

      await updateVisitaTecnica(visitaActual.id, {
        estadoLugar: estadoLugarActualizado,
        fechaRegistroEstadoLugar: getCurrentTimestamp()
      })

      await fetchVisitas()

      const { visitas } = useVisitasTecnicasStore.getState()
      const visitaActualizada = visitas.find(v => v.id === visitaActual.id)
      if (visitaActualizada) {
        setVisitaActual(visitaActualizada)
        setEstadoLugar(visitaActualizada.estadoLugar || estadoLugarActualizado)
      }

      setEditMode(false)

      MySwal.fire({
        icon: 'success',
        title: 'Guardado',
        text: 'El estado del lugar ha sido guardado correctamente',
        timer: 2000,
        showConfirmButton: false
      })
    } catch (error) {
      console.error('Error al guardar estado del lugar:', error)
      MySwal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo guardar el estado del lugar'
      })
    }
  }, [estadoLugar, visitaActual, uploadVisitaPhoto, updateVisitaTecnica, fetchVisitas])

  // Handler: Materiales
  const handleInputMaterialChange = useCallback((value) => {
    setInputMaterial(value)
    setNuevoMaterial(prev => ({ ...prev, nombre: value }))
    setMaterialDelInventario(false)
    setMostrarDropdown(true)
  }, [])

  const handleSeleccionarMaterial = useCallback((material) => {
    if (typeof material === 'string') {
      setInputMaterial(material)
      setNuevoMaterial(prev => ({ ...prev, nombre: material, precioUnitario: 0 }))
      setMaterialDelInventario(false)
    } else {
      setInputMaterial(material.name || material.nombre)
      setNuevoMaterial(prev => ({
        ...prev,
        nombre: material.name || material.nombre,
        precioUnitario: material.unit_price || material.precioUnitario || 0,
        unidad: material.unit || material.unidad || 'unidad'
      }))
      setMaterialDelInventario(true)
    }
    setMostrarDropdown(false)
  }, [])

  const handleFocusInput = useCallback(() => {
    setMostrarDropdown(true)
  }, [])

  const handleBlurInput = useCallback(() => {
    setTimeout(() => setMostrarDropdown(false), 150)
  }, [])

  const handleAgregarMaterial = useCallback(async () => {
    if (!nuevoMaterial.nombre.trim()) {
      MySwal.fire({ icon: 'warning', title: 'Nombre requerido', text: 'Ingrese el nombre del material' })
      return
    }
    if (nuevoMaterial.cantidad <= 0) {
      MySwal.fire({ icon: 'warning', title: 'Cantidad inválida', text: 'La cantidad debe ser mayor a 0' })
      return
    }

    const materialExistente = visitaActual.materialesEstimados?.find(
      m => m.nombre.toLowerCase() === nuevoMaterial.nombre.toLowerCase()
    )
    if (materialExistente) {
      MySwal.fire({ icon: 'warning', title: 'Material duplicado', text: 'Este material ya está en la lista' })
      return
    }

    const nuevoMaterialCompleto = {
      id: Date.now(),
      nombre: nuevoMaterial.nombre,
      cantidad: nuevoMaterial.cantidad,
      unidad: nuevoMaterial.unidad,
      precioUnitario: nuevoMaterial.precioUnitario,
      subtotal: nuevoMaterial.cantidad * nuevoMaterial.precioUnitario
    }

    const materialesActualizados = [...(visitaActual.materialesEstimados || []), nuevoMaterialCompleto]

    try {
      const visitaActualizada = await updateVisitaTecnica(visitaActual.id, {
        materialesEstimados: materialesActualizados
      })

      setVisitaActual(prev => ({ ...prev, materialesEstimados: materialesActualizados }))
      setNuevoMaterial({ nombre: '', cantidad: 1, unidad: 'unidad', precioUnitario: 0 })
      setInputMaterial('')
      setMaterialDelInventario(false)

      Toast.fire({ icon: 'success', title: 'Material agregado' })
    } catch (error) {
      console.error('Error al agregar material:', error)
      MySwal.fire({ icon: 'error', title: 'Error', text: 'No se pudo agregar el material' })
    }
  }, [nuevoMaterial, visitaActual, updateVisitaTecnica])

  const handleEliminarMaterial = useCallback(async (materialId) => {
    const result = await MySwal.fire({
      title: '¿Eliminar material?',
      text: 'Esta acción no se puede deshacer',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    })

    if (result.isConfirmed) {
      try {
        const materialesActualizados = visitaActual.materialesEstimados.filter(m => m.id !== materialId)

        await updateVisitaTecnica(visitaActual.id, { materialesEstimados: materialesActualizados })

        setVisitaActual(prev => ({ ...prev, materialesEstimados: materialesActualizados }))
        await fetchVisitas()

        Toast.fire({ icon: 'success', title: 'Material eliminado' })
      } catch (error) {
        console.error('Error al eliminar material:', error)
        MySwal.fire({ icon: 'error', title: 'Error', text: 'No se pudo eliminar el material' })
      }
    }
  }, [visitaActual, updateVisitaTecnica, fetchVisitas])

  const handleAbrirModalEditarMaterial = useCallback((material) => {
    setMaterialEditando({ ...material })
    setMostrarModalEditarMaterial(true)
  }, [])

  const handleCerrarModalEditarMaterial = useCallback(() => {
    setMaterialEditando(null)
    setMostrarModalEditarMaterial(false)
  }, [])

  const handleGuardarMaterialEditado = useCallback(async () => {
    if (!materialEditando) return

    try {
      const materialesActualizados = visitaActual.materialesEstimados.map(m => {
        if (m.id === materialEditando.id) {
          return {
            ...materialEditando,
            subtotal: materialEditando.cantidad * materialEditando.precioUnitario
          }
        }
        return m
      })

      await updateVisitaTecnica(visitaActual.id, { materialesEstimados: materialesActualizados })

      setVisitaActual(prev => ({ ...prev, materialesEstimados: materialesActualizados }))
      await fetchVisitas()

      handleCerrarModalEditarMaterial()

      Toast.fire({ icon: 'success', title: 'Material actualizado' })
    } catch (error) {
      console.error('Error al actualizar material:', error)
      MySwal.fire({ icon: 'error', title: 'Error', text: 'No se pudo actualizar el material' })
    }
  }, [materialEditando, visitaActual, updateVisitaTecnica, fetchVisitas, handleCerrarModalEditarMaterial])

  // Handler: Herramientas
  const handleInputHerramientaChange = useCallback((value) => {
    setInputHerramienta(value)
    setNuevaHerramienta(prev => ({ ...prev, nombre: value }))
    setHerramientaSeleccionadaInventario(null)
    setMostrarDropdownHerramienta(true)
  }, [])

  const handleSeleccionarHerramienta = useCallback((herramienta) => {
    if (typeof herramienta === 'string') {
      setInputHerramienta(herramienta)
      setNuevaHerramienta(prev => ({ ...prev, nombre: herramienta }))
      setHerramientaSeleccionadaInventario(null)
    } else {
      setInputHerramienta(herramienta.name || herramienta.nombre)
      setNuevaHerramienta(prev => ({ ...prev, nombre: herramienta.name || herramienta.nombre }))
      setHerramientaSeleccionadaInventario(herramienta)
    }
    setMostrarDropdownHerramienta(false)
  }, [])

  const handleFocusInputHerramienta = useCallback(() => {
    setMostrarDropdownHerramienta(true)
  }, [])

  const handleBlurInputHerramienta = useCallback(() => {
    setTimeout(() => setMostrarDropdownHerramienta(false), 150)
  }, [])

  const handleAgregarHerramienta = useCallback(() => {
    if (!nuevaHerramienta.nombre.trim()) {
      MySwal.fire({ icon: 'warning', title: 'Nombre requerido', text: 'Ingrese el nombre de la herramienta' })
      return
    }
    if (nuevaHerramienta.cantidad <= 0) {
      MySwal.fire({ icon: 'warning', title: 'Cantidad inválida', text: 'La cantidad debe ser mayor a 0' })
      return
    }

    if (herramientaSeleccionadaInventario) {
      const stockDisponible = herramientaSeleccionadaInventario.available_quantity ||
                              herramientaSeleccionadaInventario.cantidad || 0
      if (nuevaHerramienta.cantidad > stockDisponible) {
        MySwal.fire({
          icon: 'warning',
          title: 'Stock insuficiente',
          text: `Solo hay ${stockDisponible} unidades disponibles de "${nuevaHerramienta.nombre}"`
        })
        return
      }
    }

    const herramientaExistente = herramientas.find(
      h => h.nombre.toLowerCase() === nuevaHerramienta.nombre.toLowerCase()
    )
    if (herramientaExistente) {
      MySwal.fire({ icon: 'warning', title: 'Herramienta duplicada', text: 'Esta herramienta ya está en la lista' })
      return
    }

    // Si no se selecciono del dropdown, buscar en inventario por nombre
    let herramientaInventario = herramientaSeleccionadaInventario
    if (!herramientaInventario && herramientasInventario?.length > 0) {
      herramientaInventario = herramientasInventario.find(
        h => (h.nombre || h.name || '').toLowerCase() === nuevaHerramienta.nombre.toLowerCase()
      )
    }

    const valorUnitario = herramientaInventario?.valor || 0
    const nuevaHerramientaCompleta = {
      id: Date.now(),
      nombre: nuevaHerramienta.nombre,
      cantidad: nuevaHerramienta.cantidad,
      unidad: 'unidad',
      valor: valorUnitario,
      valorTotal: valorUnitario * nuevaHerramienta.cantidad,
      inventarioId: herramientaInventario?.id || null
    }

    setHerramientas(prev => [...prev, nuevaHerramientaCompleta])
    setNuevaHerramienta({ nombre: '', cantidad: 1 })
    setInputHerramienta('')
    setHerramientaSeleccionadaInventario(null)

    Toast.fire({ icon: 'success', title: 'Herramienta agregada' })
  }, [nuevaHerramienta, herramientas, herramientaSeleccionadaInventario, herramientasInventario])

  const handleEliminarHerramienta = useCallback((id) => {
    setHerramientas(prev => prev.filter(h => h.id !== id))
  }, [])

  const handleGuardarHerramientas = useCallback(async () => {
    try {
      await updateVisitaTecnica(visitaActual.id, { herramientasRequeridas: herramientas })

      setVisitaActual(prev => ({ ...prev, herramientasRequeridas: herramientas }))
      await fetchVisitas()

      Toast.fire({ icon: 'success', title: 'Herramientas guardadas' })
    } catch (error) {
      console.error('Error al guardar herramientas:', error)
      MySwal.fire({ icon: 'error', title: 'Error', text: 'No se pudieron guardar las herramientas' })
    }
  }, [herramientas, visitaActual, updateVisitaTecnica, fetchVisitas])

  // Handler: Personal
  const handleEspecialidadChange = useCallback((value) => {
    if (value === 'Otros (especificar)') {
      setMostrarInputEspecialidad(true)
      setNuevaPersona(prev => ({ ...prev, especialidad: '' }))
    } else {
      setMostrarInputEspecialidad(false)
      setNuevaPersona(prev => ({ ...prev, especialidad: value }))
    }
  }, [])

  const handleAgregarPersona = useCallback(() => {
    const especialidadFinal = mostrarInputEspecialidad ? especialidadPersonalizada : nuevaPersona.especialidad

    if (!especialidadFinal.trim()) {
      MySwal.fire({ icon: 'warning', title: 'Especialidad requerida', text: 'Seleccione o ingrese una especialidad' })
      return
    }

    if (!nuevaPersona.diasEstimados || nuevaPersona.diasEstimados < 1) {
      MySwal.fire({ icon: 'warning', title: 'Días estimados requeridos', text: 'Ingrese los días estimados' })
      return
    }

    const nuevaPersonaCompleta = {
      id: Date.now(),
      especialidad: especialidadFinal,
      diasEstimados: parseInt(nuevaPersona.diasEstimados),
      observaciones: nuevaPersona.observaciones
    }

    setListaPersonal(prev => [...prev, nuevaPersonaCompleta])
    setNuevaPersona({ especialidad: '', diasEstimados: '', observaciones: '' })
    setEspecialidadPersonalizada('')
    setMostrarInputEspecialidad(false)

    MySwal.fire({ icon: 'success', title: 'Personal agregado', timer: 1500, showConfirmButton: false })
  }, [nuevaPersona, mostrarInputEspecialidad, especialidadPersonalizada])

  const handleEliminarPersona = useCallback((id) => {
    setListaPersonal(prev => prev.filter(p => p.id !== id))
  }, [])

  const handleGuardarPersonal = useCallback(async () => {
    try {
      await updateVisitaTecnica(visitaActual.id, {
        listaPersonal: listaPersonal,
        requerimientosAdicionales: requerimientosAdicionales
      })

      setVisitaActual(prev => ({
        ...prev,
        listaPersonal: listaPersonal,
        requerimientosAdicionales: requerimientosAdicionales
      }))
      await fetchVisitas()

      MySwal.fire({ icon: 'success', title: 'Personal guardado', timer: 1500, showConfirmButton: false })
    } catch (error) {
      console.error('Error al guardar personal:', error)
      MySwal.fire({ icon: 'error', title: 'Error', text: 'No se pudo guardar el personal' })
    }
  }, [listaPersonal, requerimientosAdicionales, visitaActual, updateVisitaTecnica, fetchVisitas])

  // Handler: Cargar tarifas automáticas desde specialty_rates
  const handleCargarTarifasPersonal = useCallback(() => {
    const { tarifas: tarifasActuales } = useSpecialtyRatesStore.getState()
    const listaActualizada = listaPersonal.map(p => {
      const tarifa = tarifasActuales.find(t =>
        t.especialidad.toLowerCase() === (p.especialidad || '').toLowerCase()
      )
      const tarifaDiaria = tarifa?.tarifaDiaria || p.tarifaDiaria || 0
      return {
        ...p,
        tarifaDiaria: tarifaDiaria,
        totalCosto: tarifaDiaria * (p.diasEstimados || 0)
      }
    })
    setListaPersonal(listaActualizada)
  }, [listaPersonal])

  // Handler: Actualizar precio de una persona individual
  const handleActualizarPrecioPersona = useCallback((personaId, nuevaTarifa) => {
    const tarifaNum = parseFloat(nuevaTarifa) || 0
    setListaPersonal(prev => prev.map(p => {
      if (p.id === personaId) {
        return {
          ...p,
          tarifaDiaria: tarifaNum,
          totalCosto: tarifaNum * (p.diasEstimados || 0)
        }
      }
      return p
    }))
  }, [])

  // Handler: Guardar precios del personal en la visita
  const handleGuardarPreciosPersonal = useCallback(async () => {
    try {
      await updateVisitaTecnica(visitaActual.id, {
        listaPersonal: listaPersonal
      })

      setVisitaActual(prev => ({
        ...prev,
        listaPersonal: listaPersonal
      }))
      await fetchVisitas()

      MySwal.fire({ icon: 'success', title: 'Precios guardados', text: 'Los precios del personal han sido guardados correctamente', timer: 1500, showConfirmButton: false })
    } catch (error) {
      console.error('Error al guardar precios del personal:', error)
      MySwal.fire({ icon: 'error', title: 'Error', text: 'No se pudieron guardar los precios del personal' })
    }
  }, [listaPersonal, visitaActual, updateVisitaTecnica, fetchVisitas])

  // Handler: Completar Visita
  const handleCompletarVisita = useCallback(async () => {
    // Validaciones
    const validacion = validarCamposParaCompletar()
    if (!validacion.valido) {
      MySwal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        html: `<p>Por favor complete los siguientes campos:</p>
               <ul style="text-align: left; margin-top: 10px;">
                 ${validacion.camposFaltantes.map(c => `<li>${c}</li>`).join('')}
               </ul>
               <p style="margin-top: 10px; font-size: 12px; color: #666;">
                 Por favor, revise las pestañas: <strong>${[...new Set(validacion.tabs)].map(t => {
                   const nombres = {
                     'estado': 'Estado del Lugar',
                     'materiales': 'Materiales',
                     'herramientas': 'Herramientas',
                     'personal': 'Personal',
                     'completar': 'Completar'
                   }
                   return nombres[t] || t
                 }).join(', ')}</strong>
               </p>`,
        confirmButtonText: 'Entendido'
      })
      if (validacion.tabs.length > 0) {
        setActiveTab(validacion.tabs[0])
      }
      return
    }

    const result = await MySwal.fire({
      title: '¿Completar visita técnica?',
      text: 'Esta acción marcará la visita como completada y no podrá editarla después.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, completar',
      cancelButtonText: 'Cancelar'
    })

    if (!result.isConfirmed) return

    try {
      MySwal.fire({
        title: 'Completando visita...',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => MySwal.showLoading()
      })

      // Subir fotos pendientes
      let fotosActualizadas = [...(estadoLugar.fotos || [])]
      const fotosNuevas = fotosActualizadas.filter(foto => foto.file && foto.url?.startsWith('blob:'))

      if (fotosNuevas.length > 0) {
        for (const foto of fotosNuevas) {
          try {
            const fotoSubida = await uploadVisitaPhoto(visitaActual.id, foto.file)
            const indexFoto = fotosActualizadas.findIndex(f => f.id === foto.id)
            if (indexFoto !== -1) {
              if (foto.url?.startsWith('blob:')) URL.revokeObjectURL(foto.url)
              fotosActualizadas[indexFoto] = { ...fotoSubida, comentario: foto.comentario || '' }
            }
          } catch (uploadError) {
            console.error(`Error subiendo foto:`, uploadError)
          }
        }
      }

      // Preparar datos de actualización
      const datosActualizacion = {
        estado: VISITA_ESTADOS.COMPLETED,
        fechaCompletado: getCurrentTimestamp(),
        nombreProyecto: datosCompletado.nombreProyecto,
        coordenadasGPS: datosCompletado.coordenadasGPS,
        firmaTecnico: datosCompletado.firmaTecnico,
        herramientasRequeridas: herramientas,
        listaPersonal: listaPersonal,
        requerimientosAdicionales: requerimientosAdicionales,
        estadoLugar: {
          descripcion: estadoLugar.descripcion,
          observaciones: estadoLugar.observaciones,
          fotos: fotosActualizadas.map(f => ({
            id: f.id,
            url: f.url,
            nombre: f.nombre || f.name,
            name: f.name || f.nombre,
            size: f.size || null,
            comentario: f.comentario || ''
          }))
        }
      }

      const visitaActualizada = await updateVisitaTecnica(visitaActual.id, datosActualizacion)

      await fetchVisitas()

      const { visitas } = useVisitasTecnicasStore.getState()
      const visitaFinal = visitas.find(v => v.id === visitaActual.id)
      if (visitaFinal) {
        setVisitaActual(visitaFinal)
      }

      MySwal.fire({
        icon: 'success',
        title: '¡Visita completada!',
        text: 'La visita técnica ha sido completada exitosamente',
        timer: 2000,
        showConfirmButton: false
      })
    } catch (error) {
      console.error('Error al completar visita:', error)
      MySwal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'No se pudo completar la visita técnica'
      })
    }
  }, [visitaActual, estadoLugar, datosCompletado, herramientas, listaPersonal,
      requerimientosAdicionales, uploadVisitaPhoto, updateVisitaTecnica, fetchVisitas])

  // Validación para completar
  const validarCamposParaCompletar = useCallback(() => {
    const camposFaltantes = []
    const tabs = []

    // Estado del lugar
    if (!estadoLugar.descripcion?.trim()) {
      camposFaltantes.push('Descripción del estado del lugar')
      tabs.push('estado')
    }

    if (!estadoLugar.fotos || estadoLugar.fotos.length === 0) {
      camposFaltantes.push('Al menos una fotografía del lugar')
      tabs.push('estado')
    }

    // Materiales
    if (!visitaActual.materialesEstimados || visitaActual.materialesEstimados.length === 0) {
      camposFaltantes.push('Al menos un material estimado')
      tabs.push('materiales')
    }

    // Herramientas
    if (!herramientas || herramientas.length === 0) {
      camposFaltantes.push('Al menos una herramienta requerida')
      tabs.push('herramientas')
    }

    // Personal
    if (!listaPersonal || listaPersonal.length === 0) {
      camposFaltantes.push('Al menos una persona en el equipo')
      tabs.push('personal')
    } else {
      const sinDias = listaPersonal.some(p => !p.diasEstimados || p.diasEstimados <= 0)
      if (sinDias) {
        camposFaltantes.push('Días estimados para todo el personal')
        tabs.push('personal')
      }
    }

    // Completar
    if (!datosCompletado.nombreProyecto?.trim()) {
      camposFaltantes.push('Nombre del proyecto')
      tabs.push('completar')
    }

    if (!datosCompletado.firmaTecnico) {
      camposFaltantes.push('Firma del técnico')
      tabs.push('completar')
    }

    if (!datosCompletado.coordenadasGPS?.latitud || !datosCompletado.coordenadasGPS?.longitud) {
      camposFaltantes.push('Ubicación GPS')
      tabs.push('completar')
    }

    return { valido: camposFaltantes.length === 0, camposFaltantes, tabs }
  }, [estadoLugar, visitaActual, herramientas, listaPersonal, datosCompletado])

  // Handler: Aceptar/Rechazar visita
  const handleAceptarVisita = useCallback(async () => {
    const result = await MySwal.fire({
      title: 'Aceptar Visita Técnica',
      html: `
        <p style="margin-bottom: 15px;">
          Para aceptar esta visita técnica, debe ingresar el número de orden de compra del cliente.
        </p>
        <input type="text" id="ordenCompra" class="swal2-input" placeholder="Número de orden de compra">
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Aceptar visita',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const ordenCompra = document.getElementById('ordenCompra').value
        if (!ordenCompra) {
          Swal.showValidationMessage('Debe ingresar el número de orden de compra')
          return false
        }
        return ordenCompra
      }
    })

    if (result.isConfirmed) {
      try {
        MySwal.fire({
          title: 'Procesando...',
          allowOutsideClick: false,
          showConfirmButton: false,
          didOpen: () => MySwal.showLoading()
        })

        const visitaActualizada = await aceptarVisitaTecnica(visitaActual.id, result.value, user.name)

        setVisitaActual(visitaActualizada)

        MySwal.fire({
          icon: 'success',
          title: '¡Visita aceptada!',
          text: `La visita ha sido aceptada con la orden de compra: ${result.value}`,
          timer: 2000,
          showConfirmButton: false
        })
      } catch (error) {
        console.error('Error al aceptar visita:', error)
        MySwal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'No se pudo aceptar la visita técnica'
        })
      }
    }
  }, [visitaActual, user, aceptarVisitaTecnica])

  const handleRechazarVisita = useCallback(async () => {
    const result = await MySwal.fire({
      title: 'Rechazar Visita Técnica',
      html: `
        <p style="margin-bottom: 15px;">
          Por favor ingrese el motivo del rechazo. El técnico podrá ver este motivo y hacer las correcciones necesarias.
        </p>
        <textarea id="motivoRechazo" class="swal2-textarea" placeholder="Motivo del rechazo..." style="height: 100px;"></textarea>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Rechazar visita',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const motivo = document.getElementById('motivoRechazo').value
        if (!motivo) {
          Swal.showValidationMessage('Debe ingresar el motivo del rechazo')
          return false
        }
        return motivo
      }
    })

    if (result.isConfirmed) {
      try {
        MySwal.fire({
          title: 'Procesando...',
          allowOutsideClick: false,
          showConfirmButton: false,
          didOpen: () => MySwal.showLoading()
        })

        const visitaActualizada = await rechazarVisitaTecnica(visitaActual.id, result.value, user.name)

        setVisitaActual(visitaActualizada)

        MySwal.fire({
          icon: 'success',
          title: 'Visita rechazada',
          text: 'La visita ha sido rechazada y el técnico será notificado',
          timer: 2000,
          showConfirmButton: false
        })
      } catch (error) {
        console.error('Error al rechazar visita:', error)
        MySwal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'No se pudo rechazar la visita técnica'
        })
      }
    }
  }, [visitaActual, user, rechazarVisitaTecnica])

  // Handler: Generar Cotización
  const handleGenerarCotizacion = useCallback(async () => {
    const result = await MySwal.fire({
      title: '¿Generar cotización?',
      text: 'Se creará un nuevo presupuesto basado en los materiales y personal de esta visita',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, generar',
      cancelButtonText: 'Cancelar'
    })

    if (!result.isConfirmed) return

    try {
      MySwal.fire({
        title: 'Generando cotización...',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => MySwal.showLoading()
      })

      // Obtener tarifas actualizadas del store
      const { tarifas: tarifasActuales } = useSpecialtyRatesStore.getState()

      // Items de materiales
      const itemsMateriales = (visitaActual.materialesEstimados || []).map(m => ({
        tipo: 'material',
        codigo: m.codigo || null,
        descripcion: m.nombre || m.descripcion,
        cantidad: m.cantidad || 0,
        unidad: m.unidad || 'Unidad',
        precioUnitario: m.precioUnitario || 0,
        subtotal: (m.cantidad || 0) * (m.precioUnitario || 0),
        descripcionMateriales: m.nombre || m.descripcion,
        manoObra: null,
        equiposServicio: null
      }))

      // Items de herramientas con valores del inventario
      const itemsHerramientas = (herramientas || []).map(h => {
        const cantidad = h.cantidad || 1
        const valorUnitario = h.valor || 0
        return {
          tipo: 'herramienta',
          codigo: h.codigo || null,
          descripcion: typeof h === 'string' ? h : h.nombre,
          cantidad: cantidad,
          unidad: h.unidad || 'Unidad',
          precioUnitario: valorUnitario,
          subtotal: h.valorTotal || (valorUnitario * cantidad),
          descripcionMateriales: null,
          manoObra: null,
          equiposServicio: typeof h === 'string' ? h : h.nombre
        }
      })

      // Items de mano de obra con tarifas de especialidad
      const itemsPersonal = (listaPersonal || []).map(p => {
        // Usar tarifa guardada en la persona, si no buscar en specialty_rates
        const tarifa = tarifasActuales.find(t =>
          t.especialidad.toLowerCase() === (p.especialidad || '').toLowerCase()
        )
        const tarifaDiaria = p.tarifaDiaria || tarifa?.tarifaDiaria || 0
        const diasEstimados = p.diasEstimados || 0
        return {
          tipo: 'mano_obra',
          codigo: null,
          descripcion: `Mano de obra - ${p.especialidad || 'Personal'} - ${diasEstimados} dias`,
          cantidad: diasEstimados,
          unidad: 'Dias',
          precioUnitario: tarifaDiaria,
          subtotal: tarifaDiaria * diasEstimados,
          descripcionMateriales: null,
          manoObra: p.observaciones ? `${p.especialidad || 'Personal'}: ${p.observaciones}` : (p.especialidad || 'Personal'),
          equiposServicio: null
        }
      })

      // Combinar todos los items
      const items = [...itemsMateriales, ...itemsHerramientas, ...itemsPersonal]

      // Calcular totales
      const subtotal = items.reduce((sum, item) => sum + (item.subtotal || 0), 0)
      const igv = subtotal * 0.18
      const total = subtotal + igv

      const presupuestoData = {
        cliente: visitaActual.cliente,
        clienteData: {
          nombre: visitaActual.cliente,
          tipo: visitaActual.tipoCliente || 'empresa',
          ruc: '',
          email: visitaActual.email || '',
          telefono: visitaActual.telefono || '',
          direccion: visitaActual.direccion || '',
          contacto: visitaActual.contacto || ''
        },
        items: items,
        validezDias: 30,
        condicionesPago: 'A definir',
        observaciones: visitaActual.observaciones || `Cotizacion generada desde visita tecnica ${visitaActual.id}`,
        elaboradoPor: user?.name || 'Sistema',
        visitaTecnicaId: visitaActual.id,
        tienePreciosAsignados: subtotal > 0,
        subtotal: subtotal,
        igv: igv,
        total: total,
        esSupervisor: true
      }

      const nuevaCotizacion = await createPresupuesto(presupuestoData)

      await updateVisitaTecnica(visitaActual.id, {
        presupuestoGenerado: nuevaCotizacion.id,
        fechaGeneracionPresupuesto: getCurrentTimestamp()
      })

      await fetchVisitas()
      await fetchPresupuestos()

      await MySwal.fire({
        icon: 'success',
        title: '¡Cotización generada!',
        text: `Se ha creado la cotización ${nuevaCotizacion.id}`,
        confirmButtonText: 'Ver cotización',
        confirmButtonColor: '#3085d6'
      })

      // Redirigir a la cotización creada
      navigate(`/presupuestos/${nuevaCotizacion.id}`)
    } catch (error) {
      console.error('Error al generar cotización:', error)
      MySwal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo generar la cotización'
      })
    }
  }, [visitaActual, listaPersonal, herramientas, user, createPresupuesto, updateVisitaTecnica, fetchVisitas, fetchPresupuestos, navigate])

  // Funciones de firma
  const getCoordinates = useCallback((e, canvas) => {
    const rect = canvas.getBoundingClientRect()
    if (e.touches) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      }
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }, [])

  const startDrawing = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const coords = getCoordinates(e, canvas)
    ctx.beginPath()
    ctx.moveTo(coords.x, coords.y)
    setIsDrawing(true)
  }, [getCoordinates])

  const draw = useCallback((e) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const coords = getCoordinates(e, canvas)
    ctx.lineTo(coords.x, coords.y)
    ctx.stroke()
  }, [isDrawing, getCoordinates])

  const stopDrawing = useCallback(() => {
    setIsDrawing(false)
  }, [])

  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }, [])

  const saveSignature = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const signatureData = canvas.toDataURL()
    setDatosCompletado(prev => ({ ...prev, firmaTecnico: signatureData }))
    setShowSignaturePad(false)

    MySwal.fire({
      title: 'Firma guardada',
      text: 'La firma ha sido guardada correctamente',
      icon: 'success',
      timer: 1500,
      showConfirmButton: false
    })
  }, [])

  // Función para obtener resumen de fotos para el PDF
  const obtenerResumenFotos = useCallback(() => {
    try {
      if (visitaActual?.estadoLugar?.fotos) {
        return visitaActual.estadoLugar.fotos.length
      }
      return 0
    } catch (error) {
      console.error('Error obteniendo fotos:', error)
      return 0
    }
  }, [visitaActual])

  // Guardar edición general (técnicos, etc.)
  const handleGuardarEdicionGeneral = useCallback(async () => {
    let nuevoEstado = visitaActual.estado

    if (visitaActual.estado === VISITA_ESTADOS.PENDING && tecnicosAsignados.length > 0) {
      nuevoEstado = VISITA_ESTADOS.ASSIGNED
    }
    if (visitaActual.estado === VISITA_ESTADOS.ASSIGNED && tecnicosAsignados.length === 0) {
      nuevoEstado = VISITA_ESTADOS.PENDING
    }
    if (visitaActual.estado === VISITA_ESTADOS.REJECTED && tecnicosAsignados.length > 0) {
      nuevoEstado = VISITA_ESTADOS.ASSIGNED
    }

    const tecnicosOriginales = visitaActual.tecnicosAsignados || []
    const idsOriginales = tecnicosOriginales.map(t => t.id).sort().join(',')
    const idsActuales = tecnicosAsignados.map(t => t.id).sort().join(',')
    const tecnicosCambiaron = idsOriginales !== idsActuales

    const datosActualizacion = { estado: nuevoEstado }

    if (tecnicosCambiaron) {
      datosActualizacion.tecnicosAsignados = tecnicosAsignados
    }

    await updateVisitaTecnica(visitaActual.id, datosActualizacion)

    const visitaActualizada = {
      ...visitaActual,
      tecnicosAsignados: tecnicosAsignados,
      estado: nuevoEstado
    }
    setVisitaActual(visitaActualizada)
    setEditMode(false)

    MySwal.fire({
      icon: 'success',
      title: 'Cambios guardados',
      text: nuevoEstado !== visitaActual.estado
        ? `La visita ha sido actualizada. Estado: ${getEstadoLabel(nuevoEstado)}`
        : 'La visita técnica ha sido actualizada correctamente',
      timer: 2000,
      showConfirmButton: false
    })
  }, [visitaActual, tecnicosAsignados, updateVisitaTecnica])

  const handleCancelarEdicion = useCallback(() => {
    setEditMode(false)
    if (visitaActual.tecnicosAsignados?.length > 0) {
      setTecnicosAsignados(visitaActual.tecnicosAsignados)
    }
  }, [visitaActual])

  return {
    // Datos principales
    id,
    navigate,
    user,
    visitaActual,
    setVisitaActual,
    isLoading,

    // UI
    activeTab,
    setActiveTab,
    editMode,
    setEditMode,

    // Técnicos
    tecnicosAsignados,
    setTecnicosAsignados,
    tecnicos,

    // Estado del lugar
    estadoLugar,
    setEstadoLugar,
    mostrarFotografias,
    setMostrarFotografias,
    handleGuardarEstadoLugar,

    // Materiales
    materiales,
    nuevoMaterial,
    setNuevoMaterial,
    inputMaterial,
    setInputMaterial,
    mostrarDropdown,
    setMostrarDropdown,
    materialDelInventario,
    setMaterialDelInventario,
    materialEditando,
    setMaterialEditando,
    mostrarModalEditarMaterial,
    setMostrarModalEditarMaterial,
    handleInputMaterialChange,
    handleSeleccionarMaterial,
    handleFocusInput,
    handleBlurInput,
    handleAgregarMaterial,
    handleEliminarMaterial,
    handleAbrirModalEditarMaterial,
    handleCerrarModalEditarMaterial,
    handleGuardarMaterialEditado,

    // Herramientas
    herramientas,
    setHerramientas,
    herramientasInventario,
    nuevaHerramienta,
    setNuevaHerramienta,
    herramientaSeleccionadaInventario,
    setHerramientaSeleccionadaInventario,
    inputHerramienta,
    setInputHerramienta,
    mostrarDropdownHerramienta,
    setMostrarDropdownHerramienta,
    handleInputHerramientaChange,
    handleSeleccionarHerramienta,
    handleFocusInputHerramienta,
    handleBlurInputHerramienta,
    handleAgregarHerramienta,
    handleEliminarHerramienta,
    handleGuardarHerramientas,

    // Personal
    listaPersonal,
    setListaPersonal,
    nuevaPersona,
    setNuevaPersona,
    especialidadPersonalizada,
    setEspecialidadPersonalizada,
    mostrarInputEspecialidad,
    setMostrarInputEspecialidad,
    requerimientosAdicionales,
    setRequerimientosAdicionales,
    handleEspecialidadChange,
    handleAgregarPersona,
    handleEliminarPersona,
    handleGuardarPersonal,
    handleCargarTarifasPersonal,
    handleActualizarPrecioPersona,
    handleGuardarPreciosPersonal,

    // Completar
    datosCompletado,
    setDatosCompletado,
    canvasRef,
    isDrawing,
    setIsDrawing,
    showSignaturePad,
    setShowSignaturePad,
    handleCompletarVisita,
    startDrawing,
    draw,
    stopDrawing,
    clearSignature,
    saveSignature,

    // Aprobación
    handleAceptarVisita,
    handleRechazarVisita,

    // Cotización
    presupuestos,
    handleGenerarCotizacion,

    // PDF
    generateVisitaTecnicaReport,
    obtenerResumenFotos,

    // Permisos
    puedeEditar,
    puedeEditarFirma,

    // Edición general
    handleGuardarEdicionGeneral,
    handleCancelarEdicion,

    // Constantes
    MATERIALES_COMUNES,
    ESPECIALIDADES_PERSONAL,
    VISITA_ESTADOS
  }
}

export default useVisitaDetalle
