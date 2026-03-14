import { useEffect, useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import useOrdenesStore from '../../stores/ordenesStore'
import useReportesStore from '../../stores/reportesStore'
import useMaterialesStore from '../../stores/materialesStore'
import useAuthStore from '../../stores/authStore'
import { isTecnico } from '../../utils/roleUtils'
import { canViewPrices } from '../../utils/permissionsUtils'
import { API_BASE_URL, getFileUrl } from '../../config/api'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import Timeline from '../../components/ui/Timeline'
import EstimacionTecnico from '../../components/ordenes/EstimacionTecnico'
import InformeFinal from '../../components/informes/InformeFinal'
import RecursosServicio from '../../components/ordenes/RecursosServicio'
import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'

const MySwal = withReactContent(Swal)

const OrdenDetalle = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { ordenes, fetchOrdenes, actualizarRecursos, fetchHistorial } = useOrdenesStore()
  const fetchReportesByOrden = useReportesStore(state => state.fetchReportesByOrden)
  const puedeEditarReporte = useReportesStore(state => state.puedeEditarReporte)
  const getInformeFinalByOrden = useReportesStore(state => state.getInformeFinalByOrden)
  const reportes = useReportesStore(state => state.reportes[id] || [])
  const { puedesolicitarMateriales, fetchMateriales, materiales, createSolicitud } = useMaterialesStore()
  const { user } = useAuthStore()
  const [orden, setOrden] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('general')
  const [showMaterialModal, setShowMaterialModal] = useState(false)
  const [showEstimacionModal, setShowEstimacionModal] = useState(false)
  const [informeFinal, setInformeFinal] = useState(null)
  const [recursosServicio, setRecursosServicio] = useState({})
  const [historialOrden, setHistorialOrden] = useState([])
  const [loadingHistorial, setLoadingHistorial] = useState(false)
  const [materialRequest, setMaterialRequest] = useState({
    materiales: [],
    prioridad: 'media',
    observaciones: ''
  })
  const [selectedMaterials, setSelectedMaterials] = useState([])

  // Función helper para mostrar galería de fotos con navegación
  const mostrarGaleriaFotos = (fotos, indiceInicial, reporteId, tipoFoto) => {
    let indiceActual = indiceInicial

    const mostrarFoto = (indice) => {
      const foto = fotos[indice]
      const totalFotos = fotos.length
      const esUltimaFoto = indice === totalFotos - 1
      const esPrimeraFoto = indice === 0

      MySwal.fire({
        title: `${reporteId} - ${tipoFoto === 'antes' ? 'Antes del trabajo' : 'Después del trabajo'}`,
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
            <img
              src="${getFileUrl(foto.url || foto)}"
              alt="${tipoFoto === 'antes' ? 'Antes' : 'Después'} - ${indice + 1}"
              style="max-width: 100%; max-height: 70vh; object-fit: contain; display: block; margin: 0 auto;"
            />
            <div style="margin-top: 12px; color: #6b7280; font-size: 14px; text-align: center;">
              ${foto.nombre || `Foto ${indice + 1}`}
            </div>
            <div style="margin-top: 8px; color: #9ca3af; font-size: 12px; text-align: center;">
              Foto ${indice + 1} de ${totalFotos}
            </div>
          </div>
        `,
        showCloseButton: true,
        showConfirmButton: false,
        width: window.innerWidth < 640 ? '95%' : '800px',
        padding: window.innerWidth < 640 ? '12px' : '20px',
        showDenyButton: !esPrimeraFoto,
        showCancelButton: !esUltimaFoto,
        denyButtonText: '← Anterior',
        cancelButtonText: 'Siguiente →',
        customClass: {
          denyButton: 'swal2-styled swal2-deny',
          cancelButton: 'swal2-styled swal2-cancel',
        },
        buttonsStyling: true,
      }).then((result) => {
        if (result.isDenied && !esPrimeraFoto) {
          // Ir a foto anterior
          indiceActual = indice - 1
          mostrarFoto(indiceActual)
        } else if (result.dismiss === Swal.DismissReason.cancel && !esUltimaFoto) {
          // Ir a foto siguiente
          indiceActual = indice + 1
          mostrarFoto(indiceActual)
        }
      })
    }

    mostrarFoto(indiceActual)
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchOrdenes()
        const foundOrden = ordenes.find(o => o.id === id)
        if (foundOrden) {
          setOrden(foundOrden)
          setRecursosServicio(foundOrden.recursos || {})
          await fetchReportesByOrden(id)
          const informe = getInformeFinalByOrden(id)
          setInformeFinal(informe)
        }
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [id, fetchOrdenes, fetchReportesByOrden, ordenes, getInformeFinalByOrden])

  // Cargar historial cuando se selecciona el tab de historial
  useEffect(() => {
    const loadHistorial = async () => {
      if (activeTab === 'timeline' && id) {
        setLoadingHistorial(true)
        try {
          const historial = await fetchHistorial(id)
          setHistorialOrden(historial)
        } catch (error) {
          console.error('Error al cargar historial:', error)
          setHistorialOrden([])
        } finally {
          setLoadingHistorial(false)
        }
      }
    }
    loadHistorial()
  }, [activeTab, id, fetchHistorial])

  const getEstadoBadge = (estado) => {
    const estilos = {
      pending: 'status-badge status-pending',
      in_progress: 'status-badge status-progress',
      completed: 'status-badge status-completed'
    }
    const textos = {
      pending: 'Pendiente',
      in_progress: 'En Proceso',
      completed: 'Completada'
    }
    return (
      <span className={estilos[estado] || 'status-badge status-pending'}>
        {textos[estado] || estado}
      </span>
    )
  }

  const handleRecursosChange = useCallback(async (nuevosRecursos) => {
    setRecursosServicio(nuevosRecursos)

    // Guardar automáticamente los cambios en el store
    if (orden?.id) {
      try {
        await actualizarRecursos(orden.id, nuevosRecursos)
      } catch (error) {
        // Error al actualizar recursos
      }
    }
  }, [orden?.id, actualizarRecursos])

  const handleCloseInforme = useCallback(() => {
    setActiveTab('general')
  }, [])

  const handleEditarOrden = () => {
    // Navigate to edit order page
    navigate(`/ordenes/${id}/editar`)
  }

  const handleSubmitMaterialRequest = async () => {
    if (selectedMaterials.length === 0) {
      MySwal.fire({
        title: 'Error',
        text: 'Debe seleccionar al menos un material',
        icon: 'error',
        confirmButtonColor: '#1e40af'
      })
      return
    }

    try {
      const solicitudData = {
        ordenId: orden.id,
        solicitante: user?.name || 'Usuario',
        prioridad: materialRequest.prioridad,
        materiales: selectedMaterials.map(material => ({
          materialId: material.id,
          nombre: material.nombre,
          cantidadSolicitada: material.cantidadSolicitada,
          observaciones: material.observaciones || ''
        })),
        observacionesGenerales: materialRequest.observaciones
      }

      await createSolicitud(solicitudData, orden)
      
      MySwal.fire({
        title: '¡Solicitud enviada!',
        text: 'La solicitud de materiales ha sido enviada correctamente',
        icon: 'success',
        confirmButtonColor: '#1e40af'
      })

      // Reset form and close modal
      setMaterialRequest({ materiales: [], prioridad: 'media', observaciones: '' })
      setSelectedMaterials([])
      setShowMaterialModal(false)
      
    } catch (error) {
      MySwal.fire({
        title: 'Error',
        text: error.message || 'No se pudo enviar la solicitud de materiales',
        icon: 'error',
        confirmButtonColor: '#1e40af'
      })
    }
  }

  const handleAddMaterial = (material) => {
    const existingIndex = selectedMaterials.findIndex(m => m.id === material.id)
    
    if (existingIndex >= 0) {
      // Update existing material quantity
      const updated = [...selectedMaterials]
      updated[existingIndex] = {
        ...updated[existingIndex],
        cantidadSolicitada: (updated[existingIndex].cantidadSolicitada || 1) + 1
      }
      setSelectedMaterials(updated)
    } else {
      // Add new material
      setSelectedMaterials([...selectedMaterials, {
        ...material,
        cantidadSolicitada: 1,
        observaciones: ''
      }])
    }
  }

  const handleRemoveMaterial = (materialId) => {
    setSelectedMaterials(selectedMaterials.filter(m => m.id !== materialId))
  }

  const handleUpdateMaterialQuantity = (materialId, quantity) => {
    const updated = selectedMaterials.map(material =>
      material.id === materialId ? { ...material, cantidadSolicitada: Math.max(1, quantity) } : material
    )
    setSelectedMaterials(updated)
  }

  const handleSolicitarMateriales = async () => {
    if (!orden) return

    // Verificar si puede solicitar materiales
    const validacion = puedesolicitarMateriales(orden)
    if (!validacion.permitido) {
      MySwal.fire({
        title: 'No permitido',
        html: `
          <div class="text-left">
            <p class="mb-3">${validacion.motivo}</p>
            <div class="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <h4 class="font-medium text-amber-800 mb-2">¿Qué debo hacer?</h4>
              <p class="text-sm text-amber-700">Para proyectos sin visita técnica, primero debe cambiar el estado de la orden a "En Proceso" para poder solicitar materiales.</p>
            </div>
          </div>
        `,
        icon: 'warning',
        confirmButtonColor: '#1e40af'
      })
      return
    }

    // Cargar materiales si no están cargados
    if (materiales.length === 0) {
      await fetchMateriales()
    }

    setShowMaterialModal(true)
  }

  const getPrioridadColor = (prioridad) => {
    const colores = {
      baja: 'text-green-600 bg-green-50',
      media: 'text-yellow-600 bg-yellow-50',
      alta: 'text-red-600 bg-red-50'
    }
    return colores[prioridad] || 'text-gray-600 bg-gray-50'
  }

  // Helper para extraer descripción legible de JSON
  const parseNewValue = (value) => {
    if (!value) return null
    try {
      const parsed = JSON.parse(value)
      // Si tiene work_description, usarlo
      if (parsed.work_description) return parsed.work_description
      // Si no, devolver null para no mostrar JSON crudo
      return null
    } catch {
      // Si no es JSON, devolver el valor tal cual (es texto plano)
      return value
    }
  }

  // Transformar historial del backend al formato del Timeline
  const timelineEvents = (historialOrden || []).map(item => {
    // Si es un reporte diario (de la tabla daily_reports)
    if (item.source === 'report') {
      const descripcion = parseNewValue(item.new_value) || item.new_value
      return {
        id: item.id,
        type: 'report',
        title: item.action_description,
        description: descripcion ? `${descripcion.substring(0, 200)}${descripcion.length > 200 ? '...' : ''}` : null,
        timestamp: item.created_at,
        user: item.user_name,
        role: 'Técnico',
        notes: null
      }
    }

    // Si es un evento de reporte creado (del historial)
    if (item.action_type === 'report_created') {
      const descripcion = parseNewValue(item.new_value)
      return {
        id: item.id,
        type: 'report',
        title: item.action_description,
        description: descripcion ? `${descripcion.substring(0, 200)}${descripcion.length > 200 ? '...' : ''}` : null,
        timestamp: item.created_at,
        user: item.user_name,
        role: 'Técnico',
        notes: null
      }
    }

    // Si es subida de fotos
    if (item.action_type === 'photos_uploaded') {
      return {
        id: item.id,
        type: 'photo',
        title: item.action_description,
        description: null,
        timestamp: item.created_at,
        user: item.user_name,
        role: item.user_email ? 'Usuario registrado' : 'Sistema',
        notes: null
      }
    }

    // Para eventos de creación, no mostrar el JSON en notas
    if (item.action_type === 'created') {
      return {
        id: item.id,
        type: item.action_type,
        title: item.action_description,
        description: null,
        timestamp: item.created_at,
        user: item.user_name,
        role: item.user_email ? 'Usuario registrado' : 'Sistema',
        notes: null
      }
    }

    // Para otros eventos del historial normal
    return {
      id: item.id,
      type: item.action_type,
      title: item.action_description,
      description: item.field_changed && item.old_value
        ? `Cambio: "${item.old_value}" → "${item.new_value}"`
        : null,
      timestamp: item.created_at,
      user: item.user_name,
      role: item.user_email ? 'Usuario registrado' : 'Sistema',
      notes: null
    }
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-corporate-blue"></div>
      </div>
    )
  }

  if (!orden) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl text-gray-400 mb-4">🔍</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Orden no encontrada</h2>
        <p className="text-gray-600 mb-6">La orden que buscas no existe o fue eliminada.</p>
        <Link to="/ordenes" className="btn-primary">
          Volver a Órdenes de trabajo
        </Link>
      </div>
    )
  }

  // Verificar si la orden está completada
  const ordenCompletada = orden?.estado === 'completed'

  const tabs = [
    { id: 'general', name: 'General', icon: '📋' },
    { id: 'timeline', name: 'Historial', icon: '⏰' },
    // Nueva pestaña combinada solo para admin y supervisor
    ...(user?.role === 'admin' || user?.role === 'supervisor' ? [
      { id: 'reportes-fotos', name: 'Reportes y Fotografías', icon: '📊📸' }
    ] : []),
    { id: 'materiales', name: ordenCompletada ? 'Materiales (Solo lectura)' : 'Materiales', icon: '📦', readOnly: ordenCompletada },
    { id: 'informe', name: 'Informe Final', icon: '📄' }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        {/* Fila 1: Navegación */}
        <Link to="/ordenes" className="inline-flex items-center text-sm text-gray-500 hover:text-corporate-blue">
          ← Volver a órdenes
        </Link>

        {/* Fila 2: Título + Acciones */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Izquierda: ID y Estado */}
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{orden.id}</h1>
            {getEstadoBadge(orden.estado)}
          </div>

          {/* Derecha: Botones de acción - Solo mostrar si la orden NO está completada */}
          <div className="flex flex-wrap gap-2">
            {orden.estado !== 'completed' && (
              <>
                <Link to={`/reportes/nuevo/${orden.id}`} className="btn-secondary text-sm">
                  Nuevo Reporte
                </Link>

                {orden.tecnicoAsignado &&
                 orden.estadoAprobacion === 'pendiente_estimacion' &&
                 user?.name &&
                 orden.tecnicoAsignado.includes(user.name) && (
                  <button
                    onClick={() => setShowEstimacionModal(true)}
                    className="btn-secondary text-sm"
                  >
                    Crear Estimación
                  </button>
                )}

                <button
                  onClick={handleSolicitarMateriales}
                  disabled={!puedesolicitarMateriales(orden).permitido}
                  className={`btn-secondary text-sm ${
                    !puedesolicitarMateriales(orden).permitido ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  title={!puedesolicitarMateriales(orden).permitido ? puedesolicitarMateriales(orden).motivo : ''}
                >
                  Solicitar Materiales
                </button>

                {!isTecnico(user) && (
                  <button onClick={handleEditarOrden} className="btn-primary text-sm">
                    Editar Orden
                  </button>
                )}
              </>
            )}

            {/* Indicador visual cuando la orden está completada */}
            {(orden.estado === 'completed') && (
              <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-lg flex items-center gap-1">
                Orden Completada
              </span>
            )}
          </div>
        </div>

        {/* Información de Visita Técnica - Solo si está basada en una */}
        {orden.basadoEnVisitaTecnica && orden.visitaTecnicaId && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm space-y-2">
            {/* Fila 1: Visita Técnica y Proyecto */}
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              <div>
                <span className="text-blue-600 font-medium">Visita Técnica:</span>{' '}
                <span className="text-blue-900">{orden.visitaTecnicaId}</span>
              </div>
              {orden.nombreProyecto && (
                <div>
                  <span className="text-blue-600 font-medium">Proyecto:</span>{' '}
                  <span className="text-blue-900">{orden.nombreProyecto}</span>
                </div>
              )}
            </div>

            {/* Fila 2: Herramientas */}
            {orden.herramientasRequeridas?.length > 0 && (
              <div>
                <span className="text-blue-600 font-medium">Herramientas:</span>{' '}
                <span className="text-blue-900">
                  {orden.herramientasRequeridas.map(h => h.nombre || h.name || h).join(', ')}
                </span>
              </div>
            )}

            {/* Fila 3: Materiales */}
            {(orden.materialesEstimados?.length > 0 || orden.materialesSeleccionados?.length > 0) && (
              <div>
                <span className="text-blue-600 font-medium">Materiales:</span>{' '}
                <span className="text-blue-900">
                  {(orden.materialesEstimados?.length > 0 ? orden.materialesEstimados : orden.materialesSeleccionados)
                    .map(m => m.nombre || m.name || m).join(', ')}
                </span>
              </div>
            )}

            {/* Fila 4: Personal */}
            {orden.listaPersonal?.length > 0 && (
              <div>
                <span className="text-blue-600 font-medium">Personal:</span>{' '}
                <span className="text-blue-900">
                  {orden.listaPersonal.map(p => `${p.especialidad || p.nombre || p}: ${p.cantidad || p.dias || 1}`).join(', ')}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Progreso</p>
              <p className="text-xl sm:text-2xl font-bold text-corporate-blue">{orden.porcentajeAvance}%</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-xl">📊</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-corporate-blue h-2 rounded-full transition-all duration-500"
                style={{ width: `${orden.porcentajeAvance}%` }}
              />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Prioridad</p>
              <p className={`text-lg font-bold px-3 py-1 rounded-full ${getPrioridadColor(orden.prioridad)}`}>
                {orden.prioridad?.toUpperCase()}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <span className="text-xl">⚡</span>
            </div>
          </div>
        </div>

        {user?.role === 'admin' && (
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Costo Estimado</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">
                  S/{(() => {
                    const totalMateriales = recursosServicio.materiales?.reduce((total, mat) =>
                      total + ((parseFloat(mat.cantidad) || 0) * (parseFloat(mat.precio) || 0)), 0
                    ) || 0
                    const totalHerramientas = recursosServicio.herramientas?.reduce((total, her) =>
                      total + ((parseFloat(her.cantidad) || 0) * (parseFloat(her.precio) || 0)), 0
                    ) || 0
                    const totalCalculado = totalMateriales + totalHerramientas
                    // Usar el total calculado si hay recursos, sino usar el costo estimado de la orden
                    return (totalCalculado > 0 ? totalCalculado : (orden.costoEstimado || 0)).toFixed(2)
                  })()}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-xl">💰</span>
              </div>
            </div>
          </div>
        )}

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Vencimiento</p>
              <p className="text-lg font-medium text-gray-900">{orden.fechaVencimiento ? format(new Date(orden.fechaVencimiento), 'dd/MM/yyyy', { locale: es }) : '-'}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <span className="text-xl">📅</span>
            </div>
          </div>
        </div>
      </div>

      {/* Alerta de restricción de materiales - Solo para órdenes sin visita técnica */}
      {orden.tipoVisita !== 'con_visita' && !orden.basadoEnVisitaTecnica && !orden.visitaTecnicaId && (orden.estado === 'pending') && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-amber-400 text-xl">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-amber-800">
                Restricción de Materiales - Proyecto Sin Visita Técnica
              </h3>
              <p className="text-sm text-amber-700 mt-1">
                Este proyecto no permite solicitar materiales hasta que sea iniciado.
                Para solicitar materiales, primero cambie el estado de la orden a "En Proceso".
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Badge de tipo de visita */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
        {(() => {
          const tieneVisitaTecnica = orden.tipoVisita === 'con_visita' || orden.basadoEnVisitaTecnica || orden.visitaTecnicaId
          return (
            <>
              <div className={`px-3 py-2 rounded-lg text-sm font-medium ${
                tieneVisitaTecnica
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-green-100 text-green-800'
              }`}>
                {tieneVisitaTecnica ? '🔧 Con Visita Técnica' : '💻 Sin Visita Técnica'}
              </div>

              {!tieneVisitaTecnica && (
                <div className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  puedesolicitarMateriales(orden).permitido
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {puedesolicitarMateriales(orden).permitido
                    ? '✅ Puede solicitar materiales'
                    : '❌ No puede solicitar materiales'}
                </div>
              )}
            </>
          )
        })()}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex overflow-x-auto space-x-4 sm:space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-corporate-blue text-corporate-blue'
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
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === 'general' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Información de la Orden
                </h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Cliente</dt>
                    <dd className="text-sm text-gray-900">{orden.cliente}</dd>
                  </div>
                  {orden.numeroOrdenCompra && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Orden de Compra</dt>
                      <dd className="text-sm text-gray-900">{orden.numeroOrdenCompra}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Tipo de Servicio</dt>
                    <dd className="text-sm text-gray-900">{orden.tipoServicio}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Ubicación</dt>
                    <dd className="text-sm text-gray-900">{orden.ubicacion}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Técnico Asignado</dt>
                    <dd className="text-sm text-gray-900">{orden.tecnicoAsignado}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Fecha de Creación</dt>
                    <dd className="text-sm text-gray-900">{orden.fechaCreacion}</dd>
                  </div>
                </dl>
              </div>

              {/* Card de Materiales */}
              <div className="card">
              {(() => {
                const tieneVisitaTecnica = orden.tipoVisita === 'con_visita' || orden.basadoEnVisitaTecnica || orden.visitaTecnicaId
                return (
                  <>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Materiales {tieneVisitaTecnica ? 'Requeridos' : 'Asignados'}
                    </h3>

                    {/* Materiales seleccionados para órdenes sin visita */}
                    {!tieneVisitaTecnica && orden.materialesSeleccionados?.length > 0 ? (
                <div className="space-y-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-blue-800">
                      <strong>Materiales asignados del inventario:</strong> Estos materiales fueron seleccionados
                      al crear la orden y se descontarán del inventario al completar el trabajo.
                    </p>
                  </div>
                  {orden.materialesSeleccionados.map((material) => (
                    <div key={material.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{material.nombre}</p>
                          <p className="text-sm text-gray-600">
                            {material.cantidad} {material.unidad}
                            {canViewPrices(user) && <> x S/{material.precioUnitario.toFixed(2)}</>}
                          </p>
                        </div>
                        {canViewPrices(user) && (
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">
                              S/{(material.cantidad * material.precioUnitario).toFixed(2)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {canViewPrices(user) && (
                    <div className="border-t pt-3">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-900">Total Materiales:</span>
                        <span className="text-lg font-bold text-blue-600">
                          S/{orden.materialesSeleccionados.reduce((total, mat) =>
                            total + (mat.cantidad * mat.precioUnitario), 0
                          ).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                    ) : orden.materialesRequeridos?.length > 0 ? (
                      <ul className="space-y-2">
                        {orden.materialesRequeridos.map((material, index) => (
                          <li key={index} className="flex items-center space-x-2">
                            <span className="text-green-500">✓</span>
                            <span className="text-sm text-gray-900">{material}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-500 text-sm">No se especificaron materiales</p>
                    )}
                  </>
                )
              })()}
            </div>
            </div>

            {/* Card de Herramientas */}
            <div className="grid grid-cols-1 gap-6 mt-6">
              <div className="card">
              {(() => {
                const tieneVisitaTecnica = orden.tipoVisita === 'con_visita' || orden.basadoEnVisitaTecnica || orden.visitaTecnicaId
                return (
                  <>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Herramientas {tieneVisitaTecnica ? 'Requeridas' : 'Asignadas'}
                    </h3>

                    {/* Herramientas seleccionadas para órdenes sin visita */}
                    {!tieneVisitaTecnica && orden.herramientasSeleccionadas?.length > 0 ? (
                      <div className="space-y-3">
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                          <p className="text-sm text-yellow-800">
                            <strong>Herramientas asignadas:</strong> Estas herramientas fueron seleccionadas
                            al crear la orden para la ejecución del trabajo.
                          </p>
                        </div>
                        {orden.herramientasSeleccionadas.map((herramienta, index) => (
                          <div key={herramienta.id || index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-gray-900">{herramienta.nombre}</p>
                                <p className="text-sm text-gray-600">
                                  {herramienta.cantidadSolicitada || herramienta.cantidad || 1} unidad(es)
                                  {canViewPrices(user) && <> x S/{(herramienta.valor || 0).toFixed(2)}</>}
                                </p>
                              </div>
                              {canViewPrices(user) && (
                                <div className="text-right">
                                  <p className="font-semibold text-gray-900">
                                    S/{((herramienta.cantidadSolicitada || herramienta.cantidad || 1) * (herramienta.valor || 0)).toFixed(2)}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        {canViewPrices(user) && (
                          <div className="border-t pt-3">
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-gray-900">Total Herramientas:</span>
                              <span className="text-lg font-bold text-yellow-600">
                                S/{orden.herramientasSeleccionadas.reduce((total, her) =>
                                  total + ((her.cantidadSolicitada || her.cantidad || 1) * (her.valor || 0)), 0
                                ).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : orden.herramientasRequeridas?.length > 0 ? (
                      <ul className="space-y-2">
                        {orden.herramientasRequeridas.map((herramienta, index) => (
                          <li key={index} className="flex items-center space-x-2">
                            <span className="text-yellow-500">🔧</span>
                            <span className="text-sm text-gray-900">
                              {typeof herramienta === 'string' ? herramienta : herramienta.nombre || herramienta.name}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-500 text-sm">No se especificaron herramientas</p>
                    )}
                  </>
                )
              })()}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">
              Historial de la Orden
            </h3>
            {loadingHistorial ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-corporate-blue"></div>
                <span className="ml-3 text-gray-600">Cargando historial...</span>
              </div>
            ) : timelineEvents.length > 0 ? (
              <Timeline events={timelineEvents} />
            ) : (
              <div className="text-center py-12">
                <div className="text-4xl text-gray-300 mb-3">📋</div>
                <p className="text-gray-500">No hay historial disponible para esta orden</p>
              </div>
            )}
          </div>
        )}




        {activeTab === 'materiales' && orden && (
          <div className="space-y-6">
            {/* Información del workflow */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-blue-400 text-xl">ℹ️</span>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Gestión de Recursos del Servicio
                  </h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Aquí puedes gestionar los materiales, herramientas y mano de obra necesarios para completar esta orden de trabajo.
                    El sistema calculará automáticamente los costos y tiempos estimados.
                  </p>
                </div>
              </div>
            </div>

            {/* Alerta si la orden está completada */}
            {ordenCompletada && (
              <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">🔒</span>
                  <div>
                    <h4 className="font-medium text-green-800">Orden Completada - Solo Lectura</h4>
                    <p className="text-sm text-green-700">
                      Esta orden ya fue completada y cerrada. Los recursos mostrados son de referencia y no pueden ser modificados.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <RecursosServicio
              recursos={recursosServicio}
              onRecursosChange={handleRecursosChange}
              ordenId={orden.id}
              readOnly={ordenCompletada}
            />

            {/* Resumen de recursos */}
            {(recursosServicio.materiales?.length > 0 || recursosServicio.herramientas?.length > 0 || recursosServicio.manoObra?.personal?.length > 0) && (
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Resumen de Recursos
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900">Materiales</h4>
                    <p className="text-xl sm:text-2xl font-bold text-blue-600">
                      {recursosServicio.materiales?.length || 0}
                    </p>
                    {canViewPrices(user) && (
                      <p className="text-sm text-blue-700">
                        Total: S/{recursosServicio.materiales?.reduce((total, mat) =>
                          total + (mat.cantidad * mat.precio), 0
                        ).toFixed(2) || '0.00'}
                      </p>
                    )}
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h4 className="font-medium text-yellow-900">Herramientas</h4>
                    <p className="text-xl sm:text-2xl font-bold text-yellow-600">
                      {recursosServicio.herramientas?.length || 0}
                    </p>
                    <p className="text-sm text-yellow-700">
                      Unidades: {recursosServicio.herramientas?.reduce((total, her) => 
                        total + her.cantidad, 0
                      ) || 0}
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-medium text-green-900">Personal</h4>
                    <p className="text-xl sm:text-2xl font-bold text-green-600">
                      {recursosServicio.manoObra?.personal?.length || 0}
                    </p>
                    <p className="text-sm text-green-700">
                      {recursosServicio.manoObra?.diasEstimados || 0} días, {recursosServicio.manoObra?.numeroPersonas || 0} personas
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'reportes-fotos' && (user?.role === 'admin' || user?.role === 'supervisor') && (
          <div className="space-y-6">
            {/* Header de la sección combinada */}
            <div className="card">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                    📊📸 Reportes y Fotografías Consolidados
                  </h3>
                  <p className="text-gray-600 mt-1">
                    Vista integrada de todos los reportes diarios con sus fotografías asociadas
                  </p>
                </div>
                {orden.estado !== 'completed' && (
                  <div className="flex space-x-2">
                    <Link
                      to={`/reportes/nuevo/${orden.id}`}
                      className="btn-secondary"
                    >
                      📝 Nuevo Reporte
                    </Link>
                  </div>
                )}
              </div>

              {/* Estadísticas rápidas */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
                <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
                  <div className="flex items-center">
                    <span className="text-xl sm:text-2xl mr-2 sm:mr-3">📊</span>
                    <div>
                      <p className="text-sm text-blue-600">Total Reportes</p>
                      <p className="text-lg sm:text-xl font-bold text-blue-900">
                        {reportes.length || 0}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-green-50 p-3 sm:p-4 rounded-lg">
                  <div className="flex items-center">
                    <span className="text-xl sm:text-2xl mr-2 sm:mr-3">📸</span>
                    <div>
                      <p className="text-sm text-green-600">Total Fotografías</p>
                      <p className="text-lg sm:text-xl font-bold text-green-900">
                        {reportes.reduce((total, reporte) =>
                          total + (reporte.fotosAntes?.length || 0) + (reporte.fotosDespues?.length || 0), 0
                        ) || 0}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-purple-50 p-3 sm:p-4 rounded-lg">
                  <div className="flex items-center">
                    <span className="text-xl sm:text-2xl mr-2 sm:mr-3">⏱️</span>
                    <div>
                      <p className="text-sm text-purple-600">Horas Totales</p>
                      <p className="text-lg sm:text-xl font-bold text-purple-900">
                        {reportes.reduce((total, reporte) => {
                          if (reporte.horasIniciales && reporte.horasFinales) {
                            const inicio = new Date(`2000-01-01 ${reporte.horasIniciales}`)
                            const fin = new Date(`2000-01-01 ${reporte.horasFinales}`)
                            return total + ((fin - inicio) / (1000 * 60 * 60))
                          }
                          return total
                        }, 0).toFixed(1) || '0.0'}h
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-orange-50 p-3 sm:p-4 rounded-lg">
                  <div className="flex items-center">
                    <span className="text-xl sm:text-2xl mr-2 sm:mr-3">📈</span>
                    <div>
                      <p className="text-sm text-orange-600">Progreso Promedio</p>
                      <p className="text-lg sm:text-xl font-bold text-orange-900">
                        {reportes.length > 0
                          ? Math.round(reportes.reduce((sum, r) => sum + r.porcentajeAvance, 0) / reportes.length)
                          : 0}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Vista consolidada de reportes con fotografías */}
            <div className="space-y-6">
              {reportes.length > 0 ? (
                reportes.map((reporte) => (
                  <div key={reporte.id} className="card">
                    <div className="border-l-4 border-blue-500 pl-4">
                      {/* Header del reporte */}
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                        <div>
                          <h4 className="text-base sm:text-lg font-semibold text-gray-900">{reporte.id}</h4>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-gray-600 mt-1">
                            <span>📅 {reporte.fecha}</span>
                            <span>👨‍🔧 {reporte.tecnico}</span>
                            <span>⏰ {reporte.horasIniciales} - {reporte.horasFinales}</span>
                            <span className="font-medium text-blue-600">
                              📈 {reporte.porcentajeAvance}% completado
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            reporte.porcentajeAvance === 100 
                              ? 'bg-green-100 text-green-800' 
                              : reporte.porcentajeAvance >= 50 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : 'bg-red-100 text-red-800'
                          }`}>
                            {reporte.porcentajeAvance === 100 ? '✅ Completado' 
                             : reporte.porcentajeAvance >= 50 ? '🔄 En progreso' 
                             : '🔴 Iniciado'}
                          </div>
                        </div>
                      </div>

                      {/* Descripción y observaciones */}
                      <div className="mb-4">
                        <h5 className="font-medium text-gray-900 mb-2">📝 Descripción del trabajo:</h5>
                        <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{reporte.descripcion}</p>
                        
                        {reporte.observaciones && (
                          <div className="mt-3">
                            <h5 className="font-medium text-gray-900 mb-2">💭 Observaciones:</h5>
                            <p className="text-gray-700 bg-yellow-50 p-3 rounded-lg italic">"{reporte.observaciones}"</p>
                          </div>
                        )}
                      </div>

                      {/* Materiales utilizados */}
                      {reporte.materialesUtilizados?.length > 0 && (
                        <div className="mb-4">
                          <h5 className="font-medium text-gray-900 mb-2">🔧 Materiales utilizados:</h5>
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {reporte.materialesUtilizados.map((material, idx) => (
                                <div key={idx} className="flex items-center text-sm text-blue-800">
                                  <span className="mr-2">•</span>
                                  <span className="font-medium">{material.nombre}</span>
                                  <span className="ml-auto text-blue-600">
                                    {material.cantidad} {material.unidad}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Sección de fotografías integrada */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                        {/* Fotos Antes */}
                        {reporte.fotosAntes?.length > 0 && (
                          <div>
                            <h5 className="font-medium text-gray-900 mb-3 flex items-center">
                              📸 Fotos ANTES ({reporte.fotosAntes?.length || 0})
                            </h5>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2 sm:gap-3">
                              {reporte.fotosAntes.map((foto, idx) => (
                                <div key={idx} className="relative group">
                                  <img
                                    src={getFileUrl(foto.url || foto)}
                                    alt={`Antes - ${idx + 1}`}
                                    className="w-full h-24 sm:h-32 object-cover rounded-lg border-2 border-red-200 cursor-pointer hover:border-red-400 transition-colors"
                                    onClick={() => mostrarGaleriaFotos(reporte.fotosAntes, idx, reporte.id, 'antes')}
                                  />
                                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded-lg transition-all duration-200 flex items-center justify-center pointer-events-none">
                                    <span className="text-white opacity-0 group-hover:opacity-100 text-sm font-medium">
                                      👁️ Ver completa
                                    </span>
                                  </div>
                                  <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded pointer-events-none">
                                    ANTES
                                  </div>
                                  {foto.descripcion && (
                                    <div className="mt-1 text-xs text-gray-600 truncate" title={foto.descripcion}>
                                      {foto.descripcion}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Fotos Después */}
                        {reporte.fotosDespues?.length > 0 && (
                          <div>
                            <h5 className="font-medium text-gray-900 mb-3 flex items-center">
                              📸 Fotos DESPUÉS ({reporte.fotosDespues?.length || 0})
                            </h5>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2 sm:gap-3">
                              {reporte.fotosDespues.map((foto, idx) => (
                                <div key={idx} className="relative group">
                                  <img
                                    src={getFileUrl(foto.url || foto)}
                                    alt={`Después - ${idx + 1}`}
                                    className="w-full h-24 sm:h-32 object-cover rounded-lg border-2 border-green-200 cursor-pointer hover:border-green-400 transition-colors"
                                    onClick={() => mostrarGaleriaFotos(reporte.fotosDespues, idx, reporte.id, 'despues')}
                                  />
                                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded-lg transition-all duration-200 flex items-center justify-center pointer-events-none">
                                    <span className="text-white opacity-0 group-hover:opacity-100 text-sm font-medium">
                                      👁️ Ver completa
                                    </span>
                                  </div>
                                  <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded pointer-events-none">
                                    DESPUÉS
                                  </div>
                                  {foto.descripcion && (
                                    <div className="mt-1 text-xs text-gray-600 truncate" title={foto.descripcion}>
                                      {foto.descripcion}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Indicador si no hay fotos */}
                      {(!reporte.fotosAntes?.length && !reporte.fotosDespues?.length) && (
                        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                          <span className="text-4xl text-gray-400 mb-2 block">📷</span>
                          <p className="text-gray-500">No se agregaron fotografías en este reporte</p>
                        </div>
                      )}
                      
                      {/* Sección de Documentación de Seguridad */}
                      <div className="mt-6 border-t pt-6">
                        <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                          <span className="mr-2">📄</span>
                          Documentación de Seguridad y Medio Ambiente
                        </h4>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                          {/* ATS */}
                          <div className={`border rounded-lg p-4 ${reporte.atsDoc ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium text-gray-900">ATS</p>
                                <p className="text-xs text-gray-600 mt-1">Análisis de Trabajo Seguro</p>
                                {reporte.atsDoc ? (
                                  <div className="mt-2">
                                    <a
                                      href={getFileUrl(reporte.atsDoc.url)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                                    >
                                      📎 {reporte.atsDoc.nombre || 'Ver documento'}
                                    </a>
                                    <p className="text-xs text-gray-500 mt-1">
                                      {reporte.atsDoc.fecha ? new Date(reporte.atsDoc.fecha).toLocaleDateString() : ''}
                                    </p>
                                  </div>
                                ) : (
                                  <p className="text-sm text-red-600 mt-2">⚠️ No adjuntado</p>
                                )}
                              </div>
                              <span className={`text-2xl ${reporte.atsDoc ? 'text-green-500' : 'text-gray-300'}`}>
                                {reporte.atsDoc ? '✓' : '○'}
                              </span>
                            </div>
                          </div>

                          {/* Aspectos Ambientales */}
                          <div className={`border rounded-lg p-4 ${reporte.aspectosAmbientalesDoc ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium text-gray-900">Aspectos Ambientales</p>
                                <p className="text-xs text-gray-600 mt-1">Documentación ambiental</p>
                                {reporte.aspectosAmbientalesDoc ? (
                                  <div className="mt-2">
                                    <a
                                      href={getFileUrl(reporte.aspectosAmbientalesDoc.url)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                                    >
                                      📎 {reporte.aspectosAmbientalesDoc.nombre || 'Ver documento'}
                                    </a>
                                    <p className="text-xs text-gray-500 mt-1">
                                      {reporte.aspectosAmbientalesDoc.fecha ? new Date(reporte.aspectosAmbientalesDoc.fecha).toLocaleDateString() : ''}
                                    </p>
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-500 mt-2">Opcional</p>
                                )}
                              </div>
                              <span className={`text-2xl ${reporte.aspectosAmbientalesDoc ? 'text-green-500' : 'text-gray-300'}`}>
                                {reporte.aspectosAmbientalesDoc ? '✓' : '○'}
                              </span>
                            </div>
                          </div>

                          {/* PTR */}
                          <div className={`border rounded-lg p-4 ${reporte.ptrDoc ? 'bg-green-50 border-green-200' : reporte.trabajoEnAltura ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200'}`}>
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium text-gray-900">PTR</p>
                                <p className="text-xs text-gray-600 mt-1">Permiso de Trabajo de Riesgo</p>
                                {reporte.ptrDoc ? (
                                  <div className="mt-2">
                                    <a
                                      href={getFileUrl(reporte.ptrDoc.url)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                                    >
                                      📎 {reporte.ptrDoc.nombre || 'Ver documento'}
                                    </a>
                                    <p className="text-xs text-gray-500 mt-1">
                                      {reporte.ptrDoc.fecha ? new Date(reporte.ptrDoc.fecha).toLocaleDateString() : ''}
                                    </p>
                                  </div>
                                ) : (
                                  <p className={`text-sm mt-2 ${reporte.trabajoEnAltura ? 'text-orange-600' : 'text-gray-500'}`}>
                                    {reporte.trabajoEnAltura ? '⚠️ Requerido (trabajo en altura)' : 'Opcional'}
                                  </p>
                                )}
                              </div>
                              <span className={`text-2xl ${reporte.ptrDoc ? 'text-green-500' : reporte.trabajoEnAltura ? 'text-orange-500' : 'text-gray-300'}`}>
                                {reporte.ptrDoc ? '✓' : reporte.trabajoEnAltura ? '!' : '○'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {reporte.trabajoEnAltura && (
                          <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <p className="text-sm text-yellow-800 flex items-center">
                              <span className="mr-2">⚠️</span>
                              Este reporte incluye trabajo en altura - PTR es obligatorio
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="card text-center py-12">
                  <div className="text-6xl text-gray-400 mb-4">📊📸</div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                    No hay reportes disponibles
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {orden.estado === 'completed'
                      ? 'Esta orden ya fue completada.'
                      : 'Aún no se han creado reportes para esta orden de trabajo.'}
                  </p>
                  {orden.estado !== 'completed' && (
                    <Link
                      to={`/reportes/nuevo/${orden.id}`}
                      className="btn-primary"
                    >
                      📝 Crear Primer Reporte
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'informe' && orden && (
          <InformeFinal ordenId={orden.id} onClose={handleCloseInforme} />
        )}
      </motion.div>

      {/* Material Request Modal */}
      {showMaterialModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-start sm:items-center justify-between gap-3 mb-6">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                  📦 Solicitar Materiales - {orden?.id}
                </h3>
                <button
                  onClick={() => setShowMaterialModal(false)}
                  className="flex-shrink-0 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Available Materials */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    Materiales Disponibles
                  </h4>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {materiales.map((material) => (
                      <div key={material.id} className="bg-gray-50 p-4 rounded-lg border">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h5 className="font-medium text-gray-900">{material.nombre}</h5>
                            <p className="text-sm text-gray-600">{material.categoria}</p>
                            <p className="text-sm text-gray-500">
                              Stock: {material.stockActual} {material.unidad}
                            </p>
                            {canViewPrices(user) && (
                              <p className="text-sm font-medium text-green-600">
                                S/{material.precioUnitario.toFixed(2)}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => handleAddMaterial(material)}
                            className="btn-secondary text-sm flex-shrink-0 self-start"
                            disabled={material.stockActual <= 0}
                          >
                            {material.stockActual <= 0 ? 'Sin stock' : '+ Agregar'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Selected Materials */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    Materiales Seleccionados ({selectedMaterials.length})
                  </h4>
                  
                  {selectedMaterials.length > 0 ? (
                    <div className="space-y-3 mb-6">
                      {selectedMaterials.map((material) => (
                        <div key={material.id} className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h5 className="font-medium text-gray-900">{material.nombre}</h5>
                              <p className="text-sm text-gray-600">{material.categoria}</p>
                            </div>
                            <button
                              onClick={() => handleRemoveMaterial(material.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              ✕
                            </button>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <label className="text-sm font-medium text-gray-700">Cantidad:</label>
                            <input
                              type="number"
                              min="1"
                              max={material.stockActual}
                              value={material.cantidadSolicitada}
                              onChange={(e) => handleUpdateMaterialQuantity(material.id, parseInt(e.target.value))}
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                            <span className="text-sm text-gray-500">{material.unidad}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center mb-6">
                      <span className="text-4xl text-gray-400 mb-2 block">📦</span>
                      <p className="text-gray-500">No hay materiales seleccionados</p>
                    </div>
                  )}

                  {/* Request Form */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Prioridad
                      </label>
                      <select
                        value={materialRequest.prioridad}
                        onChange={(e) => setMaterialRequest({...materialRequest, prioridad: e.target.value})}
                        className="input-field"
                      >
                        <option value="baja">Baja</option>
                        <option value="media">Media</option>
                        <option value="alta">Alta</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Observaciones
                      </label>
                      <textarea
                        value={materialRequest.observaciones}
                        onChange={(e) => setMaterialRequest({...materialRequest, observaciones: e.target.value})}
                        placeholder="Observaciones adicionales..."
                        rows="3"
                        className="input-field"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-6 pt-6 border-t">
                <button
                  onClick={() => setShowMaterialModal(false)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmitMaterialRequest}
                  className="btn-primary"
                  disabled={selectedMaterials.length === 0}
                >
                  Enviar Solicitud
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEstimacionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <EstimacionTecnico
                orden={orden}
                onClose={() => {
                  setShowEstimacionModal(false)
                  fetchOrdenes()
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OrdenDetalle