import { create } from 'zustand'
import { API_ENDPOINTS, getAuthToken } from '../config/api'

const useBackupStore = create((set, get) => ({
  backups: [],
  loading: false,
  creating: false,
  error: null,

  fetchBackups: async () => {
    set({ loading: true, error: null })
    try {
      const token = getAuthToken()
      const response = await fetch(API_ENDPOINTS.BACKUPS, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || 'Error al obtener backups')
      }

      const data = await response.json()
      set({ backups: data, loading: false })
    } catch (error) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  createBackup: async () => {
    set({ creating: true, error: null })
    try {
      const token = getAuthToken()
      const response = await fetch(API_ENDPOINTS.BACKUPS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || 'Error al crear backup')
      }

      const data = await response.json()
      set({ creating: false })

      // Refrescar la lista
      await get().fetchBackups()
      return data
    } catch (error) {
      set({ creating: false, error: error.message })
      throw error
    }
  },

  downloadBackup: async (filename) => {
    try {
      const token = getAuthToken()
      const response = await fetch(API_ENDPOINTS.BACKUP_DOWNLOAD(filename), {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || 'Error al descargar backup')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      set({ error: error.message })
      throw error
    }
  },

  deleteBackup: async (filename) => {
    try {
      const token = getAuthToken()
      const response = await fetch(API_ENDPOINTS.BACKUP_DELETE(filename), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || 'Error al eliminar backup')
      }

      // Refrescar la lista
      await get().fetchBackups()
    } catch (error) {
      set({ error: error.message })
      throw error
    }
  }
}))

export default useBackupStore
