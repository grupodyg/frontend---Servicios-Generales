import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api, API_ENDPOINTS } from '../config/api'

const useTecnicosStore = create(
  persist(
    (set, get) => ({
      tecnicos: [],
      isLoading: false,

      fetchTecnicos: async (filters = {}) => {
        set({ isLoading: true })
        try {
          const params = new URLSearchParams()
          // Filter for technicians and supervisors
          if (!filters.role) {
            params.append('role', 'tecnico,supervisor')
          }
          if (filters.status) params.append('status', filters.status)
          if (filters.specialty) params.append('specialty', filters.specialty)

          const url = `${API_ENDPOINTS.USERS}${params.toString() ? '?' + params.toString() : ''}`
          const usuarios = await api.get(url)

          const tecnicos = usuarios
            .filter(user => {
              const roleLower = (user.role || '').toLowerCase()
              return roleLower === 'tecnico' || roleLower === 'técnico' || roleLower === 'supervisor'
            })
            .map(user => ({
              id: user.id,
              nombre: `${user.name}${user.specialty ? ' - ' + user.specialty : ''}`,
              especialidad: user.specialty || ((user.role || '').toLowerCase() === 'supervisor' ? 'Supervisión' : ''),
              email: user.email,
              telefono: user.phone,
              dni: user.dni,
              activo: user.status === 'active',
              role: user.role
            }))

          set({ tecnicos, isLoading: false })
          return tecnicos
        } catch (error) {
          set({ isLoading: false })
          console.error('Error fetching tecnicos:', error)
          throw error
        }
      },

      getTecnicosActivos: () => {
        const { tecnicos } = get()
        return (tecnicos || []).filter(tecnico => tecnico.activo)
      },

      getTecnicosPorEspecialidad: (especialidad) => {
        const { tecnicos } = get()
        return tecnicos.filter(tecnico =>
          tecnico.activo && tecnico.especialidad === especialidad
        )
      },

      getNombresTecnicos: () => {
        const { tecnicos } = get()
        return tecnicos
          .filter(tecnico => tecnico.activo)
          .map(tecnico => tecnico.nombre)
      },

      getTecnicoById: (id) => {
        const { tecnicos } = get()
        return tecnicos.find(tecnico => tecnico.id === id)
      }
    }),
    {
      name: 'tecnicos-storage',
      partialize: (state) => ({ tecnicos: state.tecnicos })
    }
  )
)

export default useTecnicosStore