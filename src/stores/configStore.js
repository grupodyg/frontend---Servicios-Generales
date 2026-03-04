import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api, API_ENDPOINTS } from '../config/api'

// 🔄 FUNCIONES DE TRANSFORMACIÓN DE DATOS (Backend ↔ Frontend)

// Transformar Tipo de Servicio: Backend → Frontend
const transformServiceTypeToFrontend = (backend) => {
  if (!backend) return null
  return {
    id: backend.id,
    nombre: backend.name,
    descripcion: backend.description,
    icono: backend.icon,
    color: backend.color,
    orden: backend.display_order,
    activo: backend.status === 'active',
    fechaCreacion: backend.date_time_registration,
    fechaModificacion: backend.date_time_modification
  }
}

// Transformar Tipo de Servicio: Frontend → Backend
const transformServiceTypeToBackend = (frontend) => {
  if (!frontend) return null
  const data = {}
  if (frontend.nombre !== undefined) data.name = frontend.nombre
  if (frontend.descripcion !== undefined) data.description = frontend.descripcion
  if (frontend.icono !== undefined) data.icon = frontend.icono
  if (frontend.color !== undefined) data.color = frontend.color
  if (frontend.orden !== undefined) data.display_order = frontend.orden
  if (frontend.activo !== undefined) data.status = frontend.activo ? 'active' : 'inactive'
  return data
}

// Transformar Condición de Pago: Backend → Frontend
const transformPaymentConditionToFrontend = (backend) => {
  if (!backend) return null
  return {
    id: backend.id,
    nombre: backend.name,
    descripcion: backend.description,
    orden: backend.display_order,
    activo: backend.status === 'active',
    fechaCreacion: backend.date_time_registration,
    fechaModificacion: backend.date_time_modification
  }
}

// Transformar Condición de Pago: Frontend → Backend
const transformPaymentConditionToBackend = (frontend) => {
  if (!frontend) return null
  const data = {}
  if (frontend.nombre !== undefined) data.name = frontend.nombre
  if (frontend.descripcion !== undefined) data.description = frontend.descripcion
  if (frontend.orden !== undefined) data.display_order = frontend.orden
  if (frontend.activo !== undefined) data.status = frontend.activo ? 'active' : 'inactive'
  return data
}

const useConfigStore = create(
  persist(
    (set, get) => ({
      tiposServicio: [],
      condicionesPago: [],
      isLoading: false,

      fetchTiposServicio: async () => {
        set({ isLoading: true })
        try {
          const params = new URLSearchParams({ status: 'all' })
          const url = `${API_ENDPOINTS.SERVICE_TYPES}?${params.toString()}`
          const backendTipos = await api.get(url)
          const tiposServicio = backendTipos.map(transformServiceTypeToFrontend)
          set({ tiposServicio, isLoading: false })
          return tiposServicio
        } catch (error) {
          set({ isLoading: false })
          console.error('Error fetching tipos de servicio:', error)
          throw error
        }
      },

      fetchCondicionesPago: async () => {
        set({ isLoading: true })
        try {
          const params = new URLSearchParams({ status: 'all' })
          const url = `${API_ENDPOINTS.PAYMENT_CONDITIONS}?${params.toString()}`
          const backendCondiciones = await api.get(url)
          const condicionesPago = backendCondiciones.map(transformPaymentConditionToFrontend)
          set({ condicionesPago, isLoading: false })
          return condicionesPago
        } catch (error) {
          set({ isLoading: false })
          console.error('Error fetching condiciones de pago:', error)
          throw error
        }
      },

      // Obtener tipos de servicio activos ordenados
      getTiposServicioActivos: () => {
        const { tiposServicio } = get()
        return tiposServicio
          .filter(tipo => tipo.activo)
          .sort((a, b) => (a.orden || 0) - (b.orden || 0))
      },

      // Obtener condiciones de pago activas ordenadas
      getCondicionesPagoActivas: () => {
        const { condicionesPago } = get()
        return condicionesPago
          .filter(condicion => condicion.activo)
          .sort((a, b) => (a.orden || 0) - (b.orden || 0))
      },

      createTipoServicio: async (tipoData) => {
        set({ isLoading: true })
        try {
          const backendData = transformServiceTypeToBackend(tipoData)
          const response = await api.post(API_ENDPOINTS.SERVICE_TYPES, backendData)
          await get().fetchTiposServicio()
          set({ isLoading: false })
          return transformServiceTypeToFrontend(response.data)
        } catch (error) {
          set({ isLoading: false })
          console.error('Error creating tipo de servicio:', error)
          throw error
        }
      },

      updateTipoServicio: async (id, updates) => {
        set({ isLoading: true })
        try {
          const backendUpdates = transformServiceTypeToBackend(updates)
          const response = await api.put(API_ENDPOINTS.SERVICE_TYPE_BY_ID(id), backendUpdates)
          await get().fetchTiposServicio()
          set({ isLoading: false })
          return transformServiceTypeToFrontend(response.data)
        } catch (error) {
          set({ isLoading: false })
          console.error('Error updating tipo de servicio:', error)
          throw error
        }
      },

      deleteTipoServicio: async (id) => {
        set({ isLoading: true })
        try {
          await api.delete(API_ENDPOINTS.SERVICE_TYPE_BY_ID(id))
          await get().fetchTiposServicio()
          set({ isLoading: false })
        } catch (error) {
          set({ isLoading: false })
          console.error('Error deleting tipo de servicio:', error)
          throw error
        }
      },

      reorderTiposServicio: async (tiposReordenados) => {
        set({ isLoading: true })
        try {
          const tiposConNuevoOrden = tiposReordenados.map((tipo, index) => ({
            ...tipo,
            orden: index + 1
          }))

          await Promise.all(
            tiposConNuevoOrden.map(tipo =>
              api.put(API_ENDPOINTS.SERVICE_TYPE_BY_ID(tipo.id), { display_order: tipo.orden })
            )
          )

          await get().fetchTiposServicio()
          set({ isLoading: false })
        } catch (error) {
          set({ isLoading: false })
          console.error('Error reordering tipos de servicio:', error)
          throw error
        }
      },

      // Activar/Desactivar tipo de servicio
      toggleTipoServicio: async (id) => {
        const { tiposServicio } = get()
        const tipo = tiposServicio.find(t => t.id === id)
        if (tipo) {
          await get().updateTipoServicio(id, { activo: !tipo.activo })
        }
      },

      createCondicionPago: async (condicionData) => {
        set({ isLoading: true })
        try {
          const backendData = transformPaymentConditionToBackend(condicionData)
          const response = await api.post(API_ENDPOINTS.PAYMENT_CONDITIONS, backendData)
          await get().fetchCondicionesPago()
          set({ isLoading: false })
          return transformPaymentConditionToFrontend(response.data)
        } catch (error) {
          set({ isLoading: false })
          console.error('Error creating condición de pago:', error)
          throw error
        }
      },

      updateCondicionPago: async (id, updates) => {
        set({ isLoading: true })
        try {
          const backendUpdates = transformPaymentConditionToBackend(updates)
          const response = await api.put(API_ENDPOINTS.PAYMENT_CONDITION_BY_ID(id), backendUpdates)
          await get().fetchCondicionesPago()
          set({ isLoading: false })
          return transformPaymentConditionToFrontend(response.data)
        } catch (error) {
          set({ isLoading: false })
          console.error('Error updating condición de pago:', error)
          throw error
        }
      },

      deleteCondicionPago: async (id) => {
        set({ isLoading: true })
        try {
          await api.delete(API_ENDPOINTS.PAYMENT_CONDITION_BY_ID(id))
          await get().fetchCondicionesPago()
          set({ isLoading: false })
        } catch (error) {
          set({ isLoading: false })
          console.error('Error deleting condición de pago:', error)
          throw error
        }
      },

      reorderCondicionesPago: async (condicionesReordenadas) => {
        set({ isLoading: true })
        try {
          const condicionesConNuevoOrden = condicionesReordenadas.map((condicion, index) => ({
            ...condicion,
            orden: index + 1
          }))

          await Promise.all(
            condicionesConNuevoOrden.map(condicion =>
              api.put(API_ENDPOINTS.PAYMENT_CONDITION_BY_ID(condicion.id), { display_order: condicion.orden })
            )
          )

          await get().fetchCondicionesPago()
          set({ isLoading: false })
        } catch (error) {
          set({ isLoading: false })
          console.error('Error reordering condiciones de pago:', error)
          throw error
        }
      },

      // Activar/Desactivar condición de pago
      toggleCondicionPago: async (id) => {
        const { condicionesPago } = get()
        const condicion = condicionesPago.find(c => c.id === id)
        if (condicion) {
          await get().updateCondicionPago(id, { activo: !condicion.activo })
        }
      }
    }),
    {
      name: 'config-storage',
      partialize: (state) => ({
        tiposServicio: state.tiposServicio,
        condicionesPago: state.condicionesPago
      })
    }
  )
)

export default useConfigStore