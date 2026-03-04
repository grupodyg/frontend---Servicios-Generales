import { create } from 'zustand'
import { api, API_ENDPOINTS } from '../config/api'

// Transformaciones Backend -> Frontend
const transformRateBackendToFrontend = (backendRate) => {
  if (!backendRate) return null
  return {
    id: backendRate.id,
    especialidad: backendRate.specialty,
    descripcion: backendRate.description,
    tarifaDiaria: parseFloat(backendRate.daily_rate) || 0,
    tarifaHora: backendRate.hourly_rate ? parseFloat(backendRate.hourly_rate) : null,
    estado: backendRate.status,
    fechaCreacion: backendRate.date_time_registration
  }
}

// Transformaciones Frontend -> Backend
const transformRateFrontendToBackend = (frontendRate) => {
  if (!frontendRate) return null
  return {
    specialty: frontendRate.especialidad,
    description: frontendRate.descripcion || null,
    daily_rate: frontendRate.tarifaDiaria,
    hourly_rate: frontendRate.tarifaHora || null,
    status: frontendRate.estado || 'active'
  }
}

// Crear el store
const useSpecialtyRatesStore = create((set, get) => ({
  // Estado
  tarifas: [],
  tarifaActual: null,
  loading: false,
  error: null,

  // Selectores
  getTarifaPorEspecialidad: (especialidad) => {
    const tarifas = get().tarifas
    if (!especialidad || !tarifas.length) return null
    return tarifas.find(t =>
      t.especialidad.toLowerCase() === especialidad.toLowerCase()
    )
  },

  getTarifasActivas: () => {
    return get().tarifas.filter(t => t.estado === 'active')
  },

  // Acciones
  fetchTarifas: async (status = 'active') => {
    set({ loading: true, error: null })
    try {
      const response = await api.get(`${API_ENDPOINTS.SPECIALTY_RATES}?status=${status}`)
      // api.get devuelve directamente el JSON parseado
      const data = Array.isArray(response) ? response : (response?.data || [])
      const tarifas = data.map(transformRateBackendToFrontend).filter(Boolean)
      set({ tarifas, loading: false })
      return tarifas
    } catch (error) {
      console.error('Error al obtener tarifas:', error)
      set({ error: error.message, loading: false, tarifas: [] })
      return []
    }
  },

  fetchTarifaPorNombre: async (especialidad) => {
    set({ loading: true, error: null })
    try {
      const response = await api.get(`${API_ENDPOINTS.SPECIALTY_RATES}/by-name/${encodeURIComponent(especialidad)}`)
      const tarifa = transformRateBackendToFrontend(response.data)
      set({ tarifaActual: tarifa, loading: false })
      return tarifa
    } catch (error) {
      if (error.response?.status === 404) {
        set({ tarifaActual: null, loading: false })
        return null
      }
      console.error('Error al obtener tarifa por nombre:', error)
      set({ error: error.message, loading: false })
      throw error
    }
  },

  createTarifa: async (tarifaData) => {
    set({ loading: true, error: null })
    try {
      const backendData = transformRateFrontendToBackend(tarifaData)
      const response = await api.post(API_ENDPOINTS.SPECIALTY_RATES, backendData)
      const nuevaTarifa = transformRateBackendToFrontend(response.data.data)
      set(state => ({
        tarifas: [...state.tarifas, nuevaTarifa],
        loading: false
      }))
      return nuevaTarifa
    } catch (error) {
      console.error('Error al crear tarifa:', error)
      set({ error: error.message, loading: false })
      throw error
    }
  },

  updateTarifa: async (id, tarifaData) => {
    set({ loading: true, error: null })
    try {
      const backendData = transformRateFrontendToBackend(tarifaData)
      const response = await api.put(`${API_ENDPOINTS.SPECIALTY_RATES}/${id}`, backendData)
      const tarifaActualizada = transformRateBackendToFrontend(response.data.data)
      set(state => ({
        tarifas: state.tarifas.map(t => t.id === id ? tarifaActualizada : t),
        loading: false
      }))
      return tarifaActualizada
    } catch (error) {
      console.error('Error al actualizar tarifa:', error)
      set({ error: error.message, loading: false })
      throw error
    }
  },

  deleteTarifa: async (id) => {
    set({ loading: true, error: null })
    try {
      await api.delete(`${API_ENDPOINTS.SPECIALTY_RATES}/${id}`)
      set(state => ({
        tarifas: state.tarifas.filter(t => t.id !== id),
        loading: false
      }))
      return true
    } catch (error) {
      console.error('Error al eliminar tarifa:', error)
      set({ error: error.message, loading: false })
      throw error
    }
  },

  // Limpiar estado
  clearError: () => set({ error: null }),
  clearTarifaActual: () => set({ tarifaActual: null })
}))

export default useSpecialtyRatesStore
