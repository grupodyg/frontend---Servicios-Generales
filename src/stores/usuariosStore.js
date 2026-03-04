import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api, API_ENDPOINTS } from '../config/api'

// Mapeo de role_id numérico a role string
const getRoleString = (roleId) => {
  const roleMap = {
    1: 'admin',
    2: 'supervisor',
    3: 'rrhh',
    4: 'tecnico'
  }
  return roleMap[roleId] || null
}

// Transformaciones para Usuarios
const transformBackendToFrontend = (backendUser) => {
  if (!backendUser) return null

  // Convertir role_id a role string
  const roleString = backendUser.role || getRoleString(backendUser.role_id)

  return {
    id: backendUser.id,
    name: backendUser.name,
    email: backendUser.email,
    password: backendUser.password,
    role: roleString,
    roleId: backendUser.role_id,
    permissions: backendUser.permissions || [],
    estado: backendUser.status, // 'active' o 'inactive'
    fechaCreacion: backendUser.date_time_registration,
    ultimaActividad: backendUser.last_activity,
    telefono: backendUser.phone,
    dni: backendUser.dni,
    direccion: backendUser.address,
    especialidad: backendUser.specialty,
    avatar: backendUser.avatar
  }
}

// Mapeo de roles string a role_id numérico
const getRoleId = (roleString) => {
  const roleMap = {
    'admin': 1,
    'supervisor': 2,
    'rrhh': 3,
    'tecnico': 4
  }
  return roleMap[roleString] || null
}

const transformFrontendToBackend = (frontendUser) => {
  if (!frontendUser) return null

  // Si viene roleId directamente, usarlo; si no, convertir desde role string
  const roleId = frontendUser.roleId || getRoleId(frontendUser.role)

  return {
    name: frontendUser.name,
    email: frontendUser.email,
    password: frontendUser.password || undefined,
    role_id: roleId,
    permissions: frontendUser.permissions || null,
    status: frontendUser.estado || 'active',
    last_activity: frontendUser.ultimaActividad || null,
    phone: frontendUser.telefono || null,
    dni: frontendUser.dni || null,
    address: frontendUser.direccion || null,
    specialty: frontendUser.especialidad || null,
    avatar: frontendUser.avatar || null
  }
}

const useUsuariosStore = create(
  persist(
    (set, get) => ({
      usuarios: [],
      isLoading: false,
      error: null,
      filtros: {
        busqueda: '',
        rol: 'todos',
        estado: 'todos'
      },

      fetchUsuarios: async (filters = {}) => {
        set({ isLoading: true, error: null })
        try {
          const params = new URLSearchParams()
          // Por defecto, obtener todos los usuarios (activos e inactivos)
          params.append('status', filters.status || 'all')
          if (filters.role) params.append('role', filters.role)
          if (filters.search) params.append('search', filters.search)
          if (filters.specialty) params.append('specialty', filters.specialty)

          const url = `${API_ENDPOINTS.USERS}?${params.toString()}`
          const backendUsuarios = await api.get(url)
          const usuarios = backendUsuarios.map(transformBackendToFrontend)

          set({ usuarios, isLoading: false })
          return usuarios
        } catch (error) {
          set({ error: error.message, isLoading: false })
          console.error('Error fetching usuarios:', error)
          throw error
        }
      },

      createUsuario: async (usuarioData) => {
        set({ isLoading: true, error: null })
        try {
          const backendData = transformFrontendToBackend(usuarioData)
          const response = await api.post(API_ENDPOINTS.USERS, backendData)
          const createdUsuario = transformBackendToFrontend(response.data)

          await get().fetchUsuarios()

          set({ isLoading: false })
          return createdUsuario
        } catch (error) {
          set({ error: error.message, isLoading: false })
          console.error('Error creating usuario:', error)
          throw error
        }
      },

      updateUsuario: async (id, updates) => {
        set({ isLoading: true, error: null })
        try {
          const backendUpdates = transformFrontendToBackend(updates)
          Object.keys(backendUpdates).forEach(key =>
            (backendUpdates[key] === undefined || backendUpdates[key] === null) && delete backendUpdates[key]
          )

          const response = await api.put(API_ENDPOINTS.USER_BY_ID(id), backendUpdates)
          const updatedUsuario = transformBackendToFrontend(response.data)

          await get().fetchUsuarios()

          set({ isLoading: false })
          return updatedUsuario
        } catch (error) {
          set({ error: error.message, isLoading: false })
          console.error('Error updating usuario:', error)
          throw error
        }
      },

      deleteUsuario: async (id) => {
        set({ isLoading: true, error: null })
        try {
          await api.delete(API_ENDPOINTS.USER_BY_ID(id))
          await get().fetchUsuarios()
          set({ isLoading: false })
        } catch (error) {
          set({ error: error.message, isLoading: false })
          console.error('Error deleting usuario:', error)
          throw error
        }
      },

      toggleUsuarioEstado: async (id) => {
        const { usuarios, updateUsuario } = get()
        const usuario = usuarios.find(u => u.id === id)
        if (usuario) {
          const nuevoEstado = usuario.estado === 'active' ? 'inactive' : 'active'
          return updateUsuario(id, { estado: nuevoEstado })
        }
      },

      setFiltros: (nuevosFiltros) => {
        set({ filtros: { ...get().filtros, ...nuevosFiltros } })
      },

      getUsuariosFiltrados: () => {
        const { usuarios, filtros } = get()
        return usuarios.filter(usuario => {
          const matchBusqueda = !filtros.busqueda ||
            usuario.name.toLowerCase().includes(filtros.busqueda.toLowerCase()) ||
            usuario.email.toLowerCase().includes(filtros.busqueda.toLowerCase()) ||
            (usuario.especialidad && usuario.especialidad.toLowerCase().includes(filtros.busqueda.toLowerCase()))

          const matchRol = filtros.rol === 'todos' || usuario.role === filtros.rol
          const matchEstado = filtros.estado === 'todos' || usuario.estado === filtros.estado

          return matchBusqueda && matchRol && matchEstado
        })
      },

      getEstadisticas: () => {
        const { usuarios } = get()
        return {
          total: usuarios.length,
          activos: usuarios.filter(u => u.estado === 'active').length,
          inactivos: usuarios.filter(u => u.estado === 'inactive').length,
          admins: usuarios.filter(u => u.role === 'admin').length,
          supervisores: usuarios.filter(u => u.role === 'supervisor').length,
          tecnicos: usuarios.filter(u => u.role === 'tecnico').length,
          rrhh: usuarios.filter(u => u.role === 'rrhh').length
        }
      },

      getUsuarioById: (id) => {
        const { usuarios } = get()
        return usuarios.find(usuario => usuario.id === id)
      },

      resetFiltros: () => {
        set({
          filtros: {
            busqueda: '',
            rol: 'todos',
            estado: 'todos'
          }
        })
      }
    }),
    {
      name: 'usuarios-storage',
      partialize: (state) => ({ usuarios: state.usuarios })
    }
  )
)

export default useUsuariosStore