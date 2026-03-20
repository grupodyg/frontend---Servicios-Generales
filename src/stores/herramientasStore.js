import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api, API_ENDPOINTS } from '../config/api'
import { getCurrentTimestamp } from '../utils/dateUtils'

// Transformaciones para Categorías de Herramientas
const transformCategoryBackendToFrontend = (backendCategory) => {
  if (!backendCategory) return null
  return {
    id: backendCategory.id,
    nombre: backendCategory.name,
    prefijo: backendCategory.prefix,
    descripcion: backendCategory.description,
    estado: backendCategory.status
  }
}

const transformCategoryFrontendToBackend = (frontendCategory) => {
  if (!frontendCategory) return null
  return {
    name: frontendCategory.nombre,
    prefix: frontendCategory.prefijo,
    description: frontendCategory.descripcion || null,
    status: frontendCategory.estado || 'active'
  }
}

// Transformaciones para Herramientas
const transformToolBackendToFrontend = (backendTool) => {
  if (!backendTool) return null
  return {
    id: backendTool.id,
    codigo: backendTool.code,
    nombre: backendTool.name,
    marca: backendTool.brand,
    modelo: backendTool.model,
    descripcion: backendTool.description,
    cantidad: backendTool.quantity || 1,
    valor: parseFloat(backendTool.value) || 0,
    fechaAdmision: backendTool.admission_date,
    asignadoAUsuarioId: backendTool.assigned_to_user_id,
    fechaAsignacion: backendTool.assignment_date,
    categoriaId: backendTool.category_id,
    categoriaNombre: backendTool.category_name,
    categoriaPrefix: backendTool.category_prefix,
    imagen: backendTool.image_url || null,
    estado: backendTool.status,
    fechaCreacion: backendTool.date_time_registration
  }
}

const transformToolFrontendToBackend = (frontendTool) => {
  if (!frontendTool) return null
  return {
    code: frontendTool.codigo,
    name: frontendTool.nombre,
    brand: frontendTool.marca || null,
    model: frontendTool.modelo || null,
    description: frontendTool.descripcion || null,
    quantity: frontendTool.cantidad || 1,
    value: frontendTool.valor || null,
    admission_date: frontendTool.fechaAdmision || null,
    assigned_to_user_id: frontendTool.asignadoAUsuarioId || null,
    assignment_date: frontendTool.fechaAsignacion || null,
    category_id: frontendTool.categoriaId || null,
    status: frontendTool.estado || 'available'
  }
}

// Transformar items de herramientas del backend al frontend
const transformToolItemBackendToFrontend = (backendItem) => {
  if (!backendItem) return null
  return {
    id: backendItem.id,
    herramientaId: backendItem.tool_id,
    nombre: backendItem.tool_name,
    cantidad: backendItem.quantity || 1,
    fechaDevolucionPrevista: backendItem.expected_return_date,
    fechaDevolucionReal: backendItem.actual_return_date,
    fechaEntrega: backendItem.delivery_date,
    motivo: backendItem.reason,
    observaciones: backendItem.observations,
    estado: backendItem.status
  }
}

// Transformaciones para Solicitudes de Herramientas
const transformRequestBackendToFrontend = (backendRequest) => {
  if (!backendRequest) return null

  // Transformar items de herramientas
  const items = backendRequest.items || []
  const herramientasTransformadas = items.map(transformToolItemBackendToFrontend).filter(Boolean)

  return {
    id: backendRequest.id,
    ordenId: backendRequest.order_id,
    tecnicoId: backendRequest.technician_id,
    tecnicoNombre: backendRequest.technician_name,
    solicitante: backendRequest.technician_name, // Alias para el frontend
    fechaSolicitud: backendRequest.request_date,
    fechaDevolucion: backendRequest.return_date,
    observaciones: backendRequest.observations,
    observacionesGenerales: backendRequest.observations, // Alias para el frontend
    estado: mapStatusBackendToFrontend(backendRequest.status),
    aprobadoPor: backendRequest.approved_by,
    fechaAprobacion: backendRequest.approval_date,
    entregadoPor: backendRequest.delivered_by,
    fechaEntrega: backendRequest.delivery_date,
    devueltoPor: backendRequest.returned_by,
    fechaDevolucionReal: backendRequest.actual_return_date,
    herramientas: herramientasTransformadas,
    fechaCreacion: backendRequest.date_time_registration
  }
}

// Mapear estados del backend al frontend
const mapStatusBackendToFrontend = (status) => {
  const statusMap = {
    'pending': 'pendiente',
    'approved': 'aprobada',
    'rejected': 'rechazada',
    'delivered': 'entregada',
    'returned': 'devuelta',
    'cancelled': 'cancelada',
    'overdue': 'vencida'
  }
  return statusMap[status] || status
}

// Mapear estados del frontend al backend
const mapStatusFrontendToBackend = (status) => {
  const statusMap = {
    'pendiente': 'pending',
    'aprobada': 'approved',
    'rechazada': 'rejected',
    'entregada': 'delivered',
    'devuelta': 'returned',
    'cancelada': 'cancelled',
    'vencida': 'overdue'
  }
  return statusMap[status] || status
}

// Transformar items de herramientas del frontend al backend
const transformToolItemFrontendToBackend = (frontendItem) => {
  if (!frontendItem) return null
  return {
    tool_id: frontendItem.herramientaId || frontendItem.id || null,
    tool_name: frontendItem.nombre || null,
    quantity: frontendItem.cantidad || 1,
    expected_return_date: frontendItem.fechaDevolucionPrevista || null,
    reason: frontendItem.motivo || null,
    observations: frontendItem.observaciones || null
  }
}

const transformRequestFrontendToBackend = (frontendRequest) => {
  if (!frontendRequest) return null

  // Transformar herramientas si existen
  const herramientas = frontendRequest.herramientas || []
  const itemsTransformados = herramientas.map(transformToolItemFrontendToBackend).filter(Boolean)

  return {
    order_id: frontendRequest.ordenId || null,
    technician_id: frontendRequest.tecnicoId || null,
    technician_name: frontendRequest.tecnicoNombre || frontendRequest.solicitante || null,
    request_date: frontendRequest.fechaSolicitud || null,
    return_date: frontendRequest.fechaDevolucion || null,
    observations: frontendRequest.observaciones || frontendRequest.observacionesGenerales || null,
    status: mapStatusFrontendToBackend(frontendRequest.estado) || 'pending',
    approved_by: frontendRequest.aprobadoPor || null,
    approval_date: frontendRequest.fechaAprobacion || null,
    delivered_by: frontendRequest.entregadoPor || null,
    delivery_date: frontendRequest.fechaEntrega || null,
    returned_by: frontendRequest.devueltoPor || null,
    actual_return_date: frontendRequest.fechaDevolucionReal || null,
    herramientas: itemsTransformados
  }
}

const useHerramientasStore = create(
  persist(
    (set, get) => ({
      herramientas: [],
      categorias: [],
      solicitudes: [],
      isLoading: false,

      // CATEGORÍAS DE HERRAMIENTAS
      fetchCategorias: async (status = 'active') => {
        try {
          const url = `${API_ENDPOINTS.TOOL_CATEGORIES}?status=${status}`
          const backendCategorias = await api.get(url)
          const categorias = backendCategorias.map(transformCategoryBackendToFrontend)
          set({ categorias })
          return categorias
        } catch (error) {
          console.error('Error fetching categorías de herramientas:', error)
          throw error
        }
      },

      createCategoria: async (categoriaData) => {
        set({ isLoading: true })
        try {
          const backendData = transformCategoryFrontendToBackend(categoriaData)
          const response = await api.post(API_ENDPOINTS.TOOL_CATEGORIES, backendData)
          const createdCategoria = transformCategoryBackendToFrontend(response.data)
          await get().fetchCategorias()
          set({ isLoading: false })
          return createdCategoria
        } catch (error) {
          set({ isLoading: false })
          console.error('Error creating categoría:', error)
          throw error
        }
      },

      updateCategoria: async (id, updates) => {
        set({ isLoading: true })
        try {
          const backendUpdates = transformCategoryFrontendToBackend(updates)
          const response = await api.put(API_ENDPOINTS.TOOL_CATEGORY_BY_ID(id), backendUpdates)
          const updatedCategoria = transformCategoryBackendToFrontend(response.data)
          await get().fetchCategorias()
          set({ isLoading: false })
          return updatedCategoria
        } catch (error) {
          set({ isLoading: false })
          console.error('Error updating categoría:', error)
          throw error
        }
      },

      deleteCategoria: async (id) => {
        set({ isLoading: true })
        try {
          await api.delete(API_ENDPOINTS.TOOL_CATEGORY_BY_ID(id))
          await get().fetchCategorias()
          set({ isLoading: false })
        } catch (error) {
          set({ isLoading: false })
          console.error('Error deleting categoría:', error)
          throw error
        }
      },

      // HERRAMIENTAS
      fetchHerramientas: async (filters = {}) => {
        set({ isLoading: true })
        try {
          const params = new URLSearchParams()
          if (filters.status) params.append('status', filters.status)
          if (filters.assigned_to_user_id) params.append('assigned_to_user_id', filters.assigned_to_user_id)
          if (filters.search) params.append('search', filters.search)
          if (filters.category_id) params.append('category_id', filters.category_id)

          const url = `${API_ENDPOINTS.TOOLS}${params.toString() ? '?' + params.toString() : ''}`
          const backendHerramientas = await api.get(url)
          const herramientas = backendHerramientas.map(transformToolBackendToFrontend)

          set({ herramientas, isLoading: false })
          return herramientas
        } catch (error) {
          set({ isLoading: false })
          console.error('Error fetching herramientas:', error)
          throw error
        }
      },

      createHerramienta: async (herramientaData, imageFile = null) => {
        set({ isLoading: true })
        try {
          const backendData = transformToolFrontendToBackend(herramientaData)
          let response

          if (imageFile) {
            const formData = new FormData()
            Object.entries(backendData).forEach(([key, value]) => {
              if (value !== null && value !== undefined) formData.append(key, value)
            })
            formData.append('image', imageFile)
            response = await api.upload(API_ENDPOINTS.TOOLS, formData)
          } else {
            response = await api.post(API_ENDPOINTS.TOOLS, backendData)
          }

          const createdHerramienta = transformToolBackendToFrontend(response.data)
          await get().fetchHerramientas()
          set({ isLoading: false })
          return createdHerramienta
        } catch (error) {
          set({ isLoading: false })
          console.error('Error creating herramienta:', error)
          throw error
        }
      },

      updateHerramienta: async (id, updates, imageFile = null, removeImage = false) => {
        set({ isLoading: true })
        try {
          const backendUpdates = transformToolFrontendToBackend(updates)
          Object.keys(backendUpdates).forEach(key =>
            (backendUpdates[key] === undefined || backendUpdates[key] === null) && delete backendUpdates[key]
          )

          let response

          if (imageFile || removeImage) {
            const formData = new FormData()
            Object.entries(backendUpdates).forEach(([key, value]) => {
              if (value !== null && value !== undefined) formData.append(key, value)
            })
            if (imageFile) formData.append('image', imageFile)
            if (removeImage) formData.append('remove_image', 'true')
            response = await api.uploadPut(API_ENDPOINTS.TOOL_BY_ID(id), formData)
          } else {
            response = await api.put(API_ENDPOINTS.TOOL_BY_ID(id), backendUpdates)
          }

          const updatedHerramienta = transformToolBackendToFrontend(response.data)
          await get().fetchHerramientas()
          set({ isLoading: false })
          return updatedHerramienta
        } catch (error) {
          set({ isLoading: false })
          console.error('Error updating herramienta:', error)
          throw error
        }
      },

      deleteHerramienta: async (id) => {
        set({ isLoading: true })
        try {
          await api.delete(API_ENDPOINTS.TOOL_BY_ID(id))
          await get().fetchHerramientas()
          set({ isLoading: false })
        } catch (error) {
          set({ isLoading: false })
          console.error('Error deleting herramienta:', error)
          throw error
        }
      },

      // SOLICITUDES DE HERRAMIENTAS
      fetchSolicitudes: async (filters = {}) => {
        set({ isLoading: true })
        try {
          const params = new URLSearchParams()
          if (filters.status) params.append('status', filters.status)
          if (filters.order_id) params.append('order_id', filters.order_id)
          if (filters.technician_id) params.append('technician_id', filters.technician_id)

          const url = `${API_ENDPOINTS.TOOL_REQUESTS}${params.toString() ? '?' + params.toString() : ''}`
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
          // Preparar datos para el backend
          // El frontend envía: { solicitante, herramientas: [{ herramientaId, nombre, fechaDevolucionPrevista, motivo, observaciones }] }
          const backendData = {
            technician_name: solicitudData.solicitante || solicitudData.tecnicoNombre || null,
            technician_id: solicitudData.tecnicoId || null,
            order_id: solicitudData.ordenId || null,
            request_date: solicitudData.fechaSolicitud || getCurrentTimestamp(),
            observations: solicitudData.observaciones || solicitudData.observacionesGenerales || null,
            // Enviar herramientas directamente para que el backend las procese
            herramientas: (solicitudData.herramientas || []).map(h => ({
              tool_id: h.herramientaId || h.id || null,
              tool_name: h.nombre || null,
              quantity: h.cantidad || 1,
              expected_return_date: h.fechaDevolucionPrevista || null,
              reason: h.motivo || null,
              observations: h.observaciones || null
            }))
          }

          const response = await api.post(API_ENDPOINTS.TOOL_REQUESTS, backendData)
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

      updateSolicitud: async (id, updates) => {
        set({ isLoading: true })
        try {
          const backendUpdates = transformRequestFrontendToBackend(updates)
          Object.keys(backendUpdates).forEach(key =>
            (backendUpdates[key] === undefined || backendUpdates[key] === null) && delete backendUpdates[key]
          )

          const response = await api.put(API_ENDPOINTS.TOOL_REQUEST_BY_ID(id), backendUpdates)
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

      aprobarSolicitud: async (id, aprobadoPor) => {
        const updates = {
          estado: 'approved',
          aprobadoPor: aprobadoPor,
          fechaAprobacion: getCurrentTimestamp()
        }
        return await get().updateSolicitud(id, updates)
      },

      marcarEntregada: async (id, entregadoPor) => {
        const updates = {
          estado: 'delivered',
          entregadoPor: entregadoPor,
          fechaEntrega: getCurrentTimestamp()
        }
        return await get().updateSolicitud(id, updates)
      },

      marcarDevuelta: async (id, devueltoPor) => {
        const updates = {
          estado: 'returned',
          devueltoPor: devueltoPor,
          fechaDevolucionReal: getCurrentTimestamp()
        }
        return await get().updateSolicitud(id, updates)
      }
    }),
    {
      name: 'herramientas-storage',
      partialize: (state) => ({
        herramientas: state.herramientas,
        categorias: state.categorias,
        solicitudes: state.solicitudes
      })
    }
  )
)

export default useHerramientasStore
