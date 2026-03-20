import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api, API_ENDPOINTS } from '../config/api'
import { getCurrentTimestamp } from '../utils/dateUtils'

// Transformaciones para Materiales
const transformMaterialBackendToFrontend = (backendMaterial) => {
  if (!backendMaterial) return null
  return {
    id: backendMaterial.id,
    codigo: backendMaterial.code,
    nombre: backendMaterial.name,
    // Nota: campo 'description' no existe en la tabla materials de producción
    categoriaId: backendMaterial.category_id,
    categoriaNombre: backendMaterial.category_name,
    unidadMedida: backendMaterial.unit,
    stockActual: parseFloat(backendMaterial.current_stock) || 0,
    stockMinimo: parseFloat(backendMaterial.minimum_stock) || 0,
    precioUnitario: parseFloat(backendMaterial.unit_price) || 0,
    ubicacion: backendMaterial.warehouse_location,
    proveedor: backendMaterial.supplier,
    imagen: backendMaterial.image_url || null,
    estado: backendMaterial.status,
    fechaCreacion: backendMaterial.date_time_registration
  }
}

const transformMaterialFrontendToBackend = (frontendMaterial) => {
  if (!frontendMaterial) return null

  const result = {}

  // Solo incluir campos que están explícitamente definidos en el objeto de entrada
  // Esto evita enviar undefined/null que podrían sobrescribir valores existentes
  if ('codigo' in frontendMaterial) result.code = frontendMaterial.codigo
  if ('nombre' in frontendMaterial) result.name = frontendMaterial.nombre
  // Nota: campo 'description' no existe en la tabla materials de producción
  if ('categoriaId' in frontendMaterial) result.category_id = frontendMaterial.categoriaId
  if ('unidadMedida' in frontendMaterial) result.unit = frontendMaterial.unidadMedida
  if ('proveedor' in frontendMaterial) result.supplier = frontendMaterial.proveedor
  if ('ubicacion' in frontendMaterial) result.warehouse_location = frontendMaterial.ubicacion

  // Campos numéricos - solo incluir si están definidos y no son undefined
  if (frontendMaterial.stockActual !== undefined) {
    result.current_stock = frontendMaterial.stockActual
  }
  if (frontendMaterial.stockMinimo !== undefined) {
    result.minimum_stock = frontendMaterial.stockMinimo
  }
  if (frontendMaterial.precioUnitario !== undefined) {
    result.unit_price = frontendMaterial.precioUnitario
  }

  return result
}

// Transformaciones para Categorías
const transformCategoryBackendToFrontend = (backendCategory) => {
  if (!backendCategory) return null
  return {
    id: backendCategory.id,
    nombre: backendCategory.name,
    prefijo: backendCategory.prefix,
    descripcion: backendCategory.description,
    estado: backendCategory.status,
    fechaCreacion: backendCategory.date_time_registration
  }
}

// Transformaciones para Solicitudes
const transformRequestBackendToFrontend = (backendRequest) => {
  if (!backendRequest) return null
  return {
    id: backendRequest.id,
    ordenId: backendRequest.order_id,
    tecnicoId: backendRequest.technician_id,
    tecnicoNombre: backendRequest.technician_name,
    solicitante: backendRequest.technician_name, // Alias para compatibilidad
    fechaSolicitud: backendRequest.request_date,
    prioridad: backendRequest.priority,
    items: backendRequest.items || [],
    materiales: backendRequest.items || [], // Alias para compatibilidad
    estado: backendRequest.status,
    aprobadoPor: backendRequest.approved_by,
    fechaAprobacion: backendRequest.approval_date,
    motivoRechazo: backendRequest.rejection_reason,
    fechaEntrega: backendRequest.delivery_date,
    entregadoPor: backendRequest.delivered_by,
    observaciones: backendRequest.observations,
    fechaCreacion: backendRequest.date_time_registration
  }
}

// Helper para mapear prioridades español ↔ inglés
const mapPrioridadToBackend = (prioridad) => {
  const map = { 'alta': 'high', 'media': 'normal', 'baja': 'low' }
  return map[prioridad] || prioridad || 'normal'
}

const transformRequestFrontendToBackend = (frontendRequest) => {
  if (!frontendRequest) return null
  return {
    order_id: frontendRequest.ordenId || null,
    technician_id: frontendRequest.tecnicoId || null,
    // Mapear tanto "solicitante" como "tecnicoNombre" para flexibilidad
    technician_name: frontendRequest.solicitante || frontendRequest.tecnicoNombre || null,
    request_date: frontendRequest.fechaSolicitud || null,
    priority: mapPrioridadToBackend(frontendRequest.prioridad),
    // Mapear tanto "materiales" como "items" para flexibilidad
    items: frontendRequest.materiales || frontendRequest.items || null,
    status: frontendRequest.estado || 'pending',
    approved_by: frontendRequest.aprobadoPor || null,
    approval_date: frontendRequest.fechaAprobacion || null,
    rejection_reason: frontendRequest.motivoRechazo || null,
    delivery_date: frontendRequest.fechaEntrega || null,
    delivered_by: frontendRequest.entregadoPor || null,
    // Mapear tanto "observacionesGenerales" como "observaciones"
    observations: frontendRequest.observacionesGenerales || frontendRequest.observaciones || null
  }
}

const useMaterialesStore = create(
  persist(
    (set, get) => ({
      materiales: [],
      categorias: [],
      solicitudes: [],
      isLoading: false,

      // MATERIALES
      fetchMateriales: async (filters = {}) => {
        set({ isLoading: true })
        try {
          const params = new URLSearchParams()
          if (filters.status) params.append('status', filters.status)
          if (filters.category_id) params.append('category_id', filters.category_id)
          if (filters.search) params.append('search', filters.search)

          const url = `${API_ENDPOINTS.MATERIALS}${params.toString() ? '?' + params.toString() : ''}`
          const backendMateriales = await api.get(url)
          const materiales = backendMateriales.map(transformMaterialBackendToFrontend)

          set({ materiales, isLoading: false })
          return materiales
        } catch (error) {
          set({ isLoading: false })
          console.error('Error fetching materiales:', error)
          throw error
        }
      },

      createMaterial: async (materialData, imageFile = null) => {
        set({ isLoading: true })
        try {
          const backendData = transformMaterialFrontendToBackend(materialData)
          let response

          if (imageFile) {
            const formData = new FormData()
            Object.entries(backendData).forEach(([key, value]) => {
              if (value !== null && value !== undefined) formData.append(key, value)
            })
            formData.append('image', imageFile)
            response = await api.upload(API_ENDPOINTS.MATERIALS, formData)
          } else {
            response = await api.post(API_ENDPOINTS.MATERIALS, backendData)
          }

          const createdMaterial = transformMaterialBackendToFrontend(response.data)
          await get().fetchMateriales()
          set({ isLoading: false })
          return createdMaterial
        } catch (error) {
          set({ isLoading: false })
          console.error('Error creating material:', error)
          throw error
        }
      },

      updateMaterial: async (id, updates, imageFile = null, removeImage = false) => {
        set({ isLoading: true })
        try {
          const backendUpdates = transformMaterialFrontendToBackend(updates)
          Object.keys(backendUpdates).forEach(key =>
            backendUpdates[key] === undefined && delete backendUpdates[key]
          )

          let response

          if (imageFile || removeImage) {
            const formData = new FormData()
            Object.entries(backendUpdates).forEach(([key, value]) => {
              if (value !== null && value !== undefined) formData.append(key, value)
            })
            if (imageFile) formData.append('image', imageFile)
            if (removeImage) formData.append('remove_image', 'true')
            response = await api.uploadPut(API_ENDPOINTS.MATERIAL_BY_ID(id), formData)
          } else {
            response = await api.put(API_ENDPOINTS.MATERIAL_BY_ID(id), backendUpdates)
          }

          const updatedMaterial = transformMaterialBackendToFrontend(response.data)
          await get().fetchMateriales()
          set({ isLoading: false })
          return updatedMaterial
        } catch (error) {
          set({ isLoading: false })
          console.error('Error updating material:', error)
          throw error
        }
      },

      // Función específica para actualizar solo el stock (más segura)
      updateMaterialStock: async (id, nuevoStock) => {
        set({ isLoading: true })
        try {
          // Enviar SOLO el campo current_stock al backend
          const response = await api.put(API_ENDPOINTS.MATERIAL_BY_ID(id), {
            current_stock: nuevoStock
          })
          const updatedMaterial = transformMaterialBackendToFrontend(response.data)

          await get().fetchMateriales()

          set({ isLoading: false })
          return updatedMaterial
        } catch (error) {
          set({ isLoading: false })
          console.error('Error updating material stock:', error)
          throw error
        }
      },

      deleteMaterial: async (id) => {
        set({ isLoading: true })
        try {
          await api.delete(API_ENDPOINTS.MATERIAL_BY_ID(id))
          await get().fetchMateriales()
          set({ isLoading: false })
        } catch (error) {
          set({ isLoading: false })
          console.error('Error deleting material:', error)
          throw error
        }
      },

      // CATEGORÍAS
      fetchCategorias: async () => {
        set({ isLoading: true })
        try {
          const backendCategorias = await api.get(API_ENDPOINTS.MATERIAL_CATEGORIES)
          const categorias = backendCategorias.map(transformCategoryBackendToFrontend)
          set({ categorias, isLoading: false })
          return categorias
        } catch (error) {
          set({ isLoading: false })
          console.error('Error fetching categorías:', error)
          throw error
        }
      },

      createCategoria: async (nombre, prefijo) => {
        set({ isLoading: true })
        try {
          const response = await api.post(API_ENDPOINTS.MATERIAL_CATEGORIES, {
            name: nombre,
            prefix: prefijo
          })
          await get().fetchCategorias() // Recargar la lista
          set({ isLoading: false })
          const createdCategory = response.data ? transformCategoryBackendToFrontend(response.data) : null
          return createdCategory
        } catch (error) {
          set({ isLoading: false })
          console.error('Error creating categoría:', error)
          throw error
        }
      },

      updateCategoria: async (id, nombre, prefijo) => {
        set({ isLoading: true })
        try {
          const updates = { name: nombre }
          if (prefijo !== undefined) {
            updates.prefix = prefijo
          }
          const response = await api.put(API_ENDPOINTS.MATERIAL_CATEGORY_BY_ID(id), updates)
          await get().fetchCategorias() // Recargar la lista
          set({ isLoading: false })
          const updatedCategory = response.data ? transformCategoryBackendToFrontend(response.data) : null
          return updatedCategory
        } catch (error) {
          set({ isLoading: false })
          console.error('Error updating categoría:', error)
          throw error
        }
      },

      deleteCategoria: async (id) => {
        set({ isLoading: true })
        try {
          await api.delete(API_ENDPOINTS.MATERIAL_CATEGORY_BY_ID(id))
          await get().fetchCategorias() // Recargar la lista
          set({ isLoading: false })
        } catch (error) {
          set({ isLoading: false })
          console.error('Error deleting categoría:', error)
          throw error
        }
      },

      // SOLICITUDES
      fetchSolicitudes: async (filters = {}) => {
        set({ isLoading: true })
        try {
          const params = new URLSearchParams()
          if (filters.status) params.append('status', filters.status)
          if (filters.order_id) params.append('order_id', filters.order_id)
          if (filters.technician) params.append('technician', filters.technician)
          if (filters.fechaDesde) params.append('fecha_desde', filters.fechaDesde)
          if (filters.fechaHasta) params.append('fecha_hasta', filters.fechaHasta)
          if (filters.search) params.append('search', filters.search)

          const url = `${API_ENDPOINTS.MATERIAL_REQUESTS}${params.toString() ? '?' + params.toString() : ''}`
          const backendSolicitudes = await api.get(url)
          const solicitudes = backendSolicitudes.map(transformRequestBackendToFrontend)

          set({ solicitudes, isLoading: false })
          return solicitudes
        } catch (error) {
          set({ isLoading: false })
          console.error('Error fetching solicitudes:', error)
          throw error
        }
      },

      createSolicitud: async (solicitudData) => {
        set({ isLoading: true })
        try {
          const backendData = transformRequestFrontendToBackend(solicitudData)
          const response = await api.post(API_ENDPOINTS.MATERIAL_REQUESTS, backendData)
          const createdSolicitud = transformRequestBackendToFrontend(response.data)

          await get().fetchSolicitudes()

          set({ isLoading: false })
          return createdSolicitud
        } catch (error) {
          set({ isLoading: false })
          console.error('Error creating solicitud:', error)
          throw error
        }
      },

      aprobarSolicitud: async (id, aprobadoPor) => {
        const updates = {
          estado: 'approved',
          aprobadoPor: aprobadoPor,
          fechaAprobacion: getCurrentTimestamp()
        }
        return await get().updateSolicitud(id, updates)
      },

      rechazarSolicitud: async (id, motivoRechazo) => {
        const updates = {
          estado: 'rejected',
          motivoRechazo: motivoRechazo
        }
        return await get().updateSolicitud(id, updates)
      },

      marcarEntregada: async (id, entregadoPor) => {
        const updates = {
          estado: 'entregada',
          entregadoPor: entregadoPor,
          fechaEntrega: getCurrentTimestamp()
        }
        return await get().updateSolicitud(id, updates)
      },

      updateSolicitud: async (id, updates) => {
        set({ isLoading: true })
        try {
          const backendUpdates = transformRequestFrontendToBackend(updates)
          Object.keys(backendUpdates).forEach(key =>
            (backendUpdates[key] === undefined || backendUpdates[key] === null) && delete backendUpdates[key]
          )

          const response = await api.put(API_ENDPOINTS.MATERIAL_REQUEST_BY_ID(id), backendUpdates)
          const updatedSolicitud = transformRequestBackendToFrontend(response.data)

          await get().fetchSolicitudes()

          set({ isLoading: false })
          return updatedSolicitud
        } catch (error) {
          set({ isLoading: false })
          console.error('Error updating solicitud:', error)
          throw error
        }
      },

      // ESTADÍSTICAS Y HELPERS
      // NOTA: Los materiales usan 'available'/'unavailable' como estados (no 'active'/'inactive')
      getEstadisticasMateriales: () => {
        const { materiales, solicitudes } = get()
        // Solo contar materiales disponibles para estadísticas relevantes
        const materialesDisponibles = materiales.filter(m => m.estado === 'available')
        const totalMateriales = materiales.length
        // Stock bajo: mayor a 0 pero menor o igual al mínimo (excluye sin stock)
        const materialesBajoStock = materialesDisponibles.filter(m => m.stockActual > 0 && m.stockActual <= m.stockMinimo).length
        // Sin stock: stock actual es 0
        const materialesSinStock = materialesDisponibles.filter(m => m.stockActual === 0).length
        const materialesNoDisponibles = materiales.filter(m => m.estado === 'unavailable').length
        const solicitudesPendientes = solicitudes.filter(s => s.estado === 'pending' || s.estado === 'pendiente').length
        // Solo calcular valor de materiales disponibles
        const valorTotalInventario = materialesDisponibles.reduce((total, m) =>
          total + (m.stockActual * m.precioUnitario), 0
        )

        return {
          totalMateriales,
          totalMaterialesActivos: materialesDisponibles.length,
          materialesBajoStock,
          materialesSinStock,
          materialesInactivos: materialesNoDisponibles,
          solicitudesPendientes,
          valorInventario: valorTotalInventario.toFixed(2),
          valorTotalInventario: valorTotalInventario.toFixed(2)
        }
      },

      getMaterialesBajoStock: () => {
        const { materiales } = get()
        return materiales
          .filter(m => m.stockActual <= m.stockMinimo && m.estado === 'available')
          .sort((a, b) => {
            // Ordenar por prioridad: más críticos primero (menor stock relativo)
            const porcentajeA = a.stockMinimo > 0 ? (a.stockActual / a.stockMinimo) : 1
            const porcentajeB = b.stockMinimo > 0 ? (b.stockActual / b.stockMinimo) : 1
            return porcentajeA - porcentajeB
          })
      },

      // Validar si puede solicitar materiales
      puedesolicitarMateriales: (orden) => {
        if (!orden) {
          return { permitido: false, motivo: 'Orden no válida' }
        }

        // Las órdenes sin visita técnica pueden solicitar materiales directamente
        if (orden.tipoVisita === 'sin_visita') {
          // Verificar que la orden no esté completada
          if (orden.estado === 'completed') {
            return {
              permitido: false,
              motivo: 'La orden ya está completada'
            }
          }
          return { permitido: true, motivo: '' }
        }

        // Las órdenes con visita técnica deben completar la primera visita
        if (orden.tipoVisita === 'con_visita') {
          if (!orden.primeraVisitaCompletada) {
            return {
              permitido: false,
              motivo: 'Debe completar la primera visita técnica antes de solicitar materiales'
            }
          }

          // Verificar que la orden no esté completada
          if (orden.estado === 'completed') {
            return {
              permitido: false,
              motivo: 'La orden ya está completada'
            }
          }

          return { permitido: true, motivo: '' }
        }

        return { permitido: false, motivo: 'Tipo de visita no válido' }
      }
    }),
    {
      name: 'materiales-storage',
      partialize: (state) => ({
        materiales: state.materiales,
        categorias: state.categorias,
        solicitudes: state.solicitudes
      })
    }
  )
)

export default useMaterialesStore
