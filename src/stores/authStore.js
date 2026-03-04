import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api, API_ENDPOINTS } from '../config/api'

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      role: null,
      permissions: [],
      isAuthenticated: false,
      isLoading: false,
      _hasHydrated: false,
      allUsers: [],

      setHasHydrated: (state) => {
        set({ _hasHydrated: state })
      },

      login: async (credentials) => {
        set({ isLoading: true })

        try {
          const response = await api.post(API_ENDPOINTS.LOGIN, {
            email: credentials.email,
            password: credentials.password
          })

          const { user, token } = response

          const newState = {
            user,
            token,
            role: user.role,
            permissions: user.permissions || [],
            isAuthenticated: true,
            isLoading: false
          }

          set(newState)

          return { success: true, user }
        } catch (error) {
          set({ isLoading: false })
          console.error('Login error:', error)
          throw error
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          role: null,
          permissions: [],
          isAuthenticated: false,
          isLoading: false
        })
      },

      hasPermission: (permission) => {
        const { permissions } = get()

        // Si no hay permisos, denegar acceso
        if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
          return false
        }

        // Si el permiso solicitado es 'all', verificar si el usuario tiene ese permiso
        if (permission === 'all') {
          return permissions.some(p => p.name === 'all' || p.name === 'administrator.all')
        }

        // Verificar si el usuario tiene el permiso 'all' (acceso total)
        if (permissions.some(p => p.name === 'all' || p.name === 'administrator.all')) {
          return true
        }

        // Verificar si el usuario tiene el permiso específico
        // Los permisos en BD están en formato "modulo.permiso" (ej: "shared.dashboard")
        // Pero en el frontend se buscan por nombre simple (ej: "dashboard")
        // Por lo tanto, buscamos coincidencia exacta O coincidencia después del punto
        const hasIt = permissions.some(p => {
          // Coincidencia exacta
          if (p.name === permission) return true

          // Coincidencia con la parte después del punto (ej: "shared.dashboard" coincide con "dashboard")
          const parts = p.name.split('.')
          if (parts.length === 2 && parts[1] === permission) return true

          return false
        })

        return hasIt
      },

      updateProfile: (updates) => {
        const { user } = get()
        if (user) {
          set({ user: { ...user, ...updates } })
        }
      },

      getAllUsers: async () => {
        try {
          const users = await api.get(API_ENDPOINTS.USERS)
          set({ allUsers: users })
          return users.map(({ password, ...user }) => user)
        } catch (error) {
          console.error('Error fetching all users:', error)
          return get().allUsers
        }
      },

      getUsersForDropdown: async () => {
        const users = await get().getAllUsers()
        return users.map(user => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }))
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        role: state.role,
        permissions: state.permissions,
        isAuthenticated: state.isAuthenticated
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      }
    }
  )
)

export default useAuthStore