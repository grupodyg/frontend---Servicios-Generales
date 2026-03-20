import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import useAuthStore from '../../stores/authStore'
import useHerramientasStore from '../../stores/herramientasStore'
import { canViewPrices } from '../../utils/permissionsUtils'
import { getToday, formatDateTime, formatDate } from '../../utils/dateUtils'
import { getFileUrl } from '../../config/api'
import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'

const MySwal = withReactContent(Swal)

const Herramientas = () => {
  const navigate = useNavigate()
  const { user, hasPermission } = useAuthStore()
  const {
    herramientas,
    categorias,
    solicitudes,
    fetchHerramientas,
    fetchCategorias,
    fetchSolicitudes,
    createSolicitud,
    updateSolicitud,
    updateHerramienta,
    createCategoria,
    updateCategoria,
    deleteCategoria,
    aprobarSolicitud,
    marcarEntregada,
    marcarDevuelta,
    isLoading
  } = useHerramientasStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [activeTab, setActiveTab] = useState('inventario')
  const [showSolicitudHerramientasModal, setShowSolicitudHerramientasModal] = useState(false)
  const [selectedHerramientas, setSelectedHerramientas] = useState([])
  const [nuevaSolicitudHerramienta, setNuevaSolicitudHerramienta] = useState({
    herramientaId: '',
    fechaDevolucionPrevista: '',
    motivo: '',
    observaciones: ''
  })

  // Filtros para Solicitudes de Herramientas
  const [filtroEstadoSolicitud, setFiltroEstadoSolicitud] = useState('todos')
  const [filtroTecnico, setFiltroTecnico] = useState('todos')
  const [filtroOrden, setFiltroOrden] = useState('todos')
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('')
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('')
  const [busquedaSolicitudes, setBusquedaSolicitudes] = useState('')
  const [busquedaHerramientasModal, setBusquedaHerramientasModal] = useState('')

  // Estados para modales de Ver/Editar herramienta
  const [showDetallesModal, setShowDetallesModal] = useState(false)
  const [showEditarModal, setShowEditarModal] = useState(false)
  const [herramientaSeleccionada, setHerramientaSeleccionada] = useState(null)

  // Estados para gestión de categorías
  const [showCategoriasModal, setShowCategoriasModal] = useState(false)
  const [nuevaCategoria, setNuevaCategoria] = useState({ nombre: '', prefijo: '' })
  const [categoriaEditando, setCategoriaEditando] = useState(null)
  const [categoriaEditandoNombre, setCategoriaEditandoNombre] = useState('')
  const [categoriaEditandoPrefijo, setCategoriaEditandoPrefijo] = useState('')

  // Estados para imagen en edición
  const [imagenEditarFile, setImagenEditarFile] = useState(null)
  const [imagenEditarPreview, setImagenEditarPreview] = useState(null)

  useEffect(() => {
    // Cargar herramientas, categorías y solicitudes desde la API
    const cargarDatos = async () => {
      try {
        await Promise.all([
          fetchHerramientas(),
          fetchCategorias(),
          fetchSolicitudes()
        ])
      } catch (error) {
        console.error('Error cargando datos:', error)
        MySwal.fire({
          icon: 'error',
          title: 'Error al cargar datos',
          text: 'No se pudieron cargar las herramientas. Verifique la conexión con el servidor.'
        })
      }
    }

    cargarDatos()
  }, [fetchHerramientas, fetchCategorias, fetchSolicitudes])

  // Funciones stub - TODO: Verificar si existen en el store o implementar
  const getHerramientasDisponibles = () => {
    return herramientas?.filter(h => h.estado === 'available') || []
  }

  const getEstadisticasHerramientas = () => {
    const total = herramientas?.length || 0
    const disponibles = herramientas?.filter(h => h.estado === 'available').length || 0
    const enUso = herramientas?.filter(h => h.estado === 'assigned').length || 0
    const enMantenimiento = herramientas?.filter(h => h.estado === 'maintenance').length || 0

    return { total, disponibles, enUso, enMantenimiento }
  }

  const updateSolicitudHerramientaEstado = async (solicitudId, nuevoEstado) => {
    // Usar las funciones específicas del store según el estado
    switch (nuevoEstado) {
      case 'approved':
        await aprobarSolicitud(solicitudId, user?.name || 'Admin')
        break
      case 'rejected':
        await updateSolicitud(solicitudId, { estado: 'rejected' })
        break
      case 'delivered':
        await marcarEntregada(solicitudId, user?.name || 'Admin')
        break
      case 'returned':
        await marcarDevuelta(solicitudId, user?.name || 'Admin')
        break
      default:
        await updateSolicitud(solicitudId, { estado: nuevoEstado })
    }
  }

  const marcarHerramientasDevueltas = async (solicitudId) => {
    await marcarDevuelta(solicitudId, user?.name || 'Admin')
  }

  // Handlers para gestión de categorías
  const handleAddCategoria = async () => {
    if (!nuevaCategoria.nombre.trim()) {
      MySwal.fire({
        title: 'Error',
        text: 'El nombre de la categoría no puede estar vacío',
        icon: 'error',
        confirmButtonColor: '#1e40af'
      })
      return
    }

    if (!nuevaCategoria.prefijo.trim()) {
      MySwal.fire({
        title: 'Error',
        text: 'El prefijo de la categoría no puede estar vacío',
        icon: 'error',
        confirmButtonColor: '#1e40af'
      })
      return
    }

    if (nuevaCategoria.prefijo.trim().length > 4) {
      MySwal.fire({
        title: 'Error',
        text: 'El prefijo no puede tener más de 4 caracteres',
        icon: 'error',
        confirmButtonColor: '#1e40af'
      })
      return
    }

    try {
      await createCategoria({
        nombre: nuevaCategoria.nombre.trim(),
        prefijo: nuevaCategoria.prefijo.trim().toUpperCase()
      })
      MySwal.fire({
        title: '¡Categoría agregada!',
        text: `La categoría "${nuevaCategoria.nombre}" ha sido creada correctamente`,
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      })
      setNuevaCategoria({ nombre: '', prefijo: '' })
    } catch (error) {
      MySwal.fire({
        title: 'Error',
        text: error.message || 'No se pudo crear la categoría',
        icon: 'error',
        confirmButtonColor: '#1e40af'
      })
    }
  }

  const handleEditCategoria = async () => {
    if (!categoriaEditandoNombre.trim()) {
      MySwal.fire({
        title: 'Error',
        text: 'El nombre de la categoría no puede estar vacío',
        icon: 'error',
        confirmButtonColor: '#1e40af'
      })
      return
    }

    if (!categoriaEditandoPrefijo.trim()) {
      MySwal.fire({
        title: 'Error',
        text: 'El prefijo de la categoría no puede estar vacío',
        icon: 'error',
        confirmButtonColor: '#1e40af'
      })
      return
    }

    if (categoriaEditandoPrefijo.trim().length > 4) {
      MySwal.fire({
        title: 'Error',
        text: 'El prefijo no puede tener más de 4 caracteres',
        icon: 'error',
        confirmButtonColor: '#1e40af'
      })
      return
    }

    try {
      await updateCategoria(categoriaEditando.id, {
        nombre: categoriaEditandoNombre.trim(),
        prefijo: categoriaEditandoPrefijo.trim().toUpperCase()
      })
      MySwal.fire({
        title: '¡Categoría actualizada!',
        text: 'La categoría ha sido actualizada correctamente',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      })
      setCategoriaEditando(null)
      setCategoriaEditandoNombre('')
      setCategoriaEditandoPrefijo('')
    } catch (error) {
      MySwal.fire({
        title: 'Error',
        text: error.message || 'No se pudo actualizar la categoría',
        icon: 'error',
        confirmButtonColor: '#1e40af'
      })
    }
  }

  const handleDeleteCategoria = async (categoriaId) => {
    const categoria = categorias.find(c => c.id === categoriaId)
    if (!categoria) return

    const result = await MySwal.fire({
      title: '¿Eliminar categoría?',
      text: `Se eliminará la categoría "${categoria.nombre}". Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar'
    })

    if (result.isConfirmed) {
      try {
        await deleteCategoria(categoriaId)
        MySwal.fire({
          title: '¡Categoría eliminada!',
          text: 'La categoría ha sido eliminada correctamente',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        })
      } catch (error) {
        MySwal.fire({
          title: 'Error',
          text: error.message || 'No se pudo eliminar la categoría',
          icon: 'error',
          confirmButtonColor: '#1e40af'
        })
      }
    }
  }

  const startEditCategoria = (categoria) => {
    setCategoriaEditando(categoria)
    setCategoriaEditandoNombre(categoria.nombre)
    setCategoriaEditandoPrefijo(categoria.prefijo)
  }

  const cancelEditCategoria = () => {
    setCategoriaEditando(null)
    setCategoriaEditandoNombre('')
    setCategoriaEditandoPrefijo('')
  }

  const filteredHerramientas = (herramientas || []).filter(herramienta => {
    const matchesSearch = herramienta.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         herramienta.codigo.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' ||
                           String(herramienta.categoriaId) === String(selectedCategory)

    return matchesSearch && matchesCategory
  })

  // Función para filtrar solicitudes de herramientas
  const filtrarSolicitudesHerramientas = () => {
    let filtered = solicitudes

    // Si es técnico, solo mostrar sus propias solicitudes
    if (user?.role === 'tecnico') {
      filtered = filtered.filter(solicitud => solicitud.solicitante === user.name)
    }

    // Filtrar por estado
    if (filtroEstadoSolicitud !== 'todos') {
      filtered = filtered.filter(solicitud => solicitud.estado === filtroEstadoSolicitud)
    }

    // Filtrar por técnico (solo para admin/supervisor)
    if (user?.role !== 'tecnico' && filtroTecnico !== 'todos') {
      filtered = filtered.filter(solicitud => solicitud.solicitante === filtroTecnico)
    }

    // Filtrar por orden
    if (filtroOrden !== 'todos') {
      filtered = filtered.filter(solicitud => solicitud.ordenId === filtroOrden)
    }

    // Filtrar por fecha desde
    if (filtroFechaDesde) {
      filtered = filtered.filter(solicitud => {
        const fechaSolicitud = new Date(solicitud.fechaSolicitud)
        const fechaDesde = new Date(filtroFechaDesde)
        return fechaSolicitud >= fechaDesde
      })
    }

    // Filtrar por fecha hasta
    if (filtroFechaHasta) {
      filtered = filtered.filter(solicitud => {
        const fechaSolicitud = new Date(solicitud.fechaSolicitud)
        const fechaHasta = new Date(filtroFechaHasta)
        return fechaSolicitud <= fechaHasta
      })
    }

    // Filtrar por búsqueda de texto
    if (busquedaSolicitudes) {
      const searchLower = busquedaSolicitudes.toLowerCase()
      filtered = filtered.filter(solicitud => {
        // Buscar en ID de solicitud
        if (solicitud.id.toLowerCase().includes(searchLower)) return true

        // Buscar en nombre del solicitante
        if (solicitud.solicitante.toLowerCase().includes(searchLower)) return true

        // Buscar en orden de trabajo
        if (solicitud.ordenId?.toLowerCase().includes(searchLower)) return true

        // Buscar en nombres de herramientas
        if (solicitud.herramientas.some(h => h.nombre.toLowerCase().includes(searchLower))) return true

        // Buscar en motivo de herramientas
        if (solicitud.herramientas.some(h => h.motivo?.toLowerCase().includes(searchLower))) return true

        // Buscar en observaciones
        if (solicitud.observacionesGenerales?.toLowerCase().includes(searchLower)) return true

        return false
      })
    }

    return filtered
  }

  // Función para filtrar herramientas en el modal
  const filtrarHerramientasModal = () => {
    let filtered = herramientasDisponibles

    // Filtrar por búsqueda
    if (busquedaHerramientasModal) {
      const searchLower = busquedaHerramientasModal.toLowerCase()
      filtered = filtered.filter(herramienta => {
        // Buscar en nombre
        if (herramienta.nombre.toLowerCase().includes(searchLower)) return true

        // Buscar en categoría
        if (herramienta.categoriaNombre?.toLowerCase().includes(searchLower)) return true

        // Buscar en descripción
        if (herramienta.descripcion?.toLowerCase().includes(searchLower)) return true

        // Buscar en código
        if (herramienta.codigo?.toLowerCase().includes(searchLower)) return true

        return false
      })
    }

    return filtered
  }

  const getEstadoBadge = (estado) => {
    const badges = {
      'available': 'bg-green-100 text-green-800',
      'assigned': 'bg-blue-100 text-blue-800',
      'in_use': 'bg-blue-100 text-blue-800',
      'maintenance': 'bg-yellow-100 text-yellow-800',
      'out_of_service': 'bg-red-100 text-red-800',
      'inactive': 'bg-gray-100 text-gray-800'
    }

    const labels = {
      'available': 'Disponible',
      'assigned': 'Asignado',
      'in_use': 'En Uso',
      'maintenance': 'Mantenimiento',
      'out_of_service': 'Fuera de Servicio',
      'inactive': 'Inactivo'
    }

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${badges[estado] || 'bg-gray-100 text-gray-800'}`}>
        {labels[estado] || estado}
      </span>
    )
  }

  const herramientasDisponibles = getHerramientasDisponibles()
  const estadisticasHerramientas = getEstadisticasHerramientas()

  const handleSolicitudHerramientaAprobacion = async (solicitudId, accion) => {
    // Configuración específica para devolución de herramientas
    if (accion === 'returned') {
      const result = await MySwal.fire({
        title: '¿Confirmar devolución de herramientas?',
        html: `
          <p class="text-gray-600 mb-2">Se registrará la fecha de devolución actual y las herramientas serán devueltas al inventario.</p>
          <div class="bg-blue-50 border border-blue-200 rounded p-3 mt-3">
            <p class="text-sm text-blue-800">
              <strong>Esta acción realizará:</strong><br/>
              • Registro de fecha de devolución real<br/>
              • Incremento del stock en inventario<br/>
              • Cambio de estado de herramientas a "disponible"
            </p>
          </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#7c3aed',
        cancelButtonColor: '#6b7280',
        confirmButtonText: '🔙 Confirmar Devolución',
        cancelButtonText: 'Cancelar'
      })

      if (result.isConfirmed) {
        try {
          await marcarHerramientasDevueltas(solicitudId)
          MySwal.fire({
            title: '¡Herramientas devueltas!',
            html: `
              <p class="text-gray-600">Las herramientas han sido devueltas correctamente.</p>
              <p class="text-sm text-gray-500 mt-2">El inventario ha sido actualizado.</p>
            `,
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
          })
        } catch (error) {
          MySwal.fire({
            title: 'Error',
            text: error.message || 'No se pudo registrar la devolución de herramientas',
            icon: 'error'
          })
        }
      }
      return
    }

    // Configuración para otras acciones (aprobar, rechazar, entregar)
    const result = await MySwal.fire({
      title: `¿${accion === 'approved' ? 'Aprobar' : accion === 'delivered' ? 'Marcar como entregada' : 'Rechazar'} solicitud de herramienta?`,
      text: 'Esta acción no se puede deshacer',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: accion === 'approved' ? '#059669' : accion === 'delivered' ? '#2563eb' : '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: accion === 'approved' ? 'Aprobar' : accion === 'delivered' ? 'Entregar' : 'Rechazar',
      cancelButtonText: 'Cancelar'
    })

    if (result.isConfirmed) {
      try {
        await updateSolicitudHerramientaEstado(solicitudId, accion)
        MySwal.fire({
          title: '¡Actualizado!',
          text: `Solicitud ${accion} correctamente`,
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        })
      } catch (error) {
        MySwal.fire({
          title: 'Error',
          text: 'No se pudo actualizar la solicitud',
          icon: 'error'
        })
      }
    }
  }

  const handleAddHerramienta = (herramienta) => {
    const existingIndex = selectedHerramientas.findIndex(h => h.id === herramienta.id)

    if (existingIndex >= 0) {
      return // Tool already selected
    } else {
      setSelectedHerramientas([...selectedHerramientas, {
        ...herramienta,
        fechaDevolucionPrevista: '',
        motivo: 'Trabajo en campo',
        observaciones: ''
      }])
    }
  }

  const handleRemoveHerramienta = (herramientaId) => {
    setSelectedHerramientas(selectedHerramientas.filter(h => h.id !== herramientaId))
  }

  const handleUpdateHerramientaDetails = (herramientaId, field, value) => {
    const updated = selectedHerramientas.map(herramienta =>
      herramienta.id === herramientaId ? { ...herramienta, [field]: value } : herramienta
    )
    setSelectedHerramientas(updated)
  }

  const handleSubmitNuevaSolicitudHerramienta = async () => {
    if (selectedHerramientas.length === 0) {
      MySwal.fire({
        title: 'Error',
        text: 'Debe seleccionar al menos una herramienta',
        icon: 'error',
        confirmButtonColor: '#1e40af'
      })
      return
    }

    // Validate all selected tools have return dates
    const missingDates = selectedHerramientas.filter(h => !h.fechaDevolucionPrevista)
    if (missingDates.length > 0) {
      MySwal.fire({
        title: 'Error',
        text: 'Debe especificar la fecha de devolución prevista para todas las herramientas',
        icon: 'error',
        confirmButtonColor: '#1e40af'
      })
      return
    }

    try {
      const solicitudData = {
        solicitante: user?.name || 'Usuario',
        herramientas: selectedHerramientas.map(herramienta => ({
          herramientaId: herramienta.id,
          nombre: herramienta.nombre,
          fechaDevolucionPrevista: herramienta.fechaDevolucionPrevista,
          motivo: herramienta.motivo || 'Trabajo en campo',
          observaciones: herramienta.observaciones || ''
        }))
      }

      await createSolicitud(solicitudData)

      MySwal.fire({
        title: '¡Solicitud creada!',
        text: 'La solicitud de herramientas ha sido enviada correctamente',
        icon: 'success',
        confirmButtonColor: '#1e40af'
      })

      // Reset form and close modal
      setSelectedHerramientas([])
      setNuevaSolicitudHerramienta({
        herramientaId: '',
        fechaDevolucionPrevista: '',
        motivo: '',
        observaciones: ''
      })
      setBusquedaHerramientasModal('')
      setShowSolicitudHerramientasModal(false)

    } catch (error) {
      MySwal.fire({
        title: 'Error',
        text: error.message || 'No se pudo crear la solicitud de herramientas',
        icon: 'error',
        confirmButtonColor: '#1e40af'
      })
    }
  }

  const handleVerDetalles = (herramienta) => {
    setHerramientaSeleccionada(herramienta)
    setShowDetallesModal(true)
  }

  const handleEditar = (herramienta) => {
    setHerramientaSeleccionada(herramienta)
    setShowEditarModal(true)
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        MySwal.fire({ title: 'Error', text: 'Solo se permiten archivos de imagen', icon: 'error', confirmButtonColor: '#1e40af' })
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        MySwal.fire({ title: 'Error', text: 'La imagen no debe superar los 10MB', icon: 'error', confirmButtonColor: '#1e40af' })
        return
      }
      setImagenEditarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setImagenEditarPreview(reader.result)
      reader.readAsDataURL(file)
    }
  }

  const handleGuardarEdicion = async () => {
    try {
      const datosActualizados = {
        nombre: herramientaSeleccionada.nombre,
        modelo: herramientaSeleccionada.modelo,
        marca: herramientaSeleccionada.marca,
        cantidad: herramientaSeleccionada.cantidad,
        valor: herramientaSeleccionada.valor,
        descripcion: herramientaSeleccionada.descripcion,
        estado: herramientaSeleccionada.estado,
        categoriaId: herramientaSeleccionada.categoriaId
      }

      await updateHerramienta(herramientaSeleccionada.id, datosActualizados, imagenEditarFile)

      MySwal.fire({
        title: '¡Actualizado!',
        text: 'La herramienta ha sido actualizada correctamente',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      })
      setShowEditarModal(false)
      setHerramientaSeleccionada(null)
      setImagenEditarFile(null)
      setImagenEditarPreview(null)
    } catch (error) {
      console.error('Error actualizando herramienta:', error)
      MySwal.fire({
        title: 'Error',
        text: error.message || 'No se pudo actualizar la herramienta',
        icon: 'error'
      })
    }
  }

  // Calcular el conteo de solicitudes según el rol
  const solicitudesVisibles = user?.role === 'tecnico'
    ? solicitudes.filter(s => s.solicitante === user.name)
    : solicitudes

  const tabs = [
    { id: 'inventario', name: 'Inventario', icon: '🛠️', count: herramientas.length },
    { id: 'solicitudes', name: 'Solicitudes', icon: '📝', count: solicitudesVisibles.length }
  ]

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Herramientas</h1>
            <p className="text-gray-600">Gestión de herramientas del inventario</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-corporate-blue mx-auto"></div>
            <p className="mt-2 text-gray-500">Cargando herramientas...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Herramientas</h1>
          <p className="text-gray-600 text-sm sm:text-base hidden sm:block">Gestión de herramientas del inventario</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:space-x-3 w-full sm:w-auto">
          {user?.role === 'admin' && (
            <>
              <button
                onClick={() => navigate('/herramientas/nueva')}
                className="btn-secondary text-sm"
              >
                🔧 Nueva Herramienta
              </button>
              <button
                onClick={() => setShowCategoriasModal(true)}
                className="btn-secondary text-sm"
              >
                🏷️ Gestionar Categorías
              </button>
            </>
          )}
          <button
            onClick={() => setShowSolicitudHerramientasModal(true)}
            className="btn-primary text-sm"
          >
            📝 Solicitar Herramientas
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buscar herramientas
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="Buscar por nombre o código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoría
            </label>
            <select
              className="input-field"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">Todas las categorías</option>
              {categorias.map(categoria => (
                <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
        <div className="card text-center p-3 sm:p-4 md:p-6">
          <div className="text-xl sm:text-2xl font-bold text-green-600">
            {herramientas.filter(h => h.estado === 'available').length}
          </div>
          <div className="text-xs sm:text-sm text-gray-600">Disponibles</div>
        </div>
        <div className="card text-center p-3 sm:p-4 md:p-6">
          <div className="text-xl sm:text-2xl font-bold text-blue-600">
            {herramientas.filter(h => h.estado === 'assigned').length}
          </div>
          <div className="text-xs sm:text-sm text-gray-600">En Uso</div>
        </div>
        <div className="card text-center p-3 sm:p-4 md:p-6">
          <div className="text-xl sm:text-2xl font-bold text-yellow-600">
            {herramientas.filter(h => h.estado === 'maintenance').length}
          </div>
          <div className="text-xs sm:text-sm text-gray-600">Mantenimiento</div>
        </div>
        <div className="card text-center p-3 sm:p-4 md:p-6">
          <div className="text-xl sm:text-2xl font-bold text-gray-900">
            {herramientas.length}
          </div>
          <div className="text-xs sm:text-sm text-gray-600">Total</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 overflow-x-auto">
        <nav className="-mb-px flex space-x-4 sm:space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex-shrink-0 ${
                activeTab === tab.id
                  ? 'border-corporate-blue text-corporate-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-1 sm:mr-2">{tab.icon}</span>
              {tab.name}
              {tab.count !== undefined && (
                <span className="ml-1 sm:ml-2 bg-gray-100 text-gray-600 py-1 px-2 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === 'inventario' && (
          <div>
            {/* Lista de herramientas */}
            <div className="card p-3 sm:p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">
            Lista de Herramientas ({filteredHerramientas.length})
          </h2>
        </div>

        {/* Vista tarjetas movil */}
        <div className="md:hidden space-y-3">
          {filteredHerramientas.map((herramienta) => (
            <div key={herramienta.id} className="bg-gray-50 rounded-lg p-3 border">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center min-w-0 flex-1">
                  {herramienta.imagen ? (
                    <img src={getFileUrl(herramienta.imagen)} alt={herramienta.nombre} className="w-10 h-10 object-cover rounded mr-2 flex-shrink-0" />
                  ) : (
                    <div className="text-xl mr-2 flex-shrink-0">🔧</div>
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{herramienta.nombre}</div>
                    <div className="text-xs text-gray-500">{herramienta.modelo}</div>
                  </div>
                </div>
                <div className="flex space-x-2 flex-shrink-0 ml-2">
                  <button
                    onClick={() => handleVerDetalles(herramienta)}
                    className="text-blue-600 hover:text-blue-900"
                    title="Ver detalles"
                  >
                    👁️
                  </button>
                  {user?.role === 'admin' && (
                    <button
                      onClick={() => handleEditar(herramienta)}
                      className="text-gray-600 hover:text-gray-900"
                      title="Editar"
                    >
                      ✏️
                    </button>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-gray-500 font-mono">{herramienta.codigo}</span>
                <span className="text-gray-400">|</span>
                <span className="text-gray-600">{herramienta.categoriaNombre || '-'}</span>
                <span className="text-gray-400">|</span>
                {getEstadoBadge(herramienta.estado)}
                {canViewPrices(user) && herramienta.valor && (
                  <>
                    <span className="text-gray-400">|</span>
                    <span className="text-gray-900 font-medium">S/ {herramienta.valor.toFixed(2)}</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Vista tabla desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Herramienta
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Código
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categoría
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                {canViewPrices(user) && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredHerramientas.map((herramienta) => (
                <tr key={herramienta.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {herramienta.imagen ? (
                        <img src={getFileUrl(herramienta.imagen)} alt={herramienta.nombre} className="w-10 h-10 object-cover rounded mr-3" />
                      ) : (
                        <div className="text-2xl mr-3">🔧</div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {herramienta.nombre}
                        </div>
                        <div className="text-sm text-gray-500">
                          {herramienta.modelo}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {herramienta.codigo}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {herramienta.categoriaNombre || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getEstadoBadge(herramienta.estado)}
                  </td>
                  {canViewPrices(user) && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {herramienta.valor ? `S/ ${herramienta.valor.toFixed(2)}` : 'N/A'}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleVerDetalles(herramienta)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Ver detalles"
                      >
                        👁️
                      </button>
                      {user?.role === 'admin' && (
                        <button
                          onClick={() => handleEditar(herramienta)}
                          className="text-gray-600 hover:text-gray-900"
                          title="Editar"
                        >
                          ✏️
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredHerramientas.length === 0 && (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🔧</div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              No se encontraron herramientas
            </h3>
            <p className="text-gray-500">
              Intenta ajustar los filtros de búsqueda
            </p>
          </div>
        )}
            </div>
          </div>
        )}

        {activeTab === 'solicitudes' && (
          <div className="space-y-6">
            {/* Filtros de Solicitudes */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">🔍 Filtros</h3>

              {/* Campo de Búsqueda (destacado arriba) */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  🔎 Búsqueda General
                </label>
                <input
                  type="text"
                  placeholder="Buscar por ID, técnico, orden, herramienta, motivo u observaciones..."
                  className="input-field"
                  value={busquedaSolicitudes}
                  onChange={(e) => setBusquedaSolicitudes(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Busca en ID de solicitud, técnico, orden de trabajo, herramientas, motivos y observaciones
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                {/* Filtro por Estado */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado
                  </label>
                  <select
                    className="input-field"
                    value={filtroEstadoSolicitud}
                    onChange={(e) => setFiltroEstadoSolicitud(e.target.value)}
                  >
                    <option value="todos">Todos los estados</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="aprobada">Aprobada</option>
                    <option value="rechazada">Rechazada</option>
                    <option value="entregada">Entregada</option>
                    <option value="devuelta">Devuelta</option>
                    <option value="vencida">Vencida</option>
                  </select>
                </div>

                {/* Filtro por Técnico */}
                {/* Filtro por Técnico - Solo visible para admin/supervisor */}
                {user?.role !== 'tecnico' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Técnico
                    </label>
                    <select
                      className="input-field"
                      value={filtroTecnico}
                      onChange={(e) => setFiltroTecnico(e.target.value)}
                    >
                      <option value="todos">Todos los técnicos</option>
                      {[...new Set(solicitudes.map(s => s.solicitante))].map((tecnico) => (
                        <option key={tecnico} value={tecnico}>{tecnico}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Filtro por Orden */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Orden de Trabajo
                  </label>
                  <select
                    className="input-field"
                    value={filtroOrden}
                    onChange={(e) => setFiltroOrden(e.target.value)}
                  >
                    <option value="todos">Todas las órdenes</option>
                    {[...new Set(solicitudes.filter(s => s.ordenId).map(s => s.ordenId))].map((ordenId) => (
                      <option key={ordenId} value={ordenId}>{ordenId}</option>
                    ))}
                  </select>
                </div>

                {/* Filtro Fecha Desde */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha Desde
                  </label>
                  <input
                    type="date"
                    className="input-field"
                    value={filtroFechaDesde}
                    onChange={(e) => setFiltroFechaDesde(e.target.value)}
                  />
                </div>

                {/* Filtro Fecha Hasta */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha Hasta
                  </label>
                  <input
                    type="date"
                    className="input-field"
                    value={filtroFechaHasta}
                    onChange={(e) => setFiltroFechaHasta(e.target.value)}
                  />
                </div>
              </div>

              {/* Botón Limpiar Filtros */}
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => {
                    setBusquedaSolicitudes('')
                    setFiltroEstadoSolicitud('todos')
                    setFiltroTecnico('todos')
                    setFiltroOrden('todos')
                    setFiltroFechaDesde('')
                    setFiltroFechaHasta('')
                  }}
                  className="btn-secondary"
                >
                  🔄 Limpiar Filtros
                </button>
              </div>
            </div>

            {/* Resultado de Solicitudes Filtradas */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                📊 Mostrando <span className="font-bold">{filtrarSolicitudesHerramientas().length}</span> de {solicitudes.length} solicitudes
              </p>
            </div>

            {/* Lista de Solicitudes */}
            {filtrarSolicitudesHerramientas().length === 0 ? (
              <div className="card text-center py-12">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No se encontraron solicitudes
                </h3>
                <p className="text-gray-600">
                  No hay solicitudes que coincidan con los filtros seleccionados
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filtrarSolicitudesHerramientas().map((solicitud) => (
              <div key={solicitud.id} className="card p-3 sm:p-4 md:p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-2 sm:gap-0 mb-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{solicitud.id}</h3>
                    <p className="text-xs sm:text-sm text-gray-500 break-words">
                      Solicitado por: {solicitud.solicitante || 'Sin asignar'} • {formatDateTime(solicitud.fechaSolicitud)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <span className={`status-badge ${
                      (solicitud.estado === 'pendiente' || solicitud.estado === 'pending') ? 'status-pending' :
                      (solicitud.estado === 'aprobada' || solicitud.estado === 'approved') ? 'bg-blue-100 text-blue-800' :
                      (solicitud.estado === 'entregada' || solicitud.estado === 'delivered') ? 'bg-green-100 text-green-800' :
                      (solicitud.estado === 'devuelta' || solicitud.estado === 'returned') ? 'status-completed' :
                      (solicitud.estado === 'vencida' || solicitud.estado === 'overdue') ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {solicitud.estado === 'pending' ? 'Pendiente' :
                       solicitud.estado === 'approved' ? 'Aprobada' :
                       solicitud.estado === 'delivered' ? 'Entregada' :
                       solicitud.estado === 'returned' ? 'Devuelta' :
                       solicitud.estado === 'overdue' ? 'Vencida' :
                       solicitud.estado}
                    </span>
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Herramientas solicitadas:</h4>
                  <div className="space-y-2">
                    {solicitud.herramientas && solicitud.herramientas.length > 0 ? (
                      solicitud.herramientas.map((herramienta, index) => (
                        <div key={index} className="flex flex-col sm:flex-row justify-between sm:items-center bg-gray-50 rounded p-2 gap-1">
                          <div className="flex-1 min-w-0">
                            <span className="text-xs sm:text-sm font-medium text-gray-900">{herramienta.nombre || 'Herramienta sin nombre'}</span>
                            <p className="text-xs text-gray-600">{herramienta.motivo || 'Sin motivo especificado'}</p>
                          </div>
                          <div className="text-left sm:text-right text-xs sm:text-sm text-gray-600 flex-shrink-0">
                            <div>Devolución: {formatDate(herramienta.fechaDevolucionPrevista) || 'No especificada'}</div>
                            {(solicitud.estado === 'entregada' || solicitud.estado === 'delivered') && herramienta.fechaEntrega && (
                              <div className="text-blue-600">Entregada: {formatDateTime(herramienta.fechaEntrega)}</div>
                            )}
                            {(solicitud.estado === 'devuelta' || solicitud.estado === 'returned') && herramienta.fechaDevolucionReal && (
                              <div className="text-green-600">Devuelta: {formatDateTime(herramienta.fechaDevolucionReal)}</div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-500 italic p-2">
                        No hay herramientas registradas en esta solicitud
                      </div>
                    )}
                  </div>
                </div>

                {solicitud.observacionesGenerales && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-1">Observaciones:</h4>
                    <p className="text-sm text-gray-600 bg-gray-50 rounded p-2">
                      {solicitud.observacionesGenerales}
                    </p>
                  </div>
                )}

                {user?.role === 'admin' && (
                  <div className="flex flex-col sm:flex-row gap-2 sm:space-x-3">
                    {(solicitud.estado === 'pendiente' || solicitud.estado === 'pending') && (
                      <>
                        <button
                          onClick={() => handleSolicitudHerramientaAprobacion(solicitud.id, 'approved')}
                          className="btn-primary bg-green-600 hover:bg-green-700 text-sm"
                        >
                          ✅ Aprobar
                        </button>
                        <button
                          onClick={() => handleSolicitudHerramientaAprobacion(solicitud.id, 'rejected')}
                          className="btn-secondary bg-red-50 text-red-700 hover:bg-red-100 text-sm"
                        >
                          ❌ Rechazar
                        </button>
                      </>
                    )}
                    {(solicitud.estado === 'aprobada' || solicitud.estado === 'approved') && (
                      <button
                        onClick={() => handleSolicitudHerramientaAprobacion(solicitud.id, 'delivered')}
                        className="btn-primary bg-blue-600 hover:bg-blue-700 text-sm"
                      >
                        📦 Marcar como Entregada
                      </button>
                    )}
                    {(solicitud.estado === 'entregada' || solicitud.estado === 'delivered') && (
                      <button
                        onClick={() => handleSolicitudHerramientaAprobacion(solicitud.id, 'returned')}
                        className="btn-primary bg-purple-600 hover:bg-purple-700 text-sm"
                      >
                        🔙 Marcar como Devuelta
                      </button>
                    )}
                  </div>
                )}
              </div>
                ))}
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Solicitud de Herramientas Modal */}
      {showSolicitudHerramientasModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                  🔧 Nueva Solicitud de Herramientas
                </h3>
                <button
                  onClick={() => {
                    setShowSolicitudHerramientasModal(false)
                    setSelectedHerramientas([])
                    setNuevaSolicitudHerramienta({
                      herramientaId: '',
                      fechaDevolucionPrevista: '',
                      motivo: '',
                      observaciones: ''
                    })
                    setBusquedaHerramientasModal('')
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Available Tools */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    Herramientas Disponibles
                  </h4>

                  {/* Buscador de herramientas */}
                  <div className="mb-3">
                    <input
                      type="text"
                      placeholder="🔎 Buscar herramientas..."
                      className="input-field"
                      value={busquedaHerramientasModal}
                      onChange={(e) => setBusquedaHerramientasModal(e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Mostrando {filtrarHerramientasModal().length} de {herramientasDisponibles.length} herramientas
                    </p>
                  </div>

                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {filtrarHerramientasModal().map((herramienta) => (
                      <div key={herramienta.id} className="bg-gray-50 p-4 rounded-lg border">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              {herramienta.imagen ? (
                                <img
                                  src={getFileUrl(herramienta.imagen)}
                                  alt={herramienta.nombre}
                                  className="w-12 h-12 object-cover rounded"
                                />
                              ) : (
                                <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                                  🔧
                                </div>
                              )}
                              <div>
                                <h5 className="font-medium text-gray-900">{herramienta.nombre}</h5>
                                <p className="text-xs text-gray-600">{herramienta.descripcion}</p>
                              </div>
                            </div>
                            <div className="text-xs text-gray-500">
                              Stock: {herramienta.cantidad} disponibles
                            </div>
                          </div>
                          <button
                            onClick={() => handleAddHerramienta(herramienta)}
                            className="btn-secondary text-xs px-3 py-1"
                            disabled={herramienta.cantidad <= 0 || selectedHerramientas.some(h => h.id === herramienta.id)}
                          >
                            {herramienta.cantidad <= 0 ? 'No disponible' :
                             selectedHerramientas.some(h => h.id === herramienta.id) ? 'Agregada' : '+ Agregar'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Selected Tools */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    Herramientas Seleccionadas ({selectedHerramientas.length})
                  </h4>

                  {selectedHerramientas.length > 0 ? (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {selectedHerramientas.map((herramienta) => (
                        <div key={herramienta.id} className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h5 className="font-medium text-gray-900">{herramienta.nombre}</h5>
                              <p className="text-xs text-gray-600">{herramienta.descripcion}</p>
                            </div>
                            <button
                              onClick={() => handleRemoveHerramienta(herramienta.id)}
                              className="text-red-500 hover:text-red-700 text-sm"
                            >
                              ✕
                            </button>
                          </div>

                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Fecha de devolución prevista *
                              </label>
                              <input
                                type="date"
                                value={herramienta.fechaDevolucionPrevista}
                                onChange={(e) => handleUpdateHerramientaDetails(herramienta.id, 'fechaDevolucionPrevista', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                min={getToday()}
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Motivo
                              </label>
                              <select
                                value={herramienta.motivo}
                                onChange={(e) => handleUpdateHerramientaDetails(herramienta.id, 'motivo', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              >
                                <option value="Trabajo en campo">Trabajo en campo</option>
                                <option value="Mantenimiento preventivo">Mantenimiento preventivo</option>
                                <option value="Reparación">Reparación</option>
                                <option value="Instalación">Instalación</option>
                                <option value="Emergencia">Emergencia</option>
                                <option value="Otros">Otros</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Observaciones
                              </label>
                              <textarea
                                value={herramienta.observaciones}
                                onChange={(e) => handleUpdateHerramientaDetails(herramienta.id, 'observaciones', e.target.value)}
                                placeholder="Observaciones adicionales..."
                                rows="2"
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <span className="text-4xl text-gray-400 mb-2 block">🔧</span>
                      <p className="text-gray-500 text-sm">No hay herramientas seleccionadas</p>
                      <p className="text-gray-400 text-xs mt-1">Selecciona herramientas de la lista de disponibles</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Summary */}
              {selectedHerramientas.length > 0 && (
                <div className="mt-6 bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">
                    Resumen de la solicitud
                  </h4>
                  <p className="text-sm text-blue-800">
                    Se solicitarán <strong>{selectedHerramientas.length}</strong> herramientas
                  </p>
                  <div className="mt-2 text-xs text-blue-700">
                    {selectedHerramientas.map(h => h.nombre).join(', ')}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:space-x-3 pt-4 sm:pt-6 border-t mt-4 sm:mt-6">
                <button
                  onClick={() => {
                    setShowSolicitudHerramientasModal(false)
                    setSelectedHerramientas([])
                    setNuevaSolicitudHerramienta({
                      herramientaId: '',
                      fechaDevolucionPrevista: '',
                      motivo: '',
                      observaciones: ''
                    })
                    setBusquedaHerramientasModal('')
                  }}
                  className="btn-secondary text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmitNuevaSolicitudHerramienta}
                  className="btn-primary text-sm"
                  disabled={selectedHerramientas.length === 0}
                >
                  🔧 Crear Solicitud
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ver Detalles */}
      {showDetallesModal && herramientaSeleccionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                  🛠️ Detalles de la Herramienta
                </h3>
                <button
                  onClick={() => {
                    setShowDetallesModal(false)
                    setHerramientaSeleccionada(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {/* Información General */}
                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base">📋 Información General</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500">Nombre</label>
                      <p className="text-sm text-gray-900 font-medium">{herramientaSeleccionada.nombre}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500">Código</label>
                      <p className="text-sm text-gray-900 font-mono">{herramientaSeleccionada.codigo}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500">Categoría</label>
                      <p className="text-sm text-gray-900">{herramientaSeleccionada.categoriaNombre || 'Sin categoría'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500">Estado</label>
                      <div className="mt-1">{getEstadoBadge(herramientaSeleccionada.estado)}</div>
                    </div>
                  </div>
                </div>

                {/* Detalles Técnicos */}
                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base">🔧 Detalles Técnicos</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500">Marca</label>
                      <p className="text-sm text-gray-900">{herramientaSeleccionada.marca || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500">Modelo</label>
                      <p className="text-sm text-gray-900">{herramientaSeleccionada.modelo || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500">Cantidad</label>
                      <p className="text-sm text-gray-900">{herramientaSeleccionada.cantidad || 1}</p>
                    </div>
                    {canViewPrices(user) && (
                      <div>
                        <label className="text-xs font-medium text-gray-500">Valor</label>
                        <p className="text-sm text-gray-900 font-semibold">
                          {herramientaSeleccionada.valor ? `S/ ${herramientaSeleccionada.valor.toFixed(2)}` : 'N/A'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Fecha de Admisión */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3">📅 Fecha de Admisión</h4>
                  <p className="text-sm text-gray-900">{herramientaSeleccionada.fechaAdmision || 'N/A'}</p>
                </div>

                {/* Descripción */}
                {herramientaSeleccionada.descripcion && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2">📝 Descripción</h4>
                    <p className="text-sm text-gray-600">{herramientaSeleccionada.descripcion}</p>
                  </div>
                )}

                {/* Imagen */}
                {herramientaSeleccionada.imagen && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2">📷 Imagen</h4>
                    <img
                      src={getFileUrl(herramientaSeleccionada.imagen)}
                      alt={herramientaSeleccionada.nombre}
                      className="w-full h-48 object-cover rounded-lg border"
                    />
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:space-x-3 pt-4 sm:pt-6 border-t mt-4 sm:mt-6">
                <button
                  onClick={() => {
                    setShowDetallesModal(false)
                    setHerramientaSeleccionada(null)
                  }}
                  className="btn-secondary text-sm"
                >
                  Cerrar
                </button>
                {user?.role === 'admin' && (
                  <button
                    onClick={() => {
                      setShowDetallesModal(false)
                      setShowEditarModal(true)
                    }}
                    className="btn-primary text-sm"
                  >
                    ✏️ Editar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Herramienta */}
      {showEditarModal && herramientaSeleccionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                  ✏️ Editar Herramienta
                </h3>
                <button
                  onClick={() => {
                    setShowEditarModal(false)
                    setHerramientaSeleccionada(null)
                    setImagenEditarFile(null)
                    setImagenEditarPreview(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {/* Información General */}
                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base">📋 Información General</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                      <input
                        type="text"
                        value={herramientaSeleccionada.nombre}
                        onChange={(e) => setHerramientaSeleccionada({
                          ...herramientaSeleccionada,
                          nombre: e.target.value
                        })}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                      <input
                        type="text"
                        value={herramientaSeleccionada.codigo}
                        disabled
                        className="input-field bg-gray-100"
                        title="El código no se puede editar"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                      <select
                        value={herramientaSeleccionada.categoriaId || ''}
                        onChange={(e) => setHerramientaSeleccionada({
                          ...herramientaSeleccionada,
                          categoriaId: e.target.value ? parseInt(e.target.value) : null
                        })}
                        className="input-field"
                      >
                        <option value="">Sin categoría</option>
                        {categorias.map(categoria => (
                          <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                      <select
                        value={herramientaSeleccionada.estado}
                        onChange={(e) => setHerramientaSeleccionada({
                          ...herramientaSeleccionada,
                          estado: e.target.value
                        })}
                        className="input-field"
                      >
                        <option value="available">Disponible</option>
                        <option value="assigned">Asignado</option>
                        <option value="maintenance">Mantenimiento</option>
                        <option value="out_of_service">Fuera de Servicio</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Detalles Técnicos */}
                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base">🔧 Detalles Técnicos</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
                      <input
                        type="text"
                        value={herramientaSeleccionada.marca || ''}
                        onChange={(e) => setHerramientaSeleccionada({
                          ...herramientaSeleccionada,
                          marca: e.target.value
                        })}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
                      <input
                        type="text"
                        value={herramientaSeleccionada.modelo || ''}
                        onChange={(e) => setHerramientaSeleccionada({
                          ...herramientaSeleccionada,
                          modelo: e.target.value
                        })}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
                      <input
                        type="number"
                        min="1"
                        value={herramientaSeleccionada.cantidad || 1}
                        onChange={(e) => setHerramientaSeleccionada({
                          ...herramientaSeleccionada,
                          cantidad: parseInt(e.target.value)
                        })}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Valor (S/)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={herramientaSeleccionada.valor || 0}
                        onChange={(e) => setHerramientaSeleccionada({
                          ...herramientaSeleccionada,
                          valor: parseFloat(e.target.value)
                        })}
                        className="input-field"
                      />
                    </div>
                  </div>
                </div>

                {/* Descripción */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">📝 Descripción</h4>
                  <textarea
                    value={herramientaSeleccionada.descripcion || ''}
                    onChange={(e) => setHerramientaSeleccionada({
                      ...herramientaSeleccionada,
                      descripcion: e.target.value
                    })}
                    rows="3"
                    className="input-field"
                    placeholder="Descripción de la herramienta..."
                  />
                </div>

                {/* Imagen de la Herramienta (Opcional) */}
                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base">📷 Imagen</h4>
                  {imagenEditarPreview ? (
                    <div className="relative">
                      <img src={imagenEditarPreview} alt="Preview" className="w-full h-48 object-cover rounded-lg border" />
                      <button
                        type="button"
                        onClick={() => { setImagenEditarFile(null); setImagenEditarPreview(null) }}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 shadow-lg"
                      >
                        ✕
                      </button>
                    </div>
                  ) : herramientaSeleccionada.imagen ? (
                    <div className="relative">
                      <img src={getFileUrl(herramientaSeleccionada.imagen)} alt={herramientaSeleccionada.nombre} className="w-full h-48 object-cover rounded-lg border" />
                      <div className="absolute bottom-2 right-2 flex gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            const result = await MySwal.fire({ title: 'Eliminar imagen', text: 'Se eliminará la imagen de la herramienta', icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc2626', cancelButtonColor: '#6b7280', confirmButtonText: 'Eliminar', cancelButtonText: 'Cancelar' })
                            if (result.isConfirmed) {
                              try {
                                await updateHerramienta(herramientaSeleccionada.id, {}, null, true)
                                setHerramientaSeleccionada({ ...herramientaSeleccionada, imagen: null })
                                MySwal.fire({ title: 'Imagen eliminada', icon: 'success', timer: 1500, showConfirmButton: false })
                              } catch (e) { MySwal.fire({ title: 'Error', text: e.message, icon: 'error' }) }
                            }
                          }}
                          className="bg-red-500 text-white rounded-lg px-3 py-1 text-sm hover:bg-red-600 shadow-lg"
                        >
                          Eliminar
                        </button>
                        <label className="bg-blue-600 text-white rounded-lg px-3 py-1 text-sm cursor-pointer hover:bg-blue-700 shadow-lg">
                          Cambiar
                          <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                      <div className="text-center">
                        <span className="text-2xl block mb-1">📷</span>
                        <span className="text-sm text-gray-500">Click para seleccionar imagen</span>
                        <span className="text-xs text-gray-400 block">JPG, PNG (máx. 10MB)</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageChange}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:space-x-3 pt-4 sm:pt-6 border-t mt-4 sm:mt-6">
                <button
                  onClick={() => {
                    setShowEditarModal(false)
                    setHerramientaSeleccionada(null)
                    setImagenEditarFile(null)
                    setImagenEditarPreview(null)
                  }}
                  className="btn-secondary text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardarEdicion}
                  className="btn-primary text-sm"
                >
                  💾 Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Gestión de Categorías */}
      {showCategoriasModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                  🏷️ Gestión de Categorías
                </h3>
                <button
                  onClick={() => {
                    setShowCategoriasModal(false)
                    setNuevaCategoria({ nombre: '', prefijo: '' })
                    setCategoriaEditando(null)
                    setCategoriaEditandoNombre('')
                    setCategoriaEditandoPrefijo('')
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {/* Agregar nueva categoría */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">
                  ➕ Agregar Nueva Categoría
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre de la categoría <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={nuevaCategoria.nombre}
                      onChange={(e) => setNuevaCategoria({ ...nuevaCategoria, nombre: e.target.value })}
                      placeholder="Ej: Herramientas Eléctricas"
                      className="w-full input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prefijo (para códigos) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={nuevaCategoria.prefijo}
                      onChange={(e) => setNuevaCategoria({ ...nuevaCategoria, prefijo: e.target.value.toUpperCase() })}
                      placeholder="Ej: ELEC"
                      maxLength="4"
                      className="w-full input-field uppercase"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      El prefijo se usará para generar códigos automáticos (máx. 4 caracteres)
                    </p>
                  </div>
                  <button
                    onClick={handleAddCategoria}
                    className="btn-primary w-full"
                    disabled={!nuevaCategoria.nombre.trim() || !nuevaCategoria.prefijo.trim() || isLoading}
                  >
                    {isLoading ? 'Agregando...' : '➕ Agregar Categoría'}
                  </button>
                </div>
              </div>

              {/* Lista de categorías */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">
                  📋 Categorías Existentes ({categorias.length})
                </h4>
                <div className="space-y-2">
                  {categorias.map((categoria) => {
                    const herramientasEnCategoria = herramientas.filter(h => h.categoriaNombre === categoria.nombre).length
                    return (
                      <div key={categoria.id} className="bg-gray-50 p-4 rounded-lg border">
                        <div className="flex items-center justify-between">
                          {categoriaEditando?.id === categoria.id ? (
                            // Edit mode
                            <div className="flex-1 flex flex-col space-y-2">
                              <div className="flex flex-col sm:flex-row gap-2 sm:space-x-3">
                                <div className="flex-1">
                                  <label className="block text-xs text-gray-600 mb-1">Nombre</label>
                                  <input
                                    type="text"
                                    value={categoriaEditandoNombre}
                                    onChange={(e) => setCategoriaEditandoNombre(e.target.value)}
                                    className="w-full px-3 py-1 border border-gray-300 rounded-md"
                                    placeholder="Nombre de la categoría"
                                    autoFocus
                                  />
                                </div>
                                <div className="w-full sm:w-32">
                                  <label className="block text-xs text-gray-600 mb-1">Prefijo</label>
                                  <input
                                    type="text"
                                    value={categoriaEditandoPrefijo}
                                    onChange={(e) => setCategoriaEditandoPrefijo(e.target.value.toUpperCase())}
                                    className="w-full px-3 py-1 border border-gray-300 rounded-md uppercase"
                                    placeholder="ELEC"
                                    maxLength="4"
                                  />
                                </div>
                                <div className="flex space-x-2 items-end">
                                  <button
                                    onClick={handleEditCategoria}
                                    className="text-sm px-3 py-1 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg transition-colors"
                                    disabled={isLoading}
                                  >
                                    ✓
                                  </button>
                                  <button
                                    onClick={cancelEditCategoria}
                                    className="text-sm px-3 py-1 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            // Display mode
                            <>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2">
                                  <h5 className="font-medium text-gray-900 truncate">{categoria.nombre}</h5>
                                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-mono rounded flex-shrink-0">
                                    {categoria.prefijo}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600">
                                  {herramientasEnCategoria} herramienta{herramientasEnCategoria !== 1 ? 's' : ''}
                                </p>
                              </div>
                              <div className="flex space-x-2 flex-shrink-0">
                                <button
                                  onClick={() => startEditCategoria(categoria)}
                                  className="text-xs sm:text-sm px-2 sm:px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition-colors"
                                  title="Editar categoría"
                                >
                                  ✏️ <span className="hidden sm:inline">Editar</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteCategoria(categoria.id)}
                                  className="text-xs sm:text-sm px-2 sm:px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition-colors"
                                  title="Eliminar categoría"
                                  disabled={herramientasEnCategoria > 0}
                                >
                                  🗑️ <span className="hidden sm:inline">Eliminar</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                        {herramientasEnCategoria > 0 && categoriaEditando?.id !== categoria.id && (
                          <div className="mt-2 text-xs text-yellow-600">
                            ⚠️ Esta categoría tiene herramientas asociadas y no puede ser eliminada.
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {categorias.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">🏷️</div>
                    <p>No hay categorías registradas</p>
                    <p className="text-sm">Crea tu primera categoría arriba</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end pt-6 border-t mt-6">
                <button
                  onClick={() => {
                    setShowCategoriasModal(false)
                    setNuevaCategoria({ nombre: '', prefijo: '' })
                    setCategoriaEditando(null)
                    setCategoriaEditandoNombre('')
                    setCategoriaEditandoPrefijo('')
                  }}
                  className="btn-secondary"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Herramientas