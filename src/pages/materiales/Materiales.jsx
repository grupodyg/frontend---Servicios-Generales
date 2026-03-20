import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useMaterialesStore from '../../stores/materialesStore'
import useAuthStore from '../../stores/authStore'
import useOrdenesStore from '../../stores/ordenesStore'
import { canViewPrices } from '../../utils/permissionsUtils'
import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'

const MySwal = withReactContent(Swal)

const Materiales = () => {
  const {
    materiales,
    categorias,
    solicitudes,
    fetchMateriales,
    fetchSolicitudes,
    fetchCategorias,
    createSolicitud,
    updateSolicitud,
    createMaterial,
    updateMaterial,
    updateMaterialStock,
    deleteMaterial,
    createCategoria,
    updateCategoria,
    deleteCategoria,
    getEstadisticasMateriales,
    getMaterialesBajoStock,
    isLoading
  } = useMaterialesStore()

  const { hasPermission, user } = useAuthStore()
  const { ordenes, fetchOrdenes } = useOrdenesStore()
  const [activeTab, setActiveTab] = useState('inventario')
  const [filtroCategoria, setFiltroCategoria] = useState('todas')
  const [busqueda, setBusqueda] = useState('')
  const [showSolicitudModal, setShowSolicitudModal] = useState(false)
  const [showNuevoMaterialModal, setShowNuevoMaterialModal] = useState(false)
  const [showActualizarStockModal, setShowActualizarStockModal] = useState(false)
  const [showCategoriasModal, setShowCategoriasModal] = useState(false)
  const [showMaterialDetailModal, setShowMaterialDetailModal] = useState(false)
  const [showEditMaterialModal, setShowEditMaterialModal] = useState(false)
  const [materialParaVer, setMaterialParaVer] = useState(null)
  const [materialParaActualizar, setMaterialParaActualizar] = useState(null)
  const [materialParaEditar, setMaterialParaEditar] = useState(null)
  const [nuevaCategoria, setNuevaCategoria] = useState({ nombre: '', prefijo: '' })
  const [categoriaEditando, setCategoriaEditando] = useState(null) // Guarda el objeto completo de categoría
  const [categoriaEditandoNombre, setCategoriaEditandoNombre] = useState('')
  const [categoriaEditandoPrefijo, setCategoriaEditandoPrefijo] = useState('')
  const [nuevaSolicitud, setNuevaSolicitud] = useState({
    ordenId: '',
    prioridad: 'media',
    observaciones: ''
  })
  // Filtros para Solicitudes
  const [filtroEstadoSolicitud, setFiltroEstadoSolicitud] = useState('todos')
  const [filtroTecnico, setFiltroTecnico] = useState('todos')
  const [filtroOrden, setFiltroOrden] = useState('todos')
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('')
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('')
  const [busquedaSolicitudes, setBusquedaSolicitudes] = useState('')
  const [busquedaMaterialesModal, setBusquedaMaterialesModal] = useState('')
  const [nuevoMaterial, setNuevoMaterial] = useState({
    codigo: '',
    nombre: '',
    categoriaId: null,
    unidadMedida: 'unidad',
    stockActual: 0,
    stockMinimo: 5,
    precioUnitario: 0,
    proveedor: '',
    ubicacion: ''
  })
  const [codigoPreview, setCodigoPreview] = useState('')
  const [actualizacionStock, setActualizacionStock] = useState({
    cantidad: 0,
    tipo: 'entrada',
    motivo: 'Compra'
  })
  const [selectedMaterials, setSelectedMaterials] = useState([])

  useEffect(() => {
    fetchMateriales()
    // Carga inicial: si es técnico, filtrar solo sus solicitudes
    const initialFilters = user?.role === 'tecnico' ? { technician: user.name } : {}
    fetchSolicitudes(initialFilters)
    fetchCategorias()
    fetchOrdenes()
  }, [fetchMateriales, fetchSolicitudes, fetchCategorias, fetchOrdenes, user])

  // Aplicar filtros del backend cuando cambien
  useEffect(() => {
    const filters = {
      status: filtroEstadoSolicitud !== 'todos' ? filtroEstadoSolicitud : null,
      // Si es técnico, siempre filtrar solo sus solicitudes
      technician: user?.role === 'tecnico' ? user.name : (filtroTecnico !== 'todos' ? filtroTecnico : null),
      order_id: filtroOrden !== 'todos' ? filtroOrden : null,
      fechaDesde: filtroFechaDesde || null,
      fechaHasta: filtroFechaHasta || null,
      search: busquedaSolicitudes || null
    }
    fetchSolicitudes(filters)
  }, [filtroEstadoSolicitud, filtroTecnico, filtroOrden, filtroFechaDesde, filtroFechaHasta, busquedaSolicitudes, fetchSolicitudes, user])

  // Función para generar código de material basado en categoría
  const generateMaterialCode = (categoriaId) => {
    if (!categoriaId) return ''

    // Buscar categoría por ID
    const categoria = categorias.find(c => c.id === categoriaId)
    if (!categoria) return ''

    // Usar el prefijo de la categoría o generar uno
    const prefix = categoria.prefijo || categoria.nombre.substring(0, 4).toUpperCase()

    // Contar materiales existentes en esta categoría
    const count = materiales.filter(m => m.categoriaId === categoriaId).length + 1

    return `${prefix}-${String(count).padStart(4, '0')}`
  }

  const updateStock = async (materialId, stockData) => {
    // Usar la función específica para actualizar stock
    // Esto envía SOLO current_stock al backend, evitando sobrescribir otros campos
    await updateMaterialStock(materialId, stockData.nuevoStock)
  }

  const addCategoria = async (nombreCategoria, prefijo) => {
    try {
      await createCategoria(nombreCategoria, prefijo)
      // La función createCategoria ya actualiza la lista automáticamente
    } catch (error) {
      console.error('Error al crear categoría:', error)
      throw error
    }
  }

  const editCategoria = async (categoriaId, nuevoNombre, nuevoPrefijo) => {
    try {
      await updateCategoria(categoriaId, nuevoNombre, nuevoPrefijo)
      // La función updateCategoria ya actualiza la lista automáticamente
    } catch (error) {
      console.error('Error al editar categoría:', error)
      throw error
    }
  }

  const removeCategoria = async (categoriaId) => {
    try {
      await deleteCategoria(categoriaId)
      // La función deleteCategoria ya actualiza la lista automáticamente
    } catch (error) {
      console.error('Error al eliminar categoría:', error)
      throw error
    }
  }

  // Update code preview when category changes
  useEffect(() => {
    if (nuevoMaterial.categoriaId) {
      const codigo = generateMaterialCode(nuevoMaterial.categoriaId)
      setCodigoPreview(codigo)
      // Integrar el código generado en el estado
      setNuevoMaterial(prev => ({ ...prev, codigo }))
    }
  }, [nuevoMaterial.categoriaId, materiales, categorias])

  const estadisticas = getEstadisticasMateriales()
  const materialesBajoStock = getMaterialesBajoStock()

  const filtrarMateriales = () => {
    let filtered = materiales

    if (filtroCategoria !== 'todas') {
      filtered = filtered.filter(material => material.categoriaNombre === filtroCategoria)
    }

    if (busqueda) {
      filtered = filtered.filter(material =>
        material.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        material.descripcion?.toLowerCase().includes(busqueda.toLowerCase())
      )
    }

    return filtered
  }

  const filtrarMaterialesModal = () => {
    let filtered = materiales

    // Filtrar por búsqueda
    if (busquedaMaterialesModal) {
      const searchLower = busquedaMaterialesModal.toLowerCase()
      filtered = filtered.filter(material => {
        // Buscar en nombre
        if (material.nombre.toLowerCase().includes(searchLower)) return true

        // Buscar en categoría
        if (material.categoriaNombre?.toLowerCase().includes(searchLower)) return true

        // Buscar en descripción
        if (material.descripcion?.toLowerCase().includes(searchLower)) return true

        // Buscar en código/ID
        if (String(material.id).toLowerCase().includes(searchLower)) return true

        return false
      })
    }

    return filtered
  }

  const getStockStatus = (material) => {
    if (material.stockActual === 0) return { status: 'sin-stock', color: 'bg-red-100 text-red-800', text: 'Sin Stock' }
    if (material.stockActual <= material.stockMinimo) return { status: 'bajo', color: 'bg-yellow-100 text-yellow-800', text: 'Stock Bajo' }
    return { status: 'ok', color: 'bg-green-100 text-green-800', text: 'Stock OK' }
  }

  const handleSolicitudAprobacion = async (solicitudId, accion) => {
    const result = await MySwal.fire({
      title: `¿${accion === 'aprobada' ? 'Aprobar' : 'Rechazar'} solicitud?`,
      text: 'Esta acción no se puede deshacer',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: accion === 'aprobada' ? '#059669' : '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: accion === 'aprobada' ? 'Aprobar' : 'Rechazar',
      cancelButtonText: 'Cancelar'
    })

    if (result.isConfirmed) {
      try {
        await updateSolicitud(solicitudId, { estado: accion })
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

    try {
      await addCategoria(nuevaCategoria.nombre.trim(), nuevaCategoria.prefijo.trim().toUpperCase())
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

    try {
      await editCategoria(categoriaEditando.id, categoriaEditandoNombre.trim(), categoriaEditandoPrefijo.trim().toUpperCase())
      MySwal.fire({
        title: '¡Categoría actualizada!',
        text: `La categoría ha sido actualizada correctamente`,
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
        await removeCategoria(categoriaId)
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

  const handleSubmitNuevaSolicitud = async () => {
    if (!nuevaSolicitud.ordenId) {
      MySwal.fire({
        title: 'Error',
        text: 'Debe seleccionar una orden de trabajo',
        icon: 'error',
        confirmButtonColor: '#1e40af'
      })
      return
    }

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
        ordenId: nuevaSolicitud.ordenId,
        solicitante: user?.name || 'Admin',
        prioridad: nuevaSolicitud.prioridad,
        materiales: selectedMaterials.map(material => ({
          materialId: material.id,
          nombre: material.nombre,
          cantidadSolicitada: material.cantidadSolicitada,
          unidadMedida: material.unidadMedida || 'unidad',
          observaciones: material.observaciones || ''
        })),
        observacionesGenerales: nuevaSolicitud.observaciones
      }

      // Find the selected order to pass for validation
      const selectedOrder = ordenes.find(orden => orden.id === nuevaSolicitud.ordenId)
      await createSolicitud(solicitudData, selectedOrder)
      
      MySwal.fire({
        title: '¡Solicitud creada!',
        text: 'La solicitud de materiales ha sido enviada correctamente',
        icon: 'success',
        confirmButtonColor: '#1e40af'
      })

      // Reset form and close modal
      setNuevaSolicitud({ ordenId: '', prioridad: 'media', observaciones: '' })
      setSelectedMaterials([])
      setShowSolicitudModal(false)
      
    } catch (error) {
      MySwal.fire({
        title: 'Error',
        text: error.message || 'No se pudo crear la solicitud de materiales',
        icon: 'error',
        confirmButtonColor: '#1e40af'
      })
    }
  }

  const validarFormularioMaterial = () => {
    const errores = []

    if (!nuevoMaterial.codigo?.trim()) {
      errores.push('El código es requerido')
    }

    if (!nuevoMaterial.nombre?.trim()) {
      errores.push('El nombre es requerido')
    }

    if (!nuevoMaterial.unidadMedida) {
      errores.push('La unidad de medida es requerida')
    }

    if (!nuevoMaterial.categoriaId) {
      errores.push('Debe seleccionar una categoría')
    }

    return errores
  }

  const handleCrearMaterial = async () => {
    // Validar formulario
    const errores = validarFormularioMaterial()
    if (errores.length > 0) {
      MySwal.fire({
        title: 'Formulario incompleto',
        html: `<ul style="text-align: left;">${errores.map(e => `<li>${e}</li>`).join('')}</ul>`,
        icon: 'warning',
        confirmButtonColor: '#1e40af'
      })
      return
    }

    try {
      const nuevoMaterialData = {
        ...nuevoMaterial,
        stockActual: parseInt(nuevoMaterial.stockActual) || 0,
        stockMinimo: parseInt(nuevoMaterial.stockMinimo) || 0,
        precioUnitario: parseFloat(nuevoMaterial.precioUnitario) || 0
      }

      await createMaterial(nuevoMaterialData)
      
      MySwal.fire({
        title: '¡Material creado!',
        text: 'El nuevo material ha sido agregado al inventario',
        icon: 'success',
        confirmButtonColor: '#1e40af'
      })

      // Reset form and close modal
      setNuevoMaterial({
        codigo: '',
        nombre: '',
        categoriaId: null,
        unidadMedida: 'unidad',
        stockActual: 0,
        stockMinimo: 5,
        precioUnitario: 0,
        proveedor: '',
        ubicacion: ''
      })
      setCodigoPreview('')
      setShowNuevoMaterialModal(false)
      
    } catch (error) {
      MySwal.fire({
        title: 'Error',
        text: error.message || 'No se pudo crear el material',
        icon: 'error',
        confirmButtonColor: '#1e40af'
      })
    }
  }

  const handleActualizarStock = async () => {
    if (!materialParaActualizar) return

    try {
      // Asegurar que los valores sean números (pueden venir como strings)
      const stockActualNumerico = parseFloat(materialParaActualizar.stockActual) || 0
      const cantidadIngresada = parseFloat(actualizacionStock.cantidad) || 0

      const cantidad = actualizacionStock.tipo === 'salida'
        ? -Math.abs(cantidadIngresada)
        : Math.abs(cantidadIngresada)

      if (cantidadIngresada === 0) {
        MySwal.fire({
          title: 'Error',
          text: 'La cantidad debe ser mayor a 0',
          icon: 'error',
          confirmButtonColor: '#1e40af'
        })
        return
      }

      const nuevoStock = stockActualNumerico + cantidad

      // Validate that we don't go negative
      if (nuevoStock < 0) {
        MySwal.fire({
          title: 'Error',
          text: 'No se puede reducir el stock por debajo de 0',
          icon: 'error',
          confirmButtonColor: '#1e40af'
        })
        return
      }

      await updateStock(materialParaActualizar.id, {
        nuevoStock: nuevoStock,
        motivo: actualizacionStock.motivo,
        tipo: actualizacionStock.tipo
      })
      
      MySwal.fire({
        title: '¡Stock actualizado!',
        text: `Stock de ${materialParaActualizar.nombre} actualizado correctamente`,
        icon: 'success',
        confirmButtonColor: '#1e40af'
      })

      // Reset form and close modal
      setActualizacionStock({
        cantidad: 0,
        tipo: 'entrada',
        motivo: 'Compra'
      })
      setMaterialParaActualizar(null)
      setShowActualizarStockModal(false)
      
    } catch (error) {
      MySwal.fire({
        title: 'Error',
        text: error.message || 'No se pudo actualizar el stock',
        icon: 'error',
        confirmButtonColor: '#1e40af'
      })
    }
  }

  const handleOpenActualizarStock = (material) => {
    setMaterialParaActualizar(material)
    setActualizacionStock({
      cantidad: 0,
      tipo: 'entrada',
      motivo: 'Compra'
    })
    setShowActualizarStockModal(true)
  }

  const handleViewMaterial = (material) => {
    setMaterialParaVer(material)
    setShowMaterialDetailModal(true)
  }

  const handleOpenEditMaterial = (material) => {
    setMaterialParaEditar(material)
    setShowEditMaterialModal(true)
  }

  const handleUpdateMaterial = async () => {
    if (!materialParaEditar) return

    // Validación de campos requeridos
    const errores = []

    if (!materialParaEditar.nombre?.trim()) {
      errores.push('Nombre del material')
    }
    if (!materialParaEditar.categoriaId) {
      errores.push('Categoría')
    }
    if (!materialParaEditar.unidadMedida) {
      errores.push('Unidad de medida')
    }
    if (materialParaEditar.stockMinimo === '' || materialParaEditar.stockMinimo === null || materialParaEditar.stockMinimo === undefined || isNaN(parseInt(materialParaEditar.stockMinimo)) || parseInt(materialParaEditar.stockMinimo) < 0) {
      errores.push('Stock mínimo (debe ser un número válido >= 0)')
    }
    if (materialParaEditar.precioUnitario === '' || materialParaEditar.precioUnitario === null || materialParaEditar.precioUnitario === undefined || isNaN(parseFloat(materialParaEditar.precioUnitario)) || parseFloat(materialParaEditar.precioUnitario) < 0) {
      errores.push('Precio unitario (debe ser un número válido >= 0)')
    }

    if (errores.length > 0) {
      MySwal.fire({
        title: 'Campos incompletos',
        html: `<div class="text-left"><p class="mb-2">Por favor complete los siguientes campos:</p><ul class="list-disc pl-5">${errores.map(e => `<li>${e}</li>`).join('')}</ul></div>`,
        icon: 'warning',
        confirmButtonColor: '#1e40af'
      })
      return
    }

    try {
      // Preparar los datos actualizados
      const updates = {
        nombre: materialParaEditar.nombre.trim(),
        categoriaId: parseInt(materialParaEditar.categoriaId),
        unidadMedida: materialParaEditar.unidadMedida,
        stockMinimo: parseInt(materialParaEditar.stockMinimo),
        precioUnitario: parseFloat(materialParaEditar.precioUnitario),
        proveedor: materialParaEditar.proveedor || '',
        ubicacion: materialParaEditar.ubicacion || ''
      }

      await updateMaterial(materialParaEditar.id, updates)

      MySwal.fire({
        title: '¡Material actualizado!',
        text: `${materialParaEditar.nombre} ha sido actualizado correctamente`,
        icon: 'success',
        confirmButtonColor: '#1e40af',
        timer: 2000
      })

      // Reset y cerrar modal
      setMaterialParaEditar(null)
      setShowEditMaterialModal(false)

    } catch (error) {
      MySwal.fire({
        title: 'Error',
        text: error.message || 'No se pudo actualizar el material',
        icon: 'error',
        confirmButtonColor: '#1e40af'
      })
    }
  }


  // Calcular el conteo de solicitudes según el rol (técnicos solo ven las suyas)
  const solicitudesVisibles = user?.role === 'tecnico'
    ? solicitudes.filter(s => s.solicitante === user.name)
    : solicitudes

  // Tabs disponibles según el rol del usuario
  const allTabs = [
    { id: 'inventario', name: 'Inventario', icon: '📦', count: materiales.length },
    { id: 'solicitudes', name: 'Solicitudes', icon: '📝', count: solicitudesVisibles.length },
    { id: 'estadisticas', name: 'Estadísticas', icon: '📊', adminOnly: true }
  ]

  // Filtrar tabs: técnicos no ven estadísticas
  const tabs = user?.role === 'tecnico'
    ? allTabs.filter(tab => !tab.adminOnly)
    : allTabs

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Gestión de Materiales</h1>
          <p className="text-gray-600 text-sm sm:text-base hidden sm:block">Inventario y solicitudes de materiales</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:space-x-3 w-full sm:w-auto">
          {user?.role === 'admin' && (
            <>
              <button
                onClick={() => setShowCategoriasModal(true)}
                className="btn-secondary text-sm"
              >
                🏷️ Categorías
              </button>
              <button
                onClick={() => setShowNuevoMaterialModal(true)}
                className="btn-secondary text-sm"
              >
                📦 Agregar Material
              </button>
            </>
          )}
          <button
            onClick={() => setShowSolicitudModal(true)}
            className="btn-primary text-sm"
          >
            ➕ Nueva Solicitud
          </button>
        </div>
      </div>

      {/* Alert for Low Stock */}
      {materialesBajoStock.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-yellow-400 text-xl">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Materiales con Stock Bajo
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                {materialesBajoStock.length} materiales requieren reposición
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="card p-3 sm:p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Total Materiales</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{estadisticas.totalMateriales}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-lg sm:text-xl">📦</span>
            </div>
          </div>
        </div>

        <div className="card p-3 sm:p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Requieren Atención</p>
              <p className="text-xl sm:text-2xl font-bold text-yellow-600">
                {(estadisticas.materialesBajoStock || 0) + (estadisticas.materialesSinStock || 0)}
              </p>
              <p className="text-xs text-gray-500 mt-1 hidden sm:block">
                {estadisticas.materialesSinStock > 0 && <span className="text-red-500">{estadisticas.materialesSinStock} sin stock</span>}
                {estadisticas.materialesSinStock > 0 && estadisticas.materialesBajoStock > 0 && ' · '}
                {estadisticas.materialesBajoStock > 0 && <span className="text-yellow-600">{estadisticas.materialesBajoStock} bajo</span>}
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <span className="text-lg sm:text-xl">⚠️</span>
            </div>
          </div>
        </div>

        <div className="card p-3 sm:p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Solicitudes Pendientes</p>
              <p className="text-xl sm:text-2xl font-bold text-red-600">{estadisticas.solicitudesPendientes}</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <span className="text-lg sm:text-xl">📝</span>
            </div>
          </div>
        </div>

        {user?.role === 'admin' && (
          <div className="card p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Valor Inventario</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">S/ {estadisticas.valorInventario}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-lg sm:text-xl">💰</span>
              </div>
            </div>
          </div>
        )}
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
          <div className="space-y-6">
            {/* Filters */}
            <div className="card">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoría
                  </label>
                  <select
                    className="input-field"
                    value={filtroCategoria}
                    onChange={(e) => setFiltroCategoria(e.target.value)}
                  >
                    <option value="todas">Todas las categorías</option>
                    {categorias.map((categoria) => (
                      <option key={categoria.id} value={categoria.nombre}>{categoria.nombre}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Búsqueda
                  </label>
                  <input
                    type="text"
                    placeholder="Buscar materiales..."
                    className="input-field"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                  />
                </div>
                
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setFiltroCategoria('todas')
                      setBusqueda('')
                    }}
                    className="btn-secondary w-full"
                  >
                    🔄 Limpiar Filtros
                  </button>
                </div>
              </div>
            </div>

            {/* Materials Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <AnimatePresence>
                {filtrarMateriales().map((material) => {
                  const stockStatus = getStockStatus(material)
                  return (
                    <motion.div
                      key={material.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="card hover:shadow-lg transition-all duration-300 cursor-pointer group"
                      onClick={() => handleViewMaterial(material)}
                    >
                      {/* Material Image */}
                      <div className="relative mb-4 rounded-lg overflow-hidden bg-gray-100">
                        {material.imagen ? (
                          <img
                            src={material.imagen}
                            alt={material.nombre}
                            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNzUgMTIwVjE4MEgxNDBWMTIwSDE3NVpNMjI1IDEyMFYxODBIMTkwVjEyMEgyMjVaTTI3NSAxMjBWMTgwSDI0MFYxMjBIMjc1WiIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K'
                            }}
                          />
                        ) : (
                          <div className="w-full h-48 flex items-center justify-center bg-gray-200">
                            <div className="text-center text-gray-500">
                              <span className="text-4xl block mb-2">📦</span>
                              <span className="text-sm">Sin imagen</span>
                            </div>
                          </div>
                        )}
                        <div className="absolute top-2 right-2">
                          <span className={`status-badge ${stockStatus.color} backdrop-blur-sm bg-opacity-90`}>
                            {stockStatus.text}
                          </span>
                        </div>
                      </div>

                      {/* Material Info */}
                      <div className="space-y-3">
                        <div>
                          <h3 className="font-semibold text-gray-900 text-lg group-hover:text-blue-600 transition-colors">
                            {material.nombre}
                          </h3>
                          <p className="text-sm text-gray-500">{material.categoriaNombre}</p>
                        </div>

                        <p className="text-sm text-gray-600 line-clamp-2">{material.descripcion}</p>

                        {/* Stock Information */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">Stock:</span>
                            <div className="text-right">
                              <span className="font-semibold text-gray-900">
                                {material.stockActual} {material.unidad}
                              </span>
                              <span className="text-xs text-gray-500 block">
                                Mín: {material.stockMinimo}
                              </span>
                            </div>
                          </div>

                          {/* Stock Progress Bar */}
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                material.stockActual <= material.stockMinimo
                                  ? 'bg-red-500'
                                  : 'bg-green-500'
                              }`}
                              style={{
                                width: `${Math.min((material.stockActual / (material.stockMinimo * 2)) * 100, 100)}%`
                              }}
                            />
                          </div>

                          {user?.role === 'admin' && (
                            <div className="flex justify-between items-center pt-2 border-t">
                              <span className="text-sm text-gray-500">Precio:</span>
                              <span className="font-medium text-green-600">
                                S/ {material.precioUnitario.toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex space-x-2 pt-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleViewMaterial(material)
                            }}
                            className="flex-1 text-sm px-3 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition-colors font-medium"
                          >
                            👁️ Ver Detalles
                          </button>
                          {user?.role === 'admin' && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleOpenEditMaterial(material)
                                }}
                                className="text-sm px-3 py-2 bg-yellow-100 text-yellow-700 hover:bg-yellow-200 rounded-lg transition-colors"
                                title="Editar material"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleOpenActualizarStock(material)
                                }}
                                className="text-sm px-3 py-2 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg transition-colors"
                                title="Actualizar stock"
                              >
                                📊
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          </div>
        )}

        {activeTab === 'solicitudes' && (
          <div className="space-y-6">
            {/* Banner informativo para técnicos */}
            {user?.role === 'tecnico' && (
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">👤</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-blue-800">
                      Mostrando solo tus solicitudes
                    </p>
                    <p className="text-sm text-blue-700 mt-1">
                      Estás viendo únicamente las solicitudes que has creado como <strong>{user.name}</strong>
                    </p>
                  </div>
                </div>
              </div>
            )}

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
                  placeholder="Buscar por ID, técnico, orden, material u observaciones..."
                  className="input-field"
                  value={busquedaSolicitudes}
                  onChange={(e) => setBusquedaSolicitudes(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Busca en ID de solicitud, técnico, orden de trabajo, materiales y observaciones
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
                    <option value="pending">Pendiente</option>
                    <option value="approved">Aprobada</option>
                    <option value="rejected">Rechazada</option>
                    <option value="entregada">Entregada</option>
                  </select>
                </div>

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
                      {[...new Set(solicitudes.map(s => s.solicitante))].filter(Boolean).map((tecnico) => (
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
                    {[...new Set(solicitudes.map(s => s.ordenId))].filter(Boolean).map((ordenId) => (
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

            {/* Resultado de Solicitudes Filtradas (ya filtradas por el backend) */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                📊 Mostrando <span className="font-bold">{solicitudes.length}</span> solicitud{solicitudes.length !== 1 ? 'es' : ''}
              </p>
            </div>

            {/* Lista de Solicitudes */}
            {solicitudes.length === 0 ? (
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
                {solicitudes.map((solicitud) => (
              <div key={solicitud.id} className="card p-3 sm:p-4 md:p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-2 sm:gap-0 mb-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Solicitud #{solicitud.id}</h3>
                    {solicitud.ordenId && (
                      <p className="text-xs sm:text-sm text-blue-600 font-medium">
                        📋 Orden de Trabajo: {solicitud.ordenId}
                      </p>
                    )}
                    <p className="text-xs sm:text-sm text-gray-500 break-words">
                      Solicitado por: {solicitud.solicitante || solicitud.tecnicoNombre || 'Sin asignar'} • {solicitud.fechaSolicitud ? new Date(solicitud.fechaSolicitud).toLocaleDateString('es-ES') : solicitud.fechaCreacion ? new Date(solicitud.fechaCreacion).toLocaleDateString('es-ES') : 'Sin fecha'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <span className={`status-badge ${
                      solicitud.estado === 'pending' ? 'status-pending' :
                      solicitud.estado === 'approved' ? 'status-completed' :
                      solicitud.estado === 'entregada' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {solicitud.estado === 'pending' ? 'pendiente' :
                       solicitud.estado === 'approved' ? 'aprobada' :
                       solicitud.estado === 'entregada' ? 'entregada' :
                       solicitud.estado === 'rejected' ? 'rechazada' :
                       solicitud.estado}
                    </span>
                    <span className={`status-badge ${
                      solicitud.prioridad === 'high' || solicitud.prioridad === 'alta' ? 'bg-red-100 text-red-800' :
                      solicitud.prioridad === 'normal' || solicitud.prioridad === 'media' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {solicitud.prioridad === 'high' ? 'alta' :
                       solicitud.prioridad === 'normal' ? 'media' :
                       solicitud.prioridad === 'low' ? 'baja' :
                       solicitud.prioridad || 'normal'}
                    </span>
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Materiales solicitados:</h4>
                  <div className="space-y-2">
                    {solicitud.items && solicitud.items.length > 0 ? (
                      solicitud.items.map((item, index) => (
                        <div key={index} className="flex flex-col sm:flex-row justify-between sm:items-center bg-gray-50 rounded p-2 gap-1">
                          <span className="text-xs sm:text-sm text-gray-900 font-medium">{item.material_name || item.nombre}</span>
                          <div className="text-xs sm:text-sm text-gray-600 flex-shrink-0">
                            Solicitado: {item.requested_quantity || item.cantidadSolicitada} {item.unit || ''}
                            {item.approved_quantity !== null && item.approved_quantity !== undefined && (
                              <span className="ml-2 text-green-600">
                                • Aprobado: {item.approved_quantity}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 italic">No hay materiales solicitados</p>
                    )}
                  </div>
                </div>

                {solicitud.observaciones && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-1">Observaciones:</h4>
                    <p className="text-sm text-gray-600 bg-gray-50 rounded p-2">
                      {solicitud.observaciones}
                    </p>
                  </div>
                )}

                {user?.role === 'admin' && solicitud.estado === 'pending' && (
                  <div className="flex flex-col sm:flex-row gap-2 sm:space-x-3">
                    <button
                      onClick={() => handleSolicitudAprobacion(solicitud.id, 'approved')}
                      className="btn-primary bg-green-600 hover:bg-green-700 text-sm"
                    >
                      ✅ Aprobar
                    </button>
                    <button
                      onClick={() => handleSolicitudAprobacion(solicitud.id, 'rejected')}
                      className="btn-secondary bg-red-50 text-red-700 hover:bg-red-100 text-sm"
                    >
                      ❌ Rechazar
                    </button>
                  </div>
                )}
              </div>
                ))}
              </div>
            )}
          </div>
        )}


        {activeTab === 'estadisticas' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Materiales por Categoría
              </h3>
              <div className="space-y-3">
                {categorias.map((categoria) => {
                  const count = materiales.filter(m => m.categoriaNombre === categoria.nombre).length
                  const percentage = materiales.length > 0 ? (count / materiales.length) * 100 : 0
                  return (
                    <div key={categoria.id}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{categoria.nombre}</span>
                        <span>{count} materiales</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-corporate-blue h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Estado del Inventario
              </h3>
              {(() => {
                // Solo contar materiales disponibles (status='available') y hacer categorías mutuamente excluyentes
                const materialesDisponibles = materiales.filter(m => m.estado === 'available')
                const sinStock = materialesDisponibles.filter(m => m.stockActual === 0).length
                const stockBajo = materialesDisponibles.filter(m => m.stockActual > 0 && m.stockActual <= m.stockMinimo).length
                const stockOK = materialesDisponibles.filter(m => m.stockActual > m.stockMinimo).length

                return (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Materiales sin stock</span>
                      <span className="text-lg font-bold text-red-600">{sinStock}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Materiales con stock bajo</span>
                      <span className="text-lg font-bold text-yellow-600">{stockBajo}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Materiales con stock OK</span>
                      <span className="text-lg font-bold text-green-600">{stockOK}</span>
                    </div>
                    <div className="pt-3 mt-3 border-t border-gray-100">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Total materiales disponibles</span>
                        <span className="font-semibold text-gray-700">{materialesDisponibles.length}</span>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        )}
      </motion.div>

      {/* Nueva Solicitud Modal */}
      {showSolicitudModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-5xl w-full h-[90vh] overflow-y-auto">
            <div className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                  ➕ Nueva Solicitud de Materiales
                </h3>
                <button
                  onClick={() => {
                    setShowSolicitudModal(false)
                    setNuevaSolicitud({ ordenId: '', prioridad: 'media', observaciones: '' })
                    setSelectedMaterials([])
                    setBusquedaMaterialesModal('')
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {/* Request Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
                <div className="lg:col-span-1">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Orden de Trabajo *
                      </label>
                      <select
                        value={nuevaSolicitud.ordenId}
                        onChange={(e) => setNuevaSolicitud({...nuevaSolicitud, ordenId: e.target.value})}
                        className="input-field"
                      >
                        <option value="">Seleccionar orden...</option>
                        {ordenes.map((orden) => (
                          <option key={orden.id} value={orden.id}>
                            {orden.id} - {orden.cliente}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Prioridad
                      </label>
                      <select
                        value={nuevaSolicitud.prioridad}
                        onChange={(e) => setNuevaSolicitud({...nuevaSolicitud, prioridad: e.target.value})}
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
                        value={nuevaSolicitud.observaciones}
                        onChange={(e) => setNuevaSolicitud({...nuevaSolicitud, observaciones: e.target.value})}
                        placeholder="Observaciones adicionales..."
                        rows="4"
                        className="input-field"
                      />
                    </div>

                    {/* Selected Materials Summary */}
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">
                        Resumen ({selectedMaterials.length} materiales)
                      </h4>
                      {selectedMaterials.length > 0 ? (
                        <div className="space-y-1">
                          {selectedMaterials.map((material) => (
                            <div key={material.id} className="text-sm text-blue-800">
                              {material.nombre} - {material.cantidadSolicitada} {material.unidad}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-blue-600">No hay materiales seleccionados</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Available Materials */}
                <div className="lg:col-span-1">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    Materiales Disponibles
                  </h4>

                  {/* Buscador de materiales */}
                  <div className="mb-3">
                    <input
                      type="text"
                      placeholder="🔎 Buscar materiales..."
                      className="input-field"
                      value={busquedaMaterialesModal}
                      onChange={(e) => setBusquedaMaterialesModal(e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Mostrando {filtrarMaterialesModal().length} de {materiales.length} materiales
                    </p>
                  </div>

                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {filtrarMaterialesModal().map((material) => (
                      <div key={material.id} className="bg-gray-50 p-3 rounded-lg border">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h5 className="font-medium text-gray-900 text-sm">{material.nombre}</h5>
                            <p className="text-xs text-gray-600">{material.categoriaNombre}</p>
                            <p className="text-xs text-gray-500">
                              Stock: {material.stockActual} {material.unidadMedida}
                            </p>
                            {canViewPrices(user) && (
                              <p className="text-xs font-medium text-green-600">
                                S/{material.precioUnitario.toFixed(2)}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => handleAddMaterial(material)}
                            className="btn-secondary text-xs px-2 py-1"
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
                <div className="lg:col-span-1">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    Materiales Seleccionados ({selectedMaterials.length})
                  </h4>
                  
                  {selectedMaterials.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {selectedMaterials.map((material) => (
                        <div key={material.id} className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h5 className="font-medium text-gray-900 text-sm">{material.nombre}</h5>
                              <p className="text-xs text-gray-600">{material.categoriaNombre}</p>
                            </div>
                            <button
                              onClick={() => handleRemoveMaterial(material.id)}
                              className="text-red-500 hover:text-red-700 text-sm"
                            >
                              ✕
                            </button>
                          </div>
                          <div className="flex items-center space-x-2">
                            <label className="text-xs font-medium text-gray-700">Cantidad:</label>
                            <input
                              type="number"
                              min="1"
                              max={material.stockActual}
                              value={material.cantidadSolicitada}
                              onChange={(e) => handleUpdateMaterialQuantity(material.id, parseInt(e.target.value))}
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-xs"
                            />
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{material.unidadMedida || 'unidad'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <span className="text-4xl text-gray-400 mb-2 block">📦</span>
                      <p className="text-gray-500 text-sm">No hay materiales seleccionados</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:space-x-3 pt-4 sm:pt-6 border-t">
                <button
                  onClick={() => {
                    setShowSolicitudModal(false)
                    setNuevaSolicitud({ ordenId: '', prioridad: 'media', observaciones: '' })
                    setSelectedMaterials([])
                    setBusquedaMaterialesModal('')
                  }}
                  className="btn-secondary text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmitNuevaSolicitud}
                  className="btn-primary text-sm"
                  disabled={!nuevaSolicitud.ordenId || selectedMaterials.length === 0}
                >
                  Crear Solicitud
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nuevo Material Modal */}
      {showNuevoMaterialModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                  📦 Agregar Nuevo Material
                </h3>
                <button
                  onClick={() => {
                    setShowNuevoMaterialModal(false)
                    setNuevoMaterial({
                      codigo: '',
                      nombre: '',
                      categoriaId: null,
                      unidadMedida: 'unidad',
                      stockActual: 0,
                      stockMinimo: 5,
                      precioUnitario: 0,
                      proveedor: '',
                      ubicacion: ''
                    })
                    setCodigoPreview('')
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleCrearMaterial(); }} className="space-y-4">
                {/* Auto-generated Code Preview */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-blue-900 mb-1">
                        Código que se generará automáticamente
                      </h4>
                      <div className="flex items-center space-x-2">
                        <span className="text-lg font-mono font-bold text-blue-700 bg-white px-3 py-1 rounded border">
                          {codigoPreview || 'CLIM-0001'}
                        </span>
                        <span className="text-xs text-blue-600">
                          (basado en categoría seleccionada)
                        </span>
                      </div>
                    </div>
                    <div className="text-blue-600">
                      🏷️
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre del Material *
                    </label>
                    <input
                      type="text"
                      value={nuevoMaterial.nombre}
                      onChange={(e) => setNuevoMaterial({...nuevoMaterial, nombre: e.target.value})}
                      className="input-field"
                      placeholder="Ej: Filtros HVAC"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Categoría *
                    </label>
                    <select
                      value={nuevoMaterial.categoriaId || ''}
                      onChange={(e) => setNuevoMaterial({...nuevoMaterial, categoriaId: parseInt(e.target.value)})}
                      className="input-field"
                      required
                    >
                      <option value="">Seleccione una categoría</option>
                      {categorias.map((categoria) => (
                        <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>


                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unidad *
                    </label>
                    <select
                      value={nuevoMaterial.unidadMedida}
                      onChange={(e) => setNuevoMaterial({...nuevoMaterial, unidadMedida: e.target.value})}
                      className="input-field"
                      required
                    >
                      <option value="unidad">Unidad</option>
                      <option value="metro">Metro</option>
                      <option value="kg">Kilogramo</option>
                      <option value="litro">Litro</option>
                      <option value="caja">Caja</option>
                      <option value="rollo">Rollo</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stock Inicial *
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={nuevoMaterial.stockActual}
                      onChange={(e) => setNuevoMaterial({...nuevoMaterial, stockActual: e.target.value})}
                      className="input-field"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stock Mínimo *
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={nuevoMaterial.stockMinimo}
                      onChange={(e) => setNuevoMaterial({...nuevoMaterial, stockMinimo: e.target.value})}
                      className="input-field"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Precio Unitario (S/) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={nuevoMaterial.precioUnitario}
                    onChange={(e) => setNuevoMaterial({...nuevoMaterial, precioUnitario: e.target.value})}
                    className="input-field"
                    required
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNuevoMaterialModal(false)
                      setNuevoMaterial({
                        codigo: '',
                        nombre: '',
                        categoriaId: null,
                        unidadMedida: 'unidad',
                        stockActual: 0,
                        stockMinimo: 5,
                        precioUnitario: 0,
                        proveedor: '',
                        ubicacion: ''
                      })
                      setCodigoPreview('')
                    }}
                    className="btn-secondary"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={
                      !nuevoMaterial.codigo?.trim() ||
                      !nuevoMaterial.nombre?.trim() ||
                      !nuevoMaterial.categoriaId ||
                      !nuevoMaterial.unidadMedida ||
                      isLoading
                    }
                  >
                    {isLoading ? 'Creando...' : '✓ Crear Material'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Actualizar Stock Modal */}
      {showActualizarStockModal && materialParaActualizar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-lg max-w-lg w-full">
            <div className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                  📊 Actualizar Stock
                </h3>
                <button
                  onClick={() => {
                    setShowActualizarStockModal(false)
                    setMaterialParaActualizar(null)
                    setActualizacionStock({
                      cantidad: 0,
                      tipo: 'entrada',
                      motivo: 'Compra'
                    })
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {/* Material Info */}
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h4 className="font-medium text-gray-900">{materialParaActualizar.nombre}</h4>
                <p className="text-sm text-gray-600">{materialParaActualizar.categoriaNombre}</p>
                <p className="text-sm text-gray-800 mt-2">
                  <span className="font-medium">Stock actual:</span> {materialParaActualizar.stockActual} {materialParaActualizar.unidadMedida}
                </p>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleActualizarStock(); }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Movimiento *
                  </label>
                  <select
                    value={actualizacionStock.tipo}
                    onChange={(e) => setActualizacionStock({...actualizacionStock, tipo: e.target.value})}
                    className="input-field"
                    required
                  >
                    <option value="entrada">Entrada (Agregar stock)</option>
                    <option value="salida">Salida (Reducir stock)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cantidad *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={actualizacionStock.cantidad}
                    onChange={(e) => setActualizacionStock({...actualizacionStock, cantidad: e.target.value})}
                    className="input-field"
                    placeholder="0"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Motivo *
                  </label>
                  <select
                    value={actualizacionStock.motivo}
                    onChange={(e) => setActualizacionStock({...actualizacionStock, motivo: e.target.value})}
                    className="input-field"
                    required
                  >
                    {actualizacionStock.tipo === 'entrada' ? (
                      <>
                        <option value="Compra">Compra</option>
                        <option value="Devolución">Devolución</option>
                        <option value="Donación">Donación</option>
                        <option value="Ajuste positivo">Ajuste positivo</option>
                      </>
                    ) : (
                      <>
                        <option value="Uso en servicio">Uso en servicio</option>
                        <option value="Material dañado">Material dañado</option>
                        <option value="Préstamo">Préstamo</option>
                        <option value="Ajuste negativo">Ajuste negativo</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Preview */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h5 className="font-medium text-blue-900 mb-2">Vista Previa:</h5>
                  <div className="text-sm text-blue-800">
                    <p>Stock actual: {parseFloat(materialParaActualizar.stockActual).toFixed(2)} {materialParaActualizar.unidadMedida}</p>
                    <p>
                      {actualizacionStock.tipo === 'entrada' ? 'Se agregará' : 'Se reducirá'}: {parseFloat(actualizacionStock.cantidad || 0).toFixed(2)} {materialParaActualizar.unidadMedida}
                    </p>
                    <p className="font-medium">
                      Nuevo stock: {
                        actualizacionStock.tipo === 'entrada'
                          ? (parseFloat(materialParaActualizar.stockActual) + parseFloat(actualizacionStock.cantidad || 0)).toFixed(2)
                          : (parseFloat(materialParaActualizar.stockActual) - parseFloat(actualizacionStock.cantidad || 0)).toFixed(2)
                      } {materialParaActualizar.unidadMedida}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowActualizarStockModal(false)
                      setMaterialParaActualizar(null)
                      setActualizacionStock({
                        cantidad: 0,
                        tipo: 'entrada',
                        motivo: 'Compra'
                      })
                    }}
                    className="btn-secondary"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className={`btn-primary ${
                      actualizacionStock.tipo === 'entrada' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                    }`}
                    disabled={!actualizacionStock.cantidad || actualizacionStock.cantidad <= 0}
                  >
                    {actualizacionStock.tipo === 'entrada' ? '📈 Agregar Stock' : '📉 Reducir Stock'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Gestión de Categorías Modal */}
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
                      placeholder="Ej: Cables Eléctricos"
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
                      placeholder="Ej: CAB"
                      maxLength="5"
                      className="w-full input-field uppercase"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      El prefijo se usará para generar códigos automáticos (ej: CAB-0001)
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
                    const materialesEnCategoria = materiales.filter(m => m.categoriaNombre === categoria.nombre).length
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
                                    placeholder="CAB"
                                    maxLength="5"
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
                                  {materialesEnCategoria} material{materialesEnCategoria !== 1 ? 'es' : ''}
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
                                  disabled={materialesEnCategoria > 0}
                                >
                                  🗑️ <span className="hidden sm:inline">Eliminar</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                        {materialesEnCategoria > 0 && categoriaEditando?.id !== categoria.id && (
                          <div className="mt-2 text-xs text-yellow-600">
                            ⚠️ Esta categoría tiene materiales asociados y no puede ser eliminada.
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
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

      {/* Material Detail Modal */}
      {showMaterialDetailModal && materialParaVer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div className="min-w-0 flex-1 mr-2">
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 truncate">
                    {materialParaVer.nombre}
                  </h3>
                  <p className="text-gray-600 text-sm">{materialParaVer.categoriaNombre}</p>
                </div>
                <button
                  onClick={() => {
                    setShowMaterialDetailModal(false)
                    setMaterialParaVer(null)
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
                {/* Material Image */}
                <div className="space-y-4">
                  <div className="relative rounded-lg overflow-hidden bg-gray-100">
                    {materialParaVer.imagen ? (
                      <img
                        src={materialParaVer.imagen}
                        alt={materialParaVer.nombre}
                        className="w-full h-48 sm:h-64 md:h-80 object-cover"
                        onError={(e) => {
                          e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNzUgMTIwVjE4MEgxNDBWMTIwSDE3NVpNMjI1IDEyMFYxODBIMTkwVjEyMEgyMjVaTTI3NSAxMjBWMTgwSDI0MFYxMjBIMjc1WiIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K'
                        }}
                      />
                    ) : (
                      <div className="w-full h-48 sm:h-64 md:h-80 flex items-center justify-center bg-gray-200">
                        <div className="text-center text-gray-500">
                          <span className="text-4xl sm:text-6xl block mb-2 sm:mb-4">📦</span>
                          <span className="text-sm sm:text-lg">Sin imagen disponible</span>
                        </div>
                      </div>
                    )}
                    <div className="absolute top-4 right-4">
                      <span className={`status-badge ${getStockStatus(materialParaVer).color} backdrop-blur-sm bg-opacity-90 text-lg px-4 py-2`}>
                        {getStockStatus(materialParaVer).text}
                      </span>
                    </div>
                  </div>

                  {/* Stock Progress */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">Estado del Stock</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Stock actual:</span>
                        <span className="font-semibold">{materialParaVer.stockActual} {materialParaVer.unidadMedida}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full transition-all duration-300 ${
                            materialParaVer.stockActual <= materialParaVer.stockMinimo
                              ? 'bg-red-500'
                              : 'bg-green-500'
                          }`}
                          style={{
                            width: `${Math.min((materialParaVer.stockActual / (materialParaVer.stockMinimo * 2)) * 100, 100)}%`
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>0</span>
                        <span>Stock mínimo: {materialParaVer.stockMinimo}</span>
                        <span>{materialParaVer.stockMinimo * 2}+</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Material Details */}
                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Información del Material</h4>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 py-3 border-b">
                        <dt className="text-sm font-medium text-gray-500">Código</dt>
                        <dd className="text-sm text-gray-900 col-span-2 font-mono bg-gray-100 px-2 py-1 rounded">
                          {materialParaVer.id}
                        </dd>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 py-3 border-b">
                        <dt className="text-sm font-medium text-gray-500">Categoría</dt>
                        <dd className="text-sm text-gray-900 col-span-2">
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                            {materialParaVer.categoriaNombre}
                          </span>
                        </dd>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 py-3 border-b">
                        <dt className="text-sm font-medium text-gray-500">Unidad</dt>
                        <dd className="text-sm text-gray-900 col-span-2 capitalize">
                          {materialParaVer.unidadMedida}
                        </dd>
                      </div>
                      {materialParaVer.proveedor && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 py-3 border-b">
                          <dt className="text-sm font-medium text-gray-500">Proveedor</dt>
                          <dd className="text-sm text-gray-900 col-span-2">
                            {materialParaVer.proveedor}
                          </dd>
                        </div>
                      )}
                      {materialParaVer.ubicacion && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 py-3 border-b">
                          <dt className="text-sm font-medium text-gray-500">Ubicación</dt>
                          <dd className="text-sm text-gray-900 col-span-2">
                            {materialParaVer.ubicacion}
                          </dd>
                        </div>
                      )}
                      {canViewPrices(user) && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 py-3 border-b">
                          <dt className="text-sm font-medium text-gray-500">Precio Unitario</dt>
                          <dd className="text-sm text-gray-900 col-span-2 font-semibold text-green-600">
                            S/ {materialParaVer.precioUnitario.toFixed(2)}
                          </dd>
                        </div>
                      )}
                      {canViewPrices(user) && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 py-3 border-b">
                          <dt className="text-sm font-medium text-gray-500">Valor Total Stock</dt>
                          <dd className="text-sm text-gray-900 col-span-2 font-semibold text-green-600">
                            S/ {(materialParaVer.stockActual * materialParaVer.precioUnitario).toFixed(2)}
                          </dd>
                        </div>
                      )}
                      {materialParaVer.fechaUltimaCompra && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 py-3 border-b">
                          <dt className="text-sm font-medium text-gray-500">Última Compra</dt>
                          <dd className="text-sm text-gray-900 col-span-2">
                            {new Date(materialParaVer.fechaUltimaCompra).toLocaleDateString('es-ES')}
                          </dd>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stock Details */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-3">Detalles de Inventario</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-blue-700">Stock actual</span>
                        <p className="font-bold text-blue-900 text-lg">
                          {materialParaVer.stockActual} {materialParaVer.unidadMedida}
                        </p>
                      </div>
                      <div>
                        <span className="text-blue-700">Stock mínimo</span>
                        <p className="font-bold text-blue-900 text-lg">
                          {materialParaVer.stockMinimo} {materialParaVer.unidadMedida}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:space-x-3 pt-4 sm:pt-8 border-t mt-4 sm:mt-8">
                <button
                  onClick={() => {
                    setShowMaterialDetailModal(false)
                    setMaterialParaVer(null)
                  }}
                  className="btn-secondary text-sm"
                >
                  Cerrar
                </button>
                {user?.role === 'admin' && (
                  <button
                    onClick={() => {
                      handleOpenActualizarStock(materialParaVer)
                      setShowMaterialDetailModal(false)
                      setMaterialParaVer(null)
                    }}
                    className="btn-primary bg-green-600 hover:bg-green-700 text-sm"
                  >
                    📊 Actualizar Stock
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Material Modal */}
      {showEditMaterialModal && materialParaEditar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                  ✏️ Editar Material
                </h3>
                <button
                  onClick={() => {
                    setShowEditMaterialModal(false)
                    setMaterialParaEditar(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {/* Material Code Display */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-blue-900 mb-1">
                      Código del Material
                    </h4>
                    <span className="text-lg font-mono font-bold text-blue-700 bg-white px-3 py-1 rounded border">
                      {materialParaEditar.id}
                    </span>
                  </div>
                  <div className="text-blue-600">
                    🏷️
                  </div>
                </div>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleUpdateMaterial(); }} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre del Material *
                    </label>
                    <input
                      type="text"
                      value={materialParaEditar.nombre}
                      onChange={(e) => setMaterialParaEditar({...materialParaEditar, nombre: e.target.value})}
                      className="input-field"
                      placeholder="Ej: Filtros HVAC"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Categoría *
                    </label>
                    <select
                      value={materialParaEditar.categoriaId}
                      onChange={(e) => setMaterialParaEditar({...materialParaEditar, categoriaId: e.target.value})}
                      className="input-field"
                      required
                    >
                      {categorias.map((categoria) => (
                        <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unidad *
                    </label>
                    <select
                      value={materialParaEditar.unidadMedida}
                      onChange={(e) => setMaterialParaEditar({...materialParaEditar, unidadMedida: e.target.value})}
                      className="input-field"
                      required
                    >
                      <option value="unidad">Unidad</option>
                      <option value="metro">Metro</option>
                      <option value="kg">Kilogramo</option>
                      <option value="litro">Litro</option>
                      <option value="caja">Caja</option>
                      <option value="rollo">Rollo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stock Mínimo *
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={materialParaEditar.stockMinimo}
                      onChange={(e) => setMaterialParaEditar({...materialParaEditar, stockMinimo: e.target.value})}
                      className="input-field"
                      required
                    />
                  </div>
                </div>

                {/* Stock Actual (Read-only) */}
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Stock Actual (Solo lectura)
                      </label>
                      <p className="text-lg font-semibold text-gray-900">
                        {materialParaEditar.stockActual} {materialParaEditar.unidadMedida}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        💡 Para modificar el stock, usa el botón "📊 Actualizar Stock"
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Precio Unitario (S/) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={materialParaEditar.precioUnitario}
                    onChange={(e) => setMaterialParaEditar({...materialParaEditar, precioUnitario: e.target.value})}
                    className="input-field"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Proveedor
                    </label>
                    <input
                      type="text"
                      value={materialParaEditar.proveedor || ''}
                      onChange={(e) => setMaterialParaEditar({...materialParaEditar, proveedor: e.target.value})}
                      className="input-field"
                      placeholder="Nombre del proveedor"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ubicación en Almacén
                    </label>
                    <input
                      type="text"
                      value={materialParaEditar.ubicacion || ''}
                      onChange={(e) => setMaterialParaEditar({...materialParaEditar, ubicacion: e.target.value})}
                      className="input-field"
                      placeholder="Ej: Estante A-3"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditMaterialModal(false)
                      setMaterialParaEditar(null)
                    }}
                    className="btn-secondary"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-primary bg-yellow-600 hover:bg-yellow-700"
                  >
                    ✏️ Actualizar Material
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default Materiales